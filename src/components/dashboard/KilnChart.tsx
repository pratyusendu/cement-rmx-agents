'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

interface KilnChartProps {
  kilnData: { time: string; value: number }[];
  productionData: { time: string; value: number }[];
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0a1628] border border-teal/30 rounded-lg px-3 py-2 font-mono text-xs">
        <div className="text-gray-400 mb-1">{label}</div>
        {payload.map(p => (
          <div key={p.name} style={{ color: p.color }}>
            {p.name}: <strong>{p.value.toLocaleString()}</strong>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function KilnChart({ kilnData, productionData }: KilnChartProps) {
  // Show only every 3rd label to avoid crowding
  const tickCount = Math.ceil(kilnData.length / 4);

  return (
    <div className="bg-[#0a1628] border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-white tracking-wide text-sm">
            🔥 KILN PERFORMANCE — 24H TREND
          </h3>
          <div className="text-[10px] text-gray-500 font-mono">Temperature (°C) & Production Rate (t/d)</div>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono">
          <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-orange-400 inline-block" /> Temp (°C)</span>
          <span className="flex items-center gap-1"><span className="w-6 h-0.5 bg-teal-400 inline-block" /> Production</span>
        </div>
      </div>

      {kilnData.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={kilnData.map((d, i) => ({
            time: d.time,
            kilnTemp: d.value,
            production: productionData[i]?.value || 0,
          }))} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'JetBrains Mono' }}
              interval={tickCount}
              axisLine={{ stroke: '#1f2937' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="temp"
              domain={[1380, 1520]}
              tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="prod"
              orientation="right"
              domain={[2500, 3800]}
              tick={{ fill: '#4b5563', fontSize: 9, fontFamily: 'JetBrains Mono' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine yAxisId="temp" y={1450} stroke="#f97316" strokeDasharray="4 4" strokeOpacity={0.5} label={{ value: 'Target', fill: '#f97316', fontSize: 9 }} />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="kilnTemp"
              stroke="#f97316"
              strokeWidth={2}
              dot={false}
              name="Kiln Temp"
            />
            <Line
              yAxisId="prod"
              type="monotone"
              dataKey="production"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              name="Production"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] flex items-center justify-center">
          <div className="flex gap-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 bg-teal-500 rounded-full status-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
