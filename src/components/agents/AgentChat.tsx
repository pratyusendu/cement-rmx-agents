'use client';

import { useState, useRef, useEffect } from 'react';
import { Agent, PlantData } from '@/types/agents';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentChatProps {
  agent: Agent;
  plantData?: PlantData;
  onClose: () => void;
}

const QUICK_PROMPTS: Record<string, string[]> = {
  procurement: [
    'What is the current supply risk assessment?',
    'Should I lock in raw material prices now?',
    'Which suppliers need immediate attention?',
  ],
  mining: [
    'What is the current ore quality at active quarry face?',
    'Recommend blast pattern for today',
    'How is equipment OEE trending?',
  ],
  manufacturing: [
    'Analyze current kiln performance',
    'What is the heat consumption trend?',
    'Alert me on any quality deviations',
  ],
  inventory: [
    'What is current silo stock by grade?',
    'Dispatch capacity for next 24 hours?',
    'Any stock items below reorder point?',
  ],
  rmx: [
    'How many batches completed today?',
    'Any mix designs needing revision?',
    'Current truck dispatch status?',
  ],
  sales: [
    'Top 5 customers at churn risk?',
    'Recommend pricing for M30 concrete',
    'Current credit exposure summary',
  ],
  delivery: [
    'Which trucks are approaching workability limit?',
    'Route efficiency report today',
    'Any drivers with safety alerts?',
  ],
  finance: [
    'Month-to-date revenue vs budget?',
    'Top cost variance items this week',
    'ESG compliance status overview',
  ],
};

export default function AgentChat({ agent, plantData, onClose }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `**${agent.name} online.**\n\nI'm monitoring ${agent.capabilities.join(', ')}. What do you need?\n\n*Use the quick prompts below or ask me anything about ${agent.phase} operations.*`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingContent('');

    try {
      const res = await fetch(`/api/agents/${agent.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
          })),
          plantData,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamingContent(accumulated);
              }
            } catch {
              // skip
            }
          }
        }
      }

      // Finalize streaming message
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: accumulated || 'I encountered an error processing your request.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `⚠️ Connection error. Please check your API key configuration in \`.env.local\`.\n\nEnsure \`GROQ_API_KEY\` is set. Get a free key at [console.groq.com](https://console.groq.com).`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const quickPrompts = QUICK_PROMPTS[agent.phase] || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6 pointer-events-none">
      <div
        className="w-full max-w-lg h-[80vh] rounded-xl border shadow-2xl flex flex-col pointer-events-auto animate-slide-up overflow-hidden"
        style={{
          backgroundColor: '#080f1f',
          borderColor: `${agent.color}50`,
          boxShadow: `0 0 40px ${agent.color}20, 0 20px 60px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: `${agent.color}30`, backgroundColor: `${agent.color}10` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-xl border"
              style={{ borderColor: `${agent.color}40`, backgroundColor: `${agent.color}15` }}
            >
              {agent.icon}
            </div>
            <div>
              <div className="font-display font-bold text-white tracking-wide text-sm">
                {agent.name}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 status-pulse" />
                <span className="text-[10px] font-mono text-green-400">ONLINE</span>
                <span className="text-[10px] text-gray-500 font-mono">· {agent.phase}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-lg"
          >
            ×
          </button>
        </div>

        {/* Metrics strip */}
        <div className="flex gap-2 px-4 py-2 border-b border-gray-800/50 overflow-x-auto">
          {agent.metrics.map(m => (
            <div
              key={m.label}
              className="flex-shrink-0 text-center rounded px-2 py-1"
              style={{ backgroundColor: `${agent.color}10` }}
            >
              <div className="text-[9px] text-gray-500 font-mono">{m.label}</div>
              <div className="text-xs font-bold font-mono" style={{ color: agent.color }}>
                {m.value}{m.unit ? ` ${m.unit}` : ''}
              </div>
            </div>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'message-user text-white rounded-tr-sm'
                    : 'message-agent text-gray-200 rounded-tl-sm'
                }`}
                style={
                  msg.role === 'user'
                    ? { backgroundColor: agent.color }
                    : { backgroundColor: '#1a2540', border: `1px solid ${agent.color}20` }
                }
              >
                <div className="whitespace-pre-wrap">
                  {msg.content.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                    part.startsWith('**') && part.endsWith('**')
                      ? <strong key={i} style={{ color: msg.role === 'user' ? 'inherit' : agent.color }}>{part.slice(2, -2)}</strong>
                      : part
                  )}
                </div>
                <div className={`text-[9px] mt-1 font-mono ${msg.role === 'user' ? 'text-white/60 text-right' : 'text-gray-600'}`}>
                  {msg.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Streaming message */}
          {isStreaming && (
            <div className="flex justify-start">
              <div
                className="max-w-[85%] rounded-xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed text-gray-200"
                style={{ backgroundColor: '#1a2540', border: `1px solid ${agent.color}20` }}
              >
                {streamingContent ? (
                  <span className="whitespace-pre-wrap">{streamingContent}</span>
                ) : (
                  <div className="flex gap-1 py-1">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full status-pulse"
                        style={{ backgroundColor: agent.color, animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {quickPrompts.map(prompt => (
              <button
                key={prompt}
                onClick={() => sendMessage(prompt)}
                className="text-[10px] font-mono px-2 py-1 rounded border transition-all hover:text-white"
                style={{
                  borderColor: `${agent.color}30`,
                  color: agent.color,
                  backgroundColor: `${agent.color}08`,
                }}
                onMouseEnter={e => {
                  (e.target as HTMLElement).style.backgroundColor = `${agent.color}20`;
                }}
                onMouseLeave={e => {
                  (e.target as HTMLElement).style.backgroundColor = `${agent.color}08`;
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t" style={{ borderColor: `${agent.color}20` }}>
          <div
            className="flex gap-2 rounded-xl border p-2"
            style={{ borderColor: `${agent.color}30`, backgroundColor: '#0d1a2d' }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${agent.shortName}...`}
              rows={1}
              disabled={isStreaming}
              className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 resize-none outline-none font-mono"
              style={{ minHeight: '24px', maxHeight: '80px' }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              style={{ backgroundColor: agent.color }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
          <div className="text-[9px] text-gray-700 font-mono mt-1 text-center">
            Powered by Groq LLaMA 3.1 70B · Enter to send · Shift+Enter for newline
          </div>
        </div>
      </div>
    </div>
  );
}
