'use client';

import { useState, useEffect, useCallback } from 'react';
import { AGENTS, PHASES } from '@/lib/agents-registry';
import { Agent, PlantData } from '@/types/agents';
import AgentCard from '@/components/agents/AgentCard';
import AgentChat from '@/components/agents/AgentChat';
import OrchestratorPanel from '@/components/agents/OrchestratorPanel';
import MetricCard from '@/components/dashboard/MetricCard';
import AlertFeed from '@/components/dashboard/AlertFeed';
import KilnChart from '@/components/dashboard/KilnChart';
import PhaseFilter from '@/components/dashboard/PhaseFilter';

interface DashboardData {
  plantData: PlantData;
  timeSeries: {
    kilnTemp: { time: string; value: number }[];
    production: { time: string; value: number }[];
    energy: { time: string; value: number }[];
  };
  alerts: {
    id: string;
    agentId: string;
    severity: string;
    message: string;
    timestamp: string;
  }[];
}

export default function Dashboard() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [showOrchestrator, setShowOrchestrator] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('--:--:--');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/plant-data');
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  useEffect(() => {
    const formatCurrentTime = () => new Date().toLocaleTimeString('en-US', { hour12: false });
    setCurrentTime(formatCurrentTime());

    const timer = setInterval(() => setCurrentTime(formatCurrentTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredAgents = selectedPhase === 'all'
    ? AGENTS
    : AGENTS.filter(a => a.phase === selectedPhase);

  const pd = dashboardData?.plantData;

  return (
    <div className="min-h-screen grid-bg">
      {/* Top Navigation */}
      <header className="border-b border-teal/20 bg-[#0a1628]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-light/20 border border-teal-light/40 rounded flex items-center justify-center text-lg">
                🏭
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-white tracking-wide">
                  CEMENT<span className="text-teal-light"> & RMX</span> AI COMMAND
                </h1>
                <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase">
                  Supply Chain Multi-Agent System
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 status-pulse" />
              <span className="font-mono text-xs text-green-400">LIVE</span>
            </div>

            {/* Clock */}
            <div className="font-mono text-sm text-gray-300">
              {currentTime}
            </div>

            {/* Agent count */}
            <div className="hidden md:flex items-center gap-2 bg-teal/10 border border-teal/30 rounded px-3 py-1">
              <span className="text-teal-light font-bold font-mono text-sm">32</span>
              <span className="text-gray-400 text-xs">Active Agents</span>
            </div>

            {/* Orchestrator button */}
            <button
              onClick={() => setShowOrchestrator(true)}
              className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400 px-4 py-1.5 rounded text-sm font-semibold transition-all duration-200 font-display tracking-wide"
            >
              🤖 ORCHESTRATOR
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Kiln Temp', value: pd ? `${pd.kilnTemp}°C` : '---', unit: '', color: '#f97316', icon: '🔥', alert: pd && Math.abs(pd.kilnTemp - 1450) > 20 },
            { label: 'Production', value: pd ? `${(pd.productionRate / 1000).toFixed(1)}K` : '---', unit: 't/d', color: '#10b981', icon: '⚙️', alert: false },
            { label: 'OEE', value: pd ? `${pd.oee}%` : '---', unit: '', color: '#0891b2', icon: '📊', alert: pd && pd.oee < 80 },
            { label: 'Energy', value: pd ? `${pd.energyConsumption}` : '---', unit: 'kWh/t', color: '#eab308', icon: '⚡', alert: false },
            { label: 'Silo Stock', value: pd ? `${Math.round(pd.siloLevel / 1000)}K` : '---', unit: 't', color: '#f59e0b', icon: '🏗️', alert: pd && pd.siloLevel / pd.siloCapacity < 0.3 },
            { label: 'CO₂ /t', value: pd ? `${pd.co2Emissions}` : '---', unit: 'kg/kg', color: '#06b6d4', icon: '🌿', alert: pd && pd.co2Emissions > 0.75 },
            { label: 'Orders', value: pd ? `${pd.activeOrders}` : '---', unit: 'live', color: '#7c3aed', icon: '📋', alert: false },
            { label: 'Revenue', value: pd ? `$${(pd.dailyRevenue / 1000).toFixed(0)}K` : '---', unit: 'today', color: '#10b981', icon: '💰', alert: false },
          ].map((kpi) => (
            <MetricCard key={kpi.label} {...kpi} loading={loading} />
          ))}
        </div>

        {/* Main content: charts + alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <KilnChart
              kilnData={dashboardData?.timeSeries.kilnTemp || []}
              productionData={dashboardData?.timeSeries.production || []}
            />
          </div>
          <div>
            <AlertFeed
              alerts={dashboardData?.alerts || []}
              loading={loading}
            />
          </div>
        </div>

        {/* Phase filter */}
        <PhaseFilter
          phases={PHASES}
          selected={selectedPhase}
          onChange={setSelectedPhase}
          agentCounts={PHASES.reduce((acc, p) => {
            acc[p.id] = AGENTS.filter(a => a.phase === p.id).length;
            return acc;
          }, {} as Record<string, number>)}
        />

        {/* Agent Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => setSelectedAgent(agent)}
              isSelected={selectedAgent?.id === agent.id}
            />
          ))}
        </div>
      </main>

      {/* Agent Chat Drawer */}
      {selectedAgent && (
        <AgentChat
          agent={selectedAgent}
          plantData={dashboardData?.plantData}
          onClose={() => setSelectedAgent(null)}
        />
      )}

      {/* Orchestrator Panel */}
      {showOrchestrator && (
        <OrchestratorPanel
          onClose={() => setShowOrchestrator(false)}
        />
      )}
    </div>
  );
}
