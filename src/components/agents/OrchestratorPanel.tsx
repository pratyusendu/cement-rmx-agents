'use client';

import { useState } from 'react';
import { AGENTS } from '@/lib/agents-registry';

interface OrchestratorResponse {
  query: string;
  synthesis: string;
  agentResponses: { agentId: string; agentName: string; response: string }[];
  agentsConsulted: number;
  timestamp: string;
}

interface OrchestratorPanelProps {
  onClose: () => void;
}

const SAMPLE_QUERIES = [
  'What are the critical operational issues I should address right now?',
  'How can we improve profitability across cement and RMX operations?',
  'Analyze our ESG and compliance risk exposure',
  'Which supply chain bottlenecks are limiting our production capacity?',
  'What is the demand outlook and how should we adjust production?',
  'Identify cost reduction opportunities across all operations',
];

export default function OrchestratorPanel({ onClose }: OrchestratorPanelProps) {
  const [query, setQuery] = useState('');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrchestratorResponse | null>(null);
  const [error, setError] = useState('');

  const toggleAgent = (id: string) => {
    setSelectedAgents(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id].slice(0, 5)
    );
  };

  const runOrchestration = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          includeAgents: selectedAgents.length > 0 ? selectedAgents : undefined,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Orchestration failed');
    } finally {
      setLoading(false);
    }
  };

  const PHASE_COLORS: Record<string, string> = {
    procurement: '#0891b2', mining: '#06b6d4', manufacturing: '#10b981',
    inventory: '#f59e0b', rmx: '#f97316', sales: '#7c3aed',
    delivery: '#ef4444', finance: '#eab308',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#080f1f] border border-orange-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ boxShadow: '0 0 60px rgba(249, 115, 22, 0.15)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-orange-500/10 border-b border-orange-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/20 border border-orange-500/40 rounded-xl flex items-center justify-center text-2xl">
              🤖
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white tracking-wide">
                MULTI-AGENT ORCHESTRATOR
              </h2>
              <p className="text-xs text-orange-400/70 font-mono">Coordinates up to 5 agents simultaneously for cross-functional insights</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Query input */}
          <div>
            <label className="text-xs text-orange-400 font-bold font-mono uppercase tracking-wider mb-2 block">
              Strategic Query
            </label>
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask a cross-functional question that requires multiple agent perspectives..."
              rows={3}
              className="w-full bg-[#0d1a2d] border border-orange-500/30 rounded-xl px-4 py-3 text-gray-200 font-mono text-sm placeholder-gray-600 outline-none resize-none focus:border-orange-500/60 transition-colors"
            />

            {/* Sample queries */}
            <div className="flex flex-wrap gap-2 mt-2">
              {SAMPLE_QUERIES.map(q => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="text-[10px] text-orange-400/70 hover:text-orange-400 bg-orange-500/05 hover:bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded font-mono transition-all"
                >
                  {q.slice(0, 40)}…
                </button>
              ))}
            </div>
          </div>

          {/* Agent selection */}
          <div>
            <label className="text-xs text-orange-400 font-bold font-mono uppercase tracking-wider mb-2 block">
              Select Agents to Consult <span className="text-gray-500">(optional — leave empty for auto-selection)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {AGENTS.map(agent => {
                const isSelected = selectedAgents.includes(agent.id);
                const color = PHASE_COLORS[agent.phase] || '#64748b';
                return (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className="text-left rounded-lg px-2 py-1.5 text-xs font-mono border transition-all"
                    style={{
                      borderColor: isSelected ? color : '#374151',
                      backgroundColor: isSelected ? `${color}15` : 'transparent',
                      color: isSelected ? color : '#6b7280',
                    }}
                  >
                    <div>{agent.icon} {agent.shortName}</div>
                  </button>
                );
              })}
            </div>
            {selectedAgents.length > 0 && (
              <div className="text-[10px] text-orange-400 font-mono mt-1">
                {selectedAgents.length}/5 agents selected
              </div>
            )}
          </div>

          {/* Run button */}
          <button
            onClick={runOrchestration}
            disabled={!query.trim() || loading}
            className="w-full py-3 rounded-xl font-display font-bold text-lg tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: loading ? '#7c4a1a' : '#f97316', color: 'white' }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                CONSULTING AGENTS...
              </span>
            ) : '🚀 RUN ORCHESTRATION'}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 font-mono text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4 animate-fade-in">
              {/* Query echo */}
              <div className="bg-orange-500/05 border border-orange-500/20 rounded-xl p-4">
                <div className="text-xs text-orange-400 font-mono font-bold mb-1">QUERY</div>
                <div className="text-gray-300 text-sm">{result.query}</div>
              </div>

              {/* Agent responses */}
              <div>
                <div className="text-xs text-gray-400 font-mono font-bold mb-2">
                  AGENT RESPONSES ({result.agentsConsulted} agents consulted)
                </div>
                <div className="space-y-2">
                  {result.agentResponses.map(ar => {
                    const agent = AGENTS.find(a => a.id === ar.agentId);
                    const color = agent ? PHASE_COLORS[agent.phase] : '#64748b';
                    return (
                      <div
                        key={ar.agentId}
                        className="rounded-xl border p-3"
                        style={{ borderColor: `${color}25`, backgroundColor: `${color}05` }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span>{agent?.icon}</span>
                          <span className="text-xs font-bold font-mono" style={{ color }}>
                            {ar.agentName}
                          </span>
                        </div>
                        <div className="text-gray-300 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                          {ar.response}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Synthesis */}
              <div className="bg-[#0d1a2d] border border-orange-500/30 rounded-xl p-5">
                <div className="text-xs text-orange-400 font-mono font-bold mb-3 flex items-center gap-2">
                  🤖 ORCHESTRATOR SYNTHESIS
                </div>
                <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                  {result.synthesis}
                </div>
              </div>

              <div className="text-[10px] text-gray-700 font-mono text-center">
                Generated at {new Date(result.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
