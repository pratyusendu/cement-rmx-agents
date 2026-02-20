// ============================================================
// Cement & RMX Supply Chain AI Agents — Type Definitions
// ============================================================

export type AgentPhase =
  | 'procurement'
  | 'mining'
  | 'manufacturing'
  | 'inventory'
  | 'rmx'
  | 'sales'
  | 'delivery'
  | 'finance';

export type AgentPriority = 'critical' | 'high' | 'medium';
export type AgentStatus = 'active' | 'idle' | 'processing' | 'alert' | 'offline';

export interface Agent {
  id: string;
  name: string;
  shortName: string;
  phase: AgentPhase;
  priority: AgentPriority;
  status: AgentStatus;
  description: string;
  systemPrompt: string;
  capabilities: string[];
  metrics: AgentMetric[];
  color: string;
  icon: string;
  lastAction?: string;
  alertCount?: number;
}

export interface AgentMetric {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  status?: 'good' | 'warning' | 'critical';
}

export interface AgentMessage {
  id: string;
  agentId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface AgentAlert {
  id: string;
  agentId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface PlantData {
  kilnTemp: number;
  kilnTempTarget: number;
  clinkerQuality: number;
  energyConsumption: number;
  co2Emissions: number;
  productionRate: number;
  siloLevel: number;
  siloCapacity: number;
  activeOrders: number;
  trucksDeployed: number;
  trucksReturning: number;
  dailyRevenue: number;
  oee: number;
}

export interface ChatRequest {
  agentId: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  plantData?: PlantData;
}

export interface ChatResponse {
  content: string;
  agentId: string;
  timestamp: string;
}

export interface OrchestratorRequest {
  query: string;
  context?: string;
  includeAgents?: string[];
}

export interface OrchestratorResponse {
  synthesis: string;
  agentResponses: { agentId: string; agentName: string; response: string }[];
  recommendations: string[];
  alerts: string[];
}
