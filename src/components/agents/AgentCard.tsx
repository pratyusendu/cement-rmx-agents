'use client';

import { Agent } from '@/types/agents';

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
  isSelected: boolean;
}

const STATUS_CONFIG = {
  active: { color: '#10b981', label: 'ACTIVE', pulse: true },
  processing: { color: '#0891b2', label: 'PROCESSING', pulse: true },
  idle: { color: '#64748b', label: 'IDLE', pulse: false },
  alert: { color: '#ef4444', label: 'ALERT', pulse: true },
  offline: { color: '#374151', label: 'OFFLINE', pulse: false },
};

const PRIORITY_LABEL = {
  critical: { text: 'CRIT', color: '#ef4444' },
  high: { text: 'HIGH', color: '#f97316' },
  medium: { text: 'MED', color: '#f59e0b' },
};

export default function AgentCard({ agent, onClick, isSelected }: AgentCardProps) {
  const status = STATUS_CONFIG[agent.status];
  const priority = PRIORITY_LABEL[agent.priority];

  return (
    <button
      onClick={onClick}
      className={`agent-card w-full text-left rounded-lg p-3 border transition-all duration-200 ${
        isSelected
          ? 'border-[var(--agent-color)] bg-[var(--agent-color)]/10 shadow-lg'
          : 'border-gray-700/50 bg-[#0a1628]/80 hover:border-[var(--agent-color)]/50'
      }`}
      style={{ '--agent-color': agent.color } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{agent.icon}</span>
          <div>
            <div
              className="text-xs font-bold font-mono tracking-widest"
              style={{ color: agent.color }}
            >
              {agent.shortName}
            </div>
            <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
              {agent.phase}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          {/* Priority badge */}
          <span
            className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded"
            style={{ color: priority.color, backgroundColor: `${priority.color}20`, border: `1px solid ${priority.color}40` }}
          >
            {priority.text}
          </span>
          {/* Status dot */}
          <div className="flex items-center gap-1">
            <div
              className={`w-1.5 h-1.5 rounded-full ${status.pulse ? 'status-pulse' : ''}`}
              style={{ backgroundColor: status.color }}
            />
            <span className="text-[9px] font-mono" style={{ color: status.color }}>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Agent name */}
      <div className="text-sm font-semibold text-gray-200 mb-2 leading-tight font-display">
        {agent.name.replace(' Agent', '')}
      </div>

      {/* Top metric */}
      {agent.metrics[0] && (
        <div
          className="rounded p-2 mb-2"
          style={{ backgroundColor: `${agent.color}10`, border: `1px solid ${agent.color}20` }}
        >
          <div className="text-[10px] text-gray-400 font-mono">{agent.metrics[0].label}</div>
          <div className="text-sm font-bold font-mono" style={{ color: agent.color }}>
            {agent.metrics[0].value}{agent.metrics[0].unit ? ` ${agent.metrics[0].unit}` : ''}
          </div>
        </div>
      )}

      {/* Capabilities preview */}
      <div className="flex flex-wrap gap-1">
        {agent.capabilities.slice(0, 2).map(cap => (
          <span
            key={cap}
            className="text-[9px] text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded font-mono"
          >
            {cap}
          </span>
        ))}
        {agent.capabilities.length > 2 && (
          <span className="text-[9px] text-gray-600 font-mono">+{agent.capabilities.length - 2}</span>
        )}
      </div>

      {/* Chat CTA */}
      <div
        className="mt-2 text-[10px] font-bold font-mono text-center py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: agent.color, backgroundColor: `${agent.color}15` }}
      >
        → CHAT WITH AGENT
      </div>
    </button>
  );
}
