'use client';

interface Phase {
  id: string;
  label: string;
  color: string;
  count: number;
}

interface PhaseFilterProps {
  phases: Phase[];
  selected: string;
  onChange: (phase: string) => void;
  agentCounts: Record<string, number>;
}

export default function PhaseFilter({ phases, selected, onChange, agentCounts }: PhaseFilterProps) {
  const totalAgents = Object.values(agentCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-[#0a1628] border border-gray-700/50 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-widest">
          Filter by Supply Chain Phase
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {/* All button */}
        <button
          onClick={() => onChange('all')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all ${
            selected === 'all'
              ? 'bg-white/10 border-white/40 text-white'
              : 'border-gray-700 text-gray-400 hover:border-gray-500'
          }`}
        >
          <span>ALL</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded ${selected === 'all' ? 'bg-white/20' : 'bg-gray-800'}`}>
            {totalAgents}
          </span>
        </button>

        {phases.map(phase => (
          <button
            key={phase.id}
            onClick={() => onChange(phase.id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all"
            style={
              selected === phase.id
                ? {
                    borderColor: phase.color,
                    backgroundColor: `${phase.color}15`,
                    color: phase.color,
                  }
                : {
                    borderColor: '#374151',
                    color: '#6b7280',
                  }
            }
          >
            <span className={`phase-${phase.id}`}>{phase.label}</span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={
                selected === phase.id
                  ? { backgroundColor: `${phase.color}30`, color: phase.color }
                  : { backgroundColor: '#1f2937', color: '#4b5563' }
              }
            >
              {agentCounts[phase.id] || 0}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
