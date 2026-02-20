'use client';

import { AGENTS } from '@/lib/agents-registry';

interface Alert {
  id: string;
  agentId: string;
  severity: string;
  message: string;
  timestamp: string;
}

interface AlertFeedProps {
  alerts: Alert[];
  loading: boolean;
}

const SEVERITY_CONFIG = {
  critical: { color: '#ef4444', bg: 'alert-critical', icon: '🔴', label: 'CRITICAL' },
  warning: { color: '#f59e0b', bg: 'alert-warning', icon: '🟡', label: 'WARNING' },
  info: { color: '#0891b2', bg: 'alert-info', icon: '🔵', label: 'INFO' },
};

export default function AlertFeed({ alerts, loading }: AlertFeedProps) {
  return (
    <div className="bg-[#0a1628] border border-gray-700/50 rounded-xl p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-white tracking-wide text-sm">
          ⚡ LIVE ALERTS
        </h3>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 status-pulse" />
          <span className="text-[10px] text-green-400 font-mono">LIVE</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-gray-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto max-h-[calc(220px+2rem)]">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-600 font-mono text-sm">
              ✅ No active alerts
            </div>
          ) : (
            alerts.map(alert => {
              const config = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.info;
              const agent = AGENTS.find(a => a.id === alert.agentId);

              return (
                <div key={alert.id} className={`rounded-lg px-3 py-2.5 ${config.bg}`}>
                  <div className="flex items-start gap-2">
                    <span className="text-sm flex-shrink-0 mt-0.5">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold font-mono" style={{ color: config.color }}>
                          {config.label}
                        </span>
                        {agent && (
                          <span className="text-[9px] text-gray-500 font-mono truncate">
                            {agent.icon} {agent.shortName}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-300 leading-snug">{alert.message}</div>
                      <div className="text-[9px] text-gray-600 font-mono mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
