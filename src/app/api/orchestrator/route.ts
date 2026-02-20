// ============================================================
// API Route: /api/orchestrator — Multi-Agent Orchestrator
// Coordinates multiple agents and synthesizes responses
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { AGENTS, getAgent } from '@/lib/agents-registry';
import { callLLM } from '@/lib/llm';
import { getSimulatedPlantData, buildPlantContext } from '@/lib/plant-simulator';

export const runtime = 'edge';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { query, context, includeAgents } = await req.json();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const plantData = getSimulatedPlantData();
    const plantContext = buildPlantContext(plantData);

    // Determine which agents to consult (either specified or auto-select top relevant)
    let selectedAgentIds: string[] = includeAgents || [];

    if (selectedAgentIds.length === 0) {
      // Auto-select 3-5 most relevant agents based on query keywords
      selectedAgentIds = autoSelectAgents(query);
    }

    // Query each selected agent in parallel
    const agentQueryPromises = selectedAgentIds.slice(0, 5).map(async (agentId) => {
      const agent = getAgent(agentId);
      if (!agent) return null;

      try {
        const agentSystemPrompt = `${agent.systemPrompt}

${plantContext}

BRIEF MODE: You are part of a multi-agent consultation. Provide a CONCISE response (100-150 words) focused on your domain expertise regarding the query. Be specific and actionable.`;

        const response = await callLLM([
          { role: 'system', content: agentSystemPrompt },
          { role: 'user', content: query },
        ]);

        return {
          agentId: agent.id,
          agentName: agent.name,
          phase: agent.phase,
          response: response.content,
        };
      } catch (err) {
        console.error(`Agent ${agentId} failed:`, err);
        return {
          agentId: agent.id,
          agentName: agent.name,
          phase: agent.phase,
          response: `[${agent.name} is currently unavailable]`,
        };
      }
    });

    const agentResults = (await Promise.all(agentQueryPromises)).filter(Boolean) as {
      agentId: string;
      agentName: string;
      phase: string;
      response: string;
    }[];

    // Synthesize all agent responses into a unified insight
    const synthesisPrompt = `You are the Orchestrator AI for a Cement & RMX Supply Chain command center.

${plantContext}

ORIGINAL QUERY: "${query}"

AGENT RESPONSES:
${agentResults.map(a => `[${a.agentName}]: ${a.response}`).join('\n\n')}

Your task: Synthesize these expert inputs into:
1. A UNIFIED INSIGHT (200-250 words): Coherent cross-functional analysis
2. TOP 3 RECOMMENDATIONS: Specific, prioritized actions (numbered list)
3. ALERTS: Any critical issues requiring immediate attention (if none, say "No critical alerts")

Be decisive, data-driven, and specific.`;

    const synthesis = await callLLM([
      { role: 'system', content: synthesisPrompt },
      { role: 'user', content: 'Synthesize the agent responses and provide recommendations.' },
    ]);

    // Parse synthesis for structured output
    const synthesisText = synthesis.content;

    return NextResponse.json({
      query,
      plantData,
      agentResponses: agentResults,
      synthesis: synthesisText,
      agentsConsulted: agentResults.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Orchestrator error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Orchestrator failed' },
      { status: 500 }
    );
  }
}

// Auto-select relevant agents based on query keywords
function autoSelectAgents(query: string): string[] {
  const q = query.toLowerCase();
  const scores: { id: string; score: number }[] = [];

  const keywords: Record<string, string[]> = {
    'kiln-optimization': ['kiln', 'clinker', 'temperature', 'burning', 'fuel', 'heat', 'preheater'],
    'quality-lab': ['quality', 'strength', 'test', 'spec', 'grade', 'cement', 'mpa', 'blaine'],
    'batch-controller': ['batch', 'rmx', 'ready-mix', 'concrete', 'plant', 'mixer'],
    'route-optimization': ['delivery', 'route', 'truck', 'transport', 'logistics', 'haul'],
    'pricing-engine': ['price', 'pricing', 'margin', 'revenue', 'cost', 'discount'],
    'supplier-intelligence': ['supplier', 'vendor', 'procurement', 'purchase', 'source'],
    'energy-management': ['energy', 'power', 'fuel', 'electric', 'kwh', 'consumption'],
    'credit-risk': ['credit', 'payment', 'overdue', 'collection', 'ar', 'dso'],
    'mix-design': ['mix', 'design', 'concrete', 'admixture', 'water-cement', 'slump'],
    'fleet-telematics': ['fleet', 'truck', 'driver', 'gps', 'telematics', 'vehicle'],
    'silo-management': ['silo', 'storage', 'stock', 'inventory', 'level'],
    'demand-signal': ['demand', 'forecast', 'planning', 'order', 'volume'],
    'emission-control': ['emission', 'co2', 'dust', 'environment', 'esg', 'pollution', 'nox'],
    'cost-analytics': ['cost', 'variance', 'budget', 'financial', 'analysis', 'expense'],
    'predictive-maintenance': ['maintenance', 'breakdown', 'repair', 'failure', 'vibration', 'downtime'],
    'compliance-esg': ['compliance', 'regulation', 'esg', 'audit', 'legal', 'permit'],
    'revenue-cycle': ['invoice', 'billing', 'collection', 'revenue', 'cash'],
    'crm-retention': ['customer', 'retention', 'churn', 'satisfaction', 'account'],
    'plant-scheduler': ['schedule', 'planning', 'capacity', 'dispatch', 'timing'],
    'order-intake': ['order', 'booking', 'enquiry', 'customer', 'request'],
  };

  AGENTS.forEach(agent => {
    const agentKeywords = keywords[agent.id] || [];
    let score = 0;
    agentKeywords.forEach(kw => {
      if (q.includes(kw)) score += 2;
    });
    // Boost by priority
    if (agent.priority === 'critical') score += 1;
    if (score > 0) scores.push({ id: agent.id, score });
  });

  // Sort by score and return top 4
  scores.sort((a, b) => b.score - a.score);

  // If no matches, return default critical agents
  if (scores.length === 0) {
    return ['kiln-optimization', 'quality-lab', 'batch-controller', 'route-optimization'];
  }

  return scores.slice(0, 4).map(s => s.id);
}
