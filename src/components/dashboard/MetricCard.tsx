'use client';

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  color: string;
  icon: string;
  alert?: boolean | null;
  loading?: boolean;
}

export default function MetricCard({ label, value, unit, color, icon, alert, loading }: MetricCardProps) {
  return (
    <div
      className={`rounded-xl border p-3 transition-all duration-300 ${
        alert ? 'border-red-500/50' : 'border-gray-700/50'
      }`}
      style={{
        backgroundColor: alert ? 'rgba(239, 68, 68, 0.05)' : '#0a1628',
        boxShadow: alert ? '0 0 15px rgba(239, 68, 68, 0.1)' : 'none',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-base">{icon}</span>
        {alert && <div className="w-1.5 h-1.5 rounded-full bg-red-400 status-pulse" />}
      </div>

      {loading ? (
        <div className="h-6 bg-gray-800 rounded animate-pulse mb-1" />
      ) : (
        <div
          className="text-lg font-bold font-mono metric-value"
          style={{ color }}
        >
          {value}
          {unit && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
        </div>
      )}

      <div className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{label}</div>
    </div>
  );
}
