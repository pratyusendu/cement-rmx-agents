// ============================================================
// API Route: /api/agents/[agentId] — Individual Agent Chat
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getAgent } from '@/lib/agents-registry';
import { streamLLM } from '@/lib/llm';
import { getSimulatedPlantData, buildPlantContext } from '@/lib/plant-simulator';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { messages, plantData } = await req.json();
    const { agentId } = params;

    const agent = getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: `Agent '${agentId}' not found` }, { status: 404 });
    }

    // Get real-time plant data (use provided or simulate)
    const currentPlantData = plantData || getSimulatedPlantData();
    const plantContext = buildPlantContext(currentPlantData);

    // Build system prompt with live plant context
    const systemPrompt = `${agent.systemPrompt}

${plantContext}

INSTRUCTIONS:
- You are ${agent.name} (${agent.shortName}), an AI agent in a cement & RMX supply chain management system
- Respond in a professional, data-driven manner appropriate for operations managers
- Be specific and actionable — give exact numbers, not vague advice
- Use the live plant data above to contextualize your recommendations
- Keep responses concise (150-300 words) but information-dense
- If asked something outside your domain, briefly note it and redirect to the relevant agent
- Format key metrics with bold emphasis or code blocks when helpful`;

    // Build messages with system prompt
    const llmMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamLLM(llmMessages)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('Agent API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const agent = getAgent(params.agentId);
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  return NextResponse.json({
    id: agent.id,
    name: agent.name,
    phase: agent.phase,
    status: agent.status,
    capabilities: agent.capabilities,
    metrics: agent.metrics,
  });
}
