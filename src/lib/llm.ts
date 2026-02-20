// ============================================================
// LLM Client — Groq (primary, free) + OpenAI (fallback)
// ============================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  tokens?: number;
}

// Groq client using native fetch (no SDK dependency issues on edge)
async function callGroq(messages: LLMMessage[], model: string): Promise<LLMResponse> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'llama-3.1-70b-versatile',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Groq API error: ${res.status} ${error}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    provider: 'groq',
    model: model,
    tokens: data.usage?.total_tokens,
  };
}

// OpenAI fallback
async function callOpenAI(messages: LLMMessage[], model: string): Promise<LLMResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${error}`);
  }

  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    provider: 'openai',
    model: model,
    tokens: data.usage?.total_tokens,
  };
}

// Main LLM call function with fallback
export async function callLLM(
  messages: LLMMessage[],
  options: { provider?: string; model?: string } = {}
): Promise<LLMResponse> {
  const provider = options.provider || process.env.LLM_PROVIDER || 'groq';

  if (provider === 'groq') {
    const model = options.model || process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';
    try {
      return await callGroq(messages, model);
    } catch (err) {
      console.warn('Groq failed, trying OpenAI fallback:', err);
      const oaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      return await callOpenAI(messages, oaiModel);
    }
  } else {
    const model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    return await callOpenAI(messages, model);
  }
}

// Streaming version for Groq
export async function* streamLLM(
  messages: LLMMessage[],
  options: { provider?: string; model?: string } = {}
): AsyncGenerator<string> {
  const provider = options.provider || process.env.LLM_PROVIDER || 'groq';
  const apiKey = provider === 'groq' ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY;
  const baseUrl = provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1';
  const model = provider === 'groq'
    ? (options.model || process.env.GROQ_MODEL || 'llama-3.1-70b-versatile')
    : (options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini');

  if (!apiKey) throw new Error(`${provider.toUpperCase()}_API_KEY not set`);

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`LLM stream error: ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

    for (const line of lines) {
      const data = line.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // Skip malformed chunks
      }
    }
  }
}
