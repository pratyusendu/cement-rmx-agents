# 🤖 Multi-Agent System & LLM Architecture
## Cement & RMX Supply Chain — Technical Deep Dive

> **Source:** Extracted directly from project source code  
> **Stack:** Next.js 14 · TypeScript · Groq LLaMA 3.1 70B · Vercel Edge Functions  
> **File:** `src/lib/llm.ts` · `src/lib/agents-registry.ts` · `src/app/api/`

LIVE Application Demo : https://cement-rmx-agents.vercel.app/  (by Pratyusendu)
---

## 📋 Table of Contents

1. [LLM Configuration — What Models Are Used](#1-llm-configuration--what-models-are-used)
2. [How Agents Work — The Architecture](#2-how-agents-work--the-architecture)
3. [How Multi-Agent Orchestration Works](#3-how-multi-agent-orchestration-works)
4. [Agent Auto-Selection Algorithm (Source Code)](#4-agent-auto-selection-algorithm-source-code)
5. [All 32 Agents — Scope, Role & System Prompt Summary](#5-all-32-agents--scope-role--system-prompt-summary)
6. [LLM Call Flow — Streaming vs Non-Streaming](#6-llm-call-flow--streaming-vs-non-streaming)
7. [Dependencies & Packages Used](#7-dependencies--packages-used)

---

## 1. LLM Configuration — What Models Are Used

### Source: `src/lib/llm.ts`

The project uses a **dual-LLM setup** — one primary, one automatic fallback. No LangChain, no LangGraph, no external agent framework. All orchestration is custom-coded.

---

### Primary LLM — Groq (LLaMA 3.1 70B)

```
Provider:  Groq Cloud API
Model:     llama-3.1-70b-versatile   ← default
Endpoint:  https://api.groq.com/openai/v1/chat/completions
API Key:   GROQ_API_KEY (env var)
Cost:      Free tier (thousands of calls/day)
Speed:     < 2 seconds for a full response
```

**Why Groq?** Groq runs LLaMA on proprietary LPU (Language Processing Unit) silicon — it is the fastest publicly available LLM inference in the world. Free tier is generous enough for production use at moderate scale.

**Parameters used in code:**
```typescript
body: JSON.stringify({
  model: model || 'llama-3.1-70b-versatile',
  messages,
  max_tokens: 1024,
  temperature: 0.7,
  stream: false,      // for orchestrator (parallel non-streaming)
  // OR
  stream: true,       // for individual agent chat (SSE streaming)
})
```

**Configurable alternatives (via env vars, no code change):**
| Env Variable | Default | Options |
|---|---|---|
| `GROQ_MODEL` | `llama-3.1-70b-versatile` | `llama-3.1-8b-instant`, `mixtral-8x7b-32768` |
| `LLM_PROVIDER` | `groq` | `groq`, `openai` |

---

### Fallback LLM — OpenAI (GPT-4o-mini)

```
Provider:  OpenAI API
Model:     gpt-4o-mini               ← default fallback
Endpoint:  https://api.openai.com/v1/chat/completions
API Key:   OPENAI_API_KEY (env var, optional)
Cost:      ~$0.15 per 1M input tokens
Trigger:   Automatic when Groq call fails (rate limit, network error, 5xx)
```

**Fallback logic from source:**
```typescript
// From src/lib/llm.ts — actual code
if (provider === 'groq') {
  try {
    return await callGroq(messages, model);
  } catch (err) {
    console.warn('Groq failed, trying OpenAI fallback:', err);
    const oaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    return await callOpenAI(messages, oaiModel);  // ← silent auto-switch
  }
}
```

The fallback is **transparent to the user** — no error shown, the chat just continues with OpenAI instead.

---

### Two Modes: Streaming vs. Non-Streaming

The `llm.ts` file exports **two different functions** used in different contexts:

| Function | Used By | Mode | Returns |
|---|---|---|---|
| `streamLLM()` | Individual Agent Chat API | SSE streaming | `AsyncGenerator<string>` — one token at a time |
| `callLLM()` | Orchestrator API | Non-streaming (batch) | `Promise<LLMResponse>` — full response at once |

**Why two modes?**

- **Individual agent chat** → streaming gives real-time word-by-word output so users see the response as it generates (like ChatGPT). Feels fast and interactive.
- **Orchestrator** → calls 4 agents **in parallel** using `Promise.all()`. Streaming doesn't work with parallel calls; you need the full response from each agent before you can synthesize them together.

---

### LLM Response Object

```typescript
interface LLMResponse {
  content: string;    // The agent's response text
  provider: string;   // 'groq' or 'openai' — whichever actually responded
  model: string;      // Exact model string used
  tokens?: number;    // Total tokens consumed (from usage.total_tokens)
}
```

---

## 2. How Agents Work — The Architecture

### An "Agent" in This Project

In this codebase, an **agent is not an autonomous loop** — it does not take actions, browse the web, or call tools. It is a **specialized LLM conversation endpoint**: a fixed system prompt (the "expert knowledge") + live plant sensor data + the user's message = a domain-expert response.

```
Agent = System Prompt (domain knowledge) + Live Plant Data + LLM call
```

Each agent is defined as a TypeScript object in `agents-registry.ts`:

```typescript
// From src/lib/agents-registry.ts — structure of every agent
interface Agent {
  id: string;           // URL slug, e.g. 'kiln-optimization'
  name: string;         // Display name
  shortName: string;    // e.g. 'KilnAI'
  phase: AgentPhase;    // One of 8 supply chain phases
  priority: 'critical' | 'high' | 'medium';
  status: 'active' | 'idle' | 'processing' | 'alert' | 'offline';
  systemPrompt: string; // ← THE AGENT'S DOMAIN KNOWLEDGE (long text)
  capabilities: string[];
  metrics: AgentMetric[];
  color: string;
  icon: string;
}
```

### What Happens When You Chat with an Agent

**Source: `src/app/api/agents/[agentId]/route.ts`**

```
1. User message arrives at  POST /api/agents/{agentId}
2. Agent definition is loaded from agents-registry.ts (by ID)
3. Live plant data is fetched from plant-simulator.ts
4. A plant context string is built:
   "LIVE PLANT STATUS: Kiln: 1450°C | Production: 3,200 t/d | OEE: 84%..."
5. A final system prompt is assembled:
   {agent.systemPrompt} + {plantContext} + instructions for format/length
6. LLM messages array is built:
   [system prompt, ...last 10 turns of conversation history]
7. streamLLM() is called → tokens stream back via SSE
8. Each token is sent to the browser as:  data: {"content": "word "}\n\n
9. Browser accumulates tokens word-by-word in the UI
10. Stream ends with:  data: [DONE]\n\n
```

**The system prompt injection (from actual source code):**
```typescript
const systemPrompt = `${agent.systemPrompt}

${plantContext}

INSTRUCTIONS:
- You are ${agent.name} (${agent.shortName}), an AI agent in a cement & RMX
  supply chain management system
- Respond in a professional, data-driven manner appropriate for operations managers
- Be specific and actionable — give exact numbers, not vague advice
- Use the live plant data above to contextualize your recommendations
- Keep responses concise (150-300 words) but information-dense
- If asked something outside your domain, briefly note it and redirect to the
  relevant agent
- Format key metrics with bold emphasis or code blocks when helpful`;
```

**Conversation history (memory within a session):**
```typescript
// Last 10 turns are sent to the LLM every time
const llmMessages = [
  { role: 'system', content: systemPrompt },
  ...messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
];
```

Memory is **in-session only** — the conversation is stored in browser React state. Refreshing the page clears it. There is no database persistence in the base version.

---

## 3. How Multi-Agent Orchestration Works

### Source: `src/app/api/orchestrator/route.ts`

The Orchestrator is a **meta-agent** that coordinates multiple domain agents simultaneously for cross-functional questions. It is triggered at `POST /api/orchestrator`.

### The 5-Step Orchestration Process

```
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 1 — Receive Query                                                  │
│  POST /api/orchestrator                                                  │
│  Body: { query: "What are our top risks today?", includeAgents?: [...] } │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 2 — Agent Selection                                                │
│  If includeAgents[] provided → use those agent IDs directly              │
│  If not provided → autoSelectAgents(query) keyword scoring algorithm     │
│  Max 5 agents selected (sliced: selectedAgentIds.slice(0, 5))           │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 3 — Parallel Agent Calls (Promise.all)                             │
│                                                                           │
│  Each agent gets:                                                         │
│  - Its OWN system prompt (domain knowledge)                               │
│  - The same live plant data (injected into every system prompt)           │
│  - The user's query as the "user" message                                 │
│  - BRIEF MODE instruction: "100-150 words, focused on your domain"        │
│                                                                           │
│  callLLM(agent_1_prompt + query) ──┐                                     │
│  callLLM(agent_2_prompt + query) ──┤ → await Promise.all([...])          │
│  callLLM(agent_3_prompt + query) ──┤   all run simultaneously            │
│  callLLM(agent_4_prompt + query) ──┘                                     │
│                                                                           │
│  Total time: same as ONE call (~2-5s), not 4× longer                     │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 4 — Synthesis LLM Call                                             │
│                                                                           │
│  A FIFTH LLM call is made with all 4 agent responses combined:           │
│                                                                           │
│  System: "You are the Orchestrator AI. Synthesize expert inputs into:    │
│           1. UNIFIED INSIGHT (200-250 words)                             │
│           2. TOP 3 RECOMMENDATIONS (numbered, specific, actionable)       │
│           3. ALERTS (critical issues requiring immediate attention)"      │
│                                                                           │
│  User: [All 4 agent responses concatenated]                               │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  STEP 5 — Return JSON Response                                           │
│  {                                                                        │
│    query, plantData, agentResponses[], synthesis,                        │
│    agentsConsulted: 4, timestamp: "2026-02-20T09:15:32Z"                │
│  }                                                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Synthesis Prompt (exact code)

```typescript
// From src/app/api/orchestrator/route.ts
const synthesisPrompt = `You are the Orchestrator AI for a Cement & RMX Supply
Chain command center.

${plantContext}

ORIGINAL QUERY: "${query}"

AGENT RESPONSES:
${agentResults.map(a => `[${a.agentName}]: ${a.response}`).join('\n\n')}

Your task: Synthesize these expert inputs into:
1. A UNIFIED INSIGHT (200-250 words): Coherent cross-functional analysis
2. TOP 3 RECOMMENDATIONS: Specific, prioritized actions (numbered list)
3. ALERTS: Any critical issues requiring immediate attention (if none, say
   "No critical alerts")

Be decisive, data-driven, and specific.`;
```

**Total LLM calls for one Orchestrator query: 5**
- 4 domain agent calls (parallel)
- 1 synthesis call (sequential, after all 4 complete)

---

## 4. Agent Auto-Selection Algorithm (Source Code)

When no agents are specified, the orchestrator runs this keyword-scoring algorithm from `src/app/api/orchestrator/route.ts`:

```typescript
function autoSelectAgents(query: string): string[] {
  const q = query.toLowerCase();
  const scores: { id: string; score: number }[] = [];

  // Each agent has a list of trigger keywords
  const keywords: Record<string, string[]> = {
    'kiln-optimization':    ['kiln', 'clinker', 'temperature', 'burning', 'fuel', 'heat', 'preheater'],
    'quality-lab':          ['quality', 'strength', 'test', 'spec', 'grade', 'cement', 'mpa', 'blaine'],
    'batch-controller':     ['batch', 'rmx', 'ready-mix', 'concrete', 'plant', 'mixer'],
    'route-optimization':   ['delivery', 'route', 'truck', 'transport', 'logistics', 'haul'],
    'pricing-engine':       ['price', 'pricing', 'margin', 'revenue', 'cost', 'discount'],
    'supplier-intelligence':['supplier', 'vendor', 'procurement', 'purchase', 'source'],
    'energy-management':    ['energy', 'power', 'fuel', 'electric', 'kwh', 'consumption'],
    'credit-risk':          ['credit', 'payment', 'overdue', 'collection', 'ar', 'dso'],
    'mix-design':           ['mix', 'design', 'concrete', 'admixture', 'water-cement', 'slump'],
    'fleet-telematics':     ['fleet', 'truck', 'driver', 'gps', 'telematics', 'vehicle'],
    'silo-management':      ['silo', 'storage', 'stock', 'inventory', 'level'],
    'demand-signal':        ['demand', 'forecast', 'planning', 'order', 'volume'],
    'emission-control':     ['emission', 'co2', 'dust', 'environment', 'esg', 'pollution', 'nox'],
    'cost-analytics':       ['cost', 'variance', 'budget', 'financial', 'analysis', 'expense'],
    'predictive-maintenance':['maintenance', 'breakdown', 'repair', 'failure', 'vibration', 'downtime'],
    'compliance-esg':       ['compliance', 'regulation', 'esg', 'audit', 'legal', 'permit'],
    'revenue-cycle':        ['invoice', 'billing', 'collection', 'revenue', 'cash'],
    'crm-retention':        ['customer', 'retention', 'churn', 'satisfaction', 'account'],
    'plant-scheduler':      ['schedule', 'planning', 'capacity', 'dispatch', 'timing'],
    'order-intake':         ['order', 'booking', 'enquiry', 'customer', 'request'],
  };

  AGENTS.forEach(agent => {
    const agentKeywords = keywords[agent.id] || [];
    let score = 0;
    agentKeywords.forEach(kw => {
      if (q.includes(kw)) score += 2;  // +2 per keyword match
    });
    if (agent.priority === 'critical') score += 1;  // +1 bonus for critical agents
    if (score > 0) scores.push({ id: agent.id, score });
  });

  scores.sort((a, b) => b.score - a.score);

  // Default fallback if no keywords match
  if (scores.length === 0) {
    return ['kiln-optimization', 'quality-lab', 'batch-controller', 'route-optimization'];
  }

  return scores.slice(0, 4).map(s => s.id);  // Top 4 agents only
}
```

**Worked example** — Query: `"What is our concrete delivery quality risk today?"`

| Agent | Keywords Matched | Score | Priority Bonus | Total |
|---|---|---|---|---|
| `route-optimization` | "delivery" (+2) | 2 | +1 (critical) | **3** ✓ |
| `batch-controller` | "concrete" (+2) | 2 | +1 (critical) | **3** ✓ |
| `quality-lab` | "quality" (+2) | 2 | +1 (critical) | **3** ✓ |
| `mix-design` | "concrete" (+2) | 2 | +1 (critical) | **3** ✓ |
| `crm-retention` | — | 0 | — | 0 ✗ |

→ **Selected:** `route-optimization`, `batch-controller`, `quality-lab`, `mix-design`

---

## 5. All 32 Agents — Scope, Role & System Prompt Summary

---

### 🔵 PHASE 1 — PROCUREMENT (4 Agents)
> Phase color: `#0891B2`

---

#### 1. Supplier Intelligence Agent
```
ID:        supplier-intelligence
ShortName: SupplierAI
Priority:  HIGH
Status:    active
```

**Scope:** Monitors, scores, and de-risks the entire supplier ecosystem for all raw materials (limestone, gypsum, fly ash, slag, aggregates, admixtures).

**What the LLM is told to do (system prompt essence):**
- Score every supplier on delivery performance, quality consistency, price competitiveness, financial stability (0–100)
- Identify single-source dependencies and geopolitical supply risks
- Recommend alternate suppliers with estimated cost impact when primary sources are at risk
- Analyze purchase price variance (PPV) and flag NCRs (non-conformance reports)
- Track lead times, MOQ, payment terms

**Domain knowledge injected:** Cement raw material types, SCM (supplementary cementitious materials), clinker factor, C3S content, IS/ASTM material standards

**LLM model used:** Groq LLaMA 3.1 70B (non-streaming, via `callLLM`)

---

#### 2. Price Forecasting Agent
```
ID:        price-forecasting
ShortName: PriceAI
Priority:  HIGH
Status:    active
```

**Scope:** Forecasts raw material and energy prices (pet coke, coal, limestone, diesel, electricity, gypsum, fly ash, aggregates) to optimize procurement timing.

**What the LLM is told to do:**
- Provide 30/60/90-day price forecasts with confidence intervals
- Identify optimal buy windows: spot vs. forward contract recommendations
- Calculate cost impact on per-tonne cement: "A 10% rise in pet coke = +$2.40/tonne clinker"
- Recommend specific hedging strategies
- Monitor commodity indices, freight rates, energy futures, FX rates

**Domain knowledge injected:** Monsoon impact on limestone supply, Chinese export policy effects on coal, GCV (Gross Calorific Value) of fuels

---

#### 3. Contract Management Agent
```
ID:        contract-management
ShortName: ContractAI
Priority:  MEDIUM
Status:    idle
```

**Scope:** Tracks all supplier and customer contracts — expirations, SLAs, performance clauses, take-or-pay obligations.

**What the LLM is told to do:**
- Trigger renewal negotiations 90 days before expiry
- Calculate liquidated damages for supplier non-performance
- Flag force majeure situations
- Identify renegotiation opportunities based on volume changes

**Contract types:** Quarry offtake, pet coke/coal supply, aggregate agreements, admixture contracts, cement offtake, transport contracts

---

#### 4. Demand Signal Agent
```
ID:        demand-signal
ShortName: DemandAI
Priority:  HIGH
Status:    processing
```

**Scope:** Aggregates and synthesizes demand signals from the sales pipeline, construction project trackers, seasonality patterns, and market indicators to drive procurement and production planning.

**What the LLM is told to do:**
- Produce SKU-level 30/60/90-day volume forecasts with confidence bands
- Trigger procurement requisitions when forecast exceeds safety stock
- Recommend production schedule based on demand outlook
- Alert on demand spikes requiring expedited procurement

**Signals integrated:** Order pipeline, construction permit data, infrastructure project announcements, real estate sector indicators, weather forecasts (affects pour schedules)

---

### 🔵 PHASE 2 — MINING & QUARRYING (3 Agents)
> Phase color: `#06B6D4`

---

#### 5. Geological Survey Agent
```
ID:        geological-survey
ShortName: GeoAI
Priority:  MEDIUM
Status:    active
```

**Scope:** Analyzes ore body quality, maps limestone deposits, and provides blending recommendations to achieve target kiln feed chemistry (LSF, SR, AR).

**What the LLM is told to do:**
- Analyze drill core assays: CaCO₃, MgO, SiO₂, Al₂O₃, Fe₂O₃ content
- Recommend optimal quarry face selection for grade and blend requirements
- Calculate blend ratios across multiple quarry sections for target chemistry
- Estimate reserve depletion and alert when grade zones are exhausted

**Targets injected into prompt:** LSF: 95–98, SR: 2.5–2.8, AR: 1.4–1.6, Total CaCO₃: 76–80%

---

#### 6. Blast Planning Agent
```
ID:        blast-planning
ShortName: BlastAI
Priority:  MEDIUM
Status:    idle
```

**Scope:** Designs blast patterns for limestone quarry operations — drill pattern, explosive charges, fragmentation prediction, vibration modeling, safety compliance.

**What the LLM is told to do:**
- Design blast patterns: burden, spacing, hole depth, inclination per bench
- Calculate explosive quantities (ANFO, emulsion) for target fragmentation
- Predict fragment size (Kuz-Ram model) to minimize crusher overload
- Model peak particle velocity to stay within regulatory limits (<5mm/s at plant boundary)
- Schedule blasts to minimize operational disruption

**Safety note in system prompt:** "Flag any geological structures (faults, clay seams) that require modified patterns." All plans require licensed shot-firer review.

---

#### 7. Equipment Utilization Agent
```
ID:        equipment-utilization
ShortName: EquipAI
Priority:  HIGH
Status:    active
```

**Scope:** Maximizes productivity of the mining equipment fleet — 3 excavators, 10 dump trucks, jaw/cone/VSI crushers, conveyors, drilling rigs.

**What the LLM is told to do:**
- Calculate OEE = Availability × Performance × Quality for each asset
- Optimize truck cycle time: load → haul → dump → return
- Track fuel consumption per tonne crushed
- Flag equipment nearing critical maintenance intervals (hours-based)
- Recommend dispatch optimization moves

---

### 🟢 PHASE 3 — MANUFACTURING (5 Agents)
> Phase color: `#10B981`

---

#### 8. Kiln Optimization Agent ⚠️ CRITICAL
```
ID:        kiln-optimization
ShortName: KilnAI
Priority:  CRITICAL
Status:    active
```

**Scope:** The most critical agent — controls and optimizes the 72m rotary kiln (5-stage preheater + calciner, 3,500 t/d design capacity) for clinker quality and fuel efficiency.

**What the LLM is told to do:**
- Adjust fuel feed rate (tph) and air-fuel ratio in response to burning zone temperature
- Control kiln feed rate and chemistry (LSF/SR/AR)
- Monitor all preheater cyclone temperatures (C1–C5)
- Alert immediately on rising free lime trend (indicates incomplete burning)
- Calculate heat consumption per tonne and identify optimization levers

**Clinker quality targets injected:** Free lime <1.5%, C3S 58–65%, C2S 15–22%, C3A 6–10%, C4AF 10–14%, Litre weight 1150–1250 g/l

**LLM mode when called from orchestrator:** `callLLM()` (non-streaming)  
**LLM mode when called directly:** `streamLLM()` (streaming SSE)

---

#### 9. Quality Lab Agent ⚠️ CRITICAL
```
ID:        quality-lab
ShortName: QualityAI
Priority:  CRITICAL
Status:    active
```

**Scope:** Ensures all cement products (OPC 43, OPC 53, PPC, PSC, SRPC) meet BIS/ASTM/EN standards through continuous test interpretation and rapid corrective action.

**What the LLM is told to do:**
- Interpret Blaine fineness, setting time, soundness, 3d/7d/28d compressive strength
- Correlate lab results with kiln process parameters
- Recommend grinding adjustments (Blaine, mill speed, separator speed)
- Initiate NCR process for off-spec product
- Predict 28-day strength from 3-day or 7-day results using regression logic

**Standards in system prompt:** OPC 43 ≥43 MPa, OPC 53 ≥53 MPa, PPC ≥33 MPa (IS codes: IS 8112, IS 12269, IS 1489, IS 455)

---

#### 10. Energy Management Agent
```
ID:        energy-management
ShortName: EnergyAI
Priority:  HIGH
Status:    active
```

**Scope:** Minimizes energy cost per tonne of cement across all plant systems — kiln (thermal), raw mill, cement mill, fans (electrical), and alternative fuel (AFR) substitution.

**What the LLM is told to do:**
- Recommend load shifting to avoid peak tariff windows
- Calculate savings from increasing AFR (Alternative Fuel Rate) / TSR (Thermal Substitution Rate)
- Flag motors with abnormal power consumption (health indicator)
- Optimize power factor (target >0.95)
- Provide daily energy cost per tonne breakdown

**KPIs in prompt:** Specific Electrical Energy <80 kWh/t, Specific Thermal Energy <720 kcal/kg clinker, AFR substitution rate target >20%

---

#### 11. Predictive Maintenance Agent
```
ID:        predictive-maintenance
ShortName: MaintAI
Priority:  HIGH
Status:    active
```

**Scope:** Prevents unplanned downtime across all major equipment — kiln tyres, gear & pinion, cement mills, raw mill VRM, bag filters, ID fans, conveyors — using vibration, temperature, oil, and current signature data.

**What the LLM is told to do:**
- Prioritize alerts by failure probability × consequence severity (risk matrix)
- Recommend inspection tasks with estimated time window required
- Calculate cost of planned vs. unplanned failure
- Trigger spare parts procurement when critical stock below minimum

**Alert thresholds injected:** Bearing vibration Warning >7 mm/s / Critical >11 mm/s (ISO 10816); Bearing temp Warning >80°C / Critical >95°C; Kiln shell Alert >350°C (red spot)

---

#### 12. Emission Control Agent
```
ID:        emission-control
ShortName: EmissionAI
Priority:  HIGH
Status:    active
```

**Scope:** Monitors CEMS (Continuous Emission Monitoring System) — particulate matter, NOₓ, SO₂, CO, mercury — and controls SNCR, bag filters, and fuel blend to stay within regulatory consents.

**What the LLM is told to do:**
- Alert when any parameter exceeds 80% of permit limit
- Recommend fuel blend adjustments to control NOₓ
- Schedule bag filter pulse cleaning cycles
- Calculate daily/monthly emission loads for CPCB/regulatory reporting
- Track Scope 1 and Scope 2 CO₂ for ESG reporting

**Regulatory limits injected:** PM <30 mg/Nm³, NOₓ <600 mg/Nm³, SO₂ <200 mg/Nm³, CO <1000 mg/Nm³, Mercury <0.05 mg/Nm³

---

### 🟡 PHASE 4 — INVENTORY (4 Agents)
> Phase color: `#F59E0B`

---

#### 13. Silo Management Agent
```
ID:        silo-management
ShortName: SiloAI
Priority:  HIGH
Status:    active
```

**Scope:** Manages 6 cement silos (total 23,000t capacity) — real-time level monitoring, product segregation, FIFO rotation, grade allocation, and overfill/stockout prevention.

**What the LLM is told to do:**
- Track stock by grade: OPC 53, OPC 43, PPC (General), PPC (Infrastructure), PSC, SRPC
- Enforce FIFO dispatch to prevent cement aging
- Coordinate silo changeover with grinding mill product changes
- Alert when approaching minimum level (triggers accelerated grinding)
- Prevent cross-contamination during grade transitions

---

#### 14. Bulk Dispatch Agent
```
ID:        bulk-dispatch
ShortName: DispatchAI
Priority:  HIGH
Status:    active
```

**Scope:** Maximizes bulk tanker truck throughput at 6 loading spouts, 2 weighbridges — managing queue, bay allocation, loading accuracy, and turnaround time (TAT).

**What the LLM is told to do:**
- Sequence truck queue for minimum TAT (target <45 min gate-to-gate)
- Allocate loading bays based on grade and flow capacity
- Flag loading variance >±0.1% of order quantity
- Monitor document generation: weighment slip, delivery challan, e-way bill

**KPIs:** TAT target <45 min, Loading accuracy ±0.1%, Trucks dispatched/hr target >12

---

#### 15. Stock Replenishment Agent
```
ID:        stock-replenishment
ShortName: ReplenishAI
Priority:  MEDIUM
Status:    idle
```

**Scope:** Manages reorder points and safety stock for raw materials, packaging, finished goods, and critical spares using EOQ and service-level calculations.

**What the LLM is told to do:**
- Calculate ROP = Avg daily usage × Lead time + Safety stock
- Safety stock formula: Z × σ_demand × √(lead time) [95% service level = Z=1.65]
- Trigger procurement orders for items below ROP
- Optimize Economic Order Quantity (EOQ) to minimize holding + ordering costs

---

#### 16. Bagging Control Agent
```
ID:        bagging-control
ShortName: BaggingAI
Priority:  MEDIUM
Status:    active
```

**Scope:** Manages cement packing lines (3 × HAVER rotary packers, 2,400 bags/hr each), weight compliance (Legal Metrology Act), and bag dispatch to dealer and project channels.

**What the LLM is told to do:**
- Monitor packing line efficiency and identify stoppages
- Flag weight compliance issues (50kg ±tolerance — short weight is a legal violation)
- Optimize production prioritization by grade and channel demand
- Calculate packing cost per bag

**Weight target:** 50.1–50.3kg average (declared 50kg — minimize giveaway while staying legal)

---

### 🟠 PHASE 5 — RMX OPERATIONS (5 Agents)
> Phase color: `#F97316`

---

#### 17. Batch Controller Agent ⚠️ CRITICAL
```
ID:        batch-controller
ShortName: BatchAI
Priority:  CRITICAL
Status:    active
```

**Scope:** Controls the RMX plant batching sequence — twin-shaft mixer (3 m³/batch), 6 aggregate bins, 3 cement silos, SCM hoppers, admixture dispensers.

**What the LLM is told to do:**
- Report current batch queue and estimated completion times
- Flag material bin low-level alarms
- Identify batches needing mix corrections (aggregate moisture water adjustments)
- Calculate plant throughput (m³/hr) and project day's total

**Batching accuracy targets (IS/EN 206):** Cement ±2%, Water ±1%, Admixtures ±3%, Aggregates ±3%

**Mix sequence injected:** Aggregate charging → Dry blend (15s) → Cement + SCM → Water + admixtures → Wet mixing (60–90s) → Discharge

---

#### 18. Mix Design Agent ⚠️ CRITICAL
```
ID:        mix-design
ShortName: MixAI
Priority:  CRITICAL
Status:    active
```

**Scope:** Develops and optimizes concrete mix designs for all grades (M10–M80, SCC, Shotcrete, RCC, Pervious, Lightweight) using Abrams' law strength relationships.

**What the LLM is told to do:**
- Recommend mix adjustments when aggregate test results change (gradation, moisture, SG)
- Calculate cost per m³ for each mix variant
- Flag mixes approaching code minimums (max w/c ratio, min cement content)
- Optimize SCM substitution (fly ash max 35%, GGBS max 70%, silica fume max 10%)

**Design parameters injected:** w/c 0.30–0.65, cement 250–550 kg/m³, slump 25–175mm, strength via Abrams' f'c ≈ A/(B^(w/c))

---

#### 19. Plant Scheduler Agent
```
ID:        plant-scheduler
ShortName: SchedulerAI
Priority:  HIGH
Status:    active
```

**Scope:** Optimizes the daily RMX production schedule across plant capacity (80–100 m³/hr), 12 drum trucks, 25km delivery radius, concrete workability windows, and pour schedules.

**What the LLM is told to do:**
- Synchronize batching to truck arrival (avoid waiting concrete)
- Cluster deliveries geographically to minimize dead-running
- Reserve 10–15% capacity buffer for emergency orders
- Flag orders at risk of exceeding workability window

**Concrete time constraint:** 90 minutes from batching (standard), up to 3 hours with retarder

---

#### 20. Water/Admixture Agent
```
ID:        water-admixture
ShortName: AdmixAI
Priority:  HIGH
Status:    active
```

**Scope:** Manages real-time aggregate moisture corrections and admixture dosing to maintain precise w/c ratios and target workability across changing environmental conditions.

**What the LLM is told to do:**
- Report microwave moisture sensor readings from all aggregate bins
- Calculate free water adjustment per batch (surface moisture correction)
- Recommend admixture dosage adjustments for weather and haul distance
- Flag abnormal moisture variations (bin contamination indicator)

**Critical formula in prompt:** Total water = Free water in mix design + Water from aggregates (above SSD) − Water absorbed (below SSD)

---

#### 21. Drum Washout Agent
```
ID:        drum-washout
ShortName: WashoutAI
Priority:  MEDIUM
Status:    idle
```

**Scope:** Manages drum cleaning, water reclamation (>90% target), return concrete handling, and environmental compliance for washout effluent.

**What the LLM is told to do:**
- Schedule washout windows between deliveries to maximize truck availability
- Flag trucks with excessive washout consumption (potential drum/seal issues)
- Recommend reclaimed water usage based on chloride and alkali content
- Manage return concrete options: reuse for site blocks, retarder extension, or reject

**Environmental compliance:** Washout effluent pH must be <9.0 before drain (neutralization required)

---

### 🟣 PHASE 6 — SALES & CRM (4 Agents)
> Phase color: `#7C3AED`

---

#### 22. Order Intake Agent
```
ID:        order-intake
ShortName: OrderAI
Priority:  HIGH
Status:    active
```

**Scope:** Processes multi-channel orders (portal, WhatsApp Business API, phone, EDI, email) for both cement and RMX, validating specs and running real-time credit checks.

**What the LLM is told to do:**
- Validate cement orders: grade, quantity, delivery, pack type, credit limit
- Validate RMX orders: grade, slump, pour volume, pump requirement, site access, timing
- Block new orders if account overdue >30 days and >5% of credit limit
- Confirm back to customer with delivery schedule and flag any spec concerns

---

#### 23. Pricing Engine Agent
```
ID:        pricing-engine
ShortName: PricingAI
Priority:  HIGH
Status:    active
```

**Scope:** Dynamic pricing optimization balancing cost floor, market ceiling, competitor intelligence, customer value, and volume/payment term discounts.

**What the LLM is told to do:**
- Provide specific price recommendations with full margin calculation
- Authorize or escalate discount requests with required business justification
- Apply grade premiums (OPC 53 typically 8–15% over OPC 43)
- Apply RMX surcharges: distance >15km, pump hire, small orders <5m³, night shift, urgent (<4 hours)
- Flag customer accounts with deteriorating margin trend

**Pricing season note in prompt:** Oct–Mar = pricing power (construction season); Jun–Sep monsoon = competitive market

---

#### 24. CRM & Retention Agent
```
ID:        crm-retention
ShortName: CRMAI
Priority:  MEDIUM
Status:    active
```

**Scope:** Manages 847 active customers across four segments (Key Accounts, Strategic, Transactional, At-Risk), runs churn prediction, tracks NPS, and drives retention actions.

**What the LLM is told to do:**
- Identify the top 10 customers at highest churn risk with specific behavioral signals
- Recommend tailored retention actions per customer segment
- Closed-loop NPS: Detractors (0–6 score) get callback within 24 hours
- Track competitor win/loss reasons
- Calculate Customer Lifetime Value (CLV) and prioritize actions accordingly

**Churn signals in prompt:** Purchase frequency −20%, declining order size, payment delays, contact frequency drop >30 days

---

#### 25. Credit Risk Agent
```
ID:        credit-risk
ShortName: CreditAI
Priority:  HIGH
Status:    active
```

**Scope:** Manages $8–15M in accounts receivable — credit scoring, limit management, collections escalation, and DSO optimization across a tiered risk framework.

**What the LLM is told to do:**
- Apply risk tiers: Green (score 75–100, 60-day credit), Yellow (50–74, 30-day), Red (25–49, cash/BG), Black (no supply)
- Follow collections matrix: Day 1 → SMS, Day 7 → call, Day 15 → credit hold, Day 30 → legal notice, Day 60 → legal proceedings
- Approve or escalate credit limit change requests
- Calculate DSO = (AR / Revenue) × Days — target <35 days

---

### 🔴 PHASE 7 — DELIVERY (4 Agents)
> Phase color: `#EF4444`

---

#### 26. Route Optimization Agent ⚠️ CRITICAL
```
ID:        route-optimization
ShortName: RouteAI
Priority:  CRITICAL
Status:    active
```

**Scope:** Real-time route planning for the full fleet (12 RMX drum trucks, 25 cement bulk tankers, 15 bag trucks, 4 pump trucks) with concrete workability window enforcement.

**What the LLM is told to do:**
- Provide specific routes with estimated transit times
- Flag any RMX deliveries at risk of workability window breach (90 min from batching)
- Adjust recommended sequence when traffic conditions change
- Calculate dead-running and suggest return load opportunities
- Account for bridge weight limits, restricted zones, and site access constraints

**Temperature rule in prompt:** Ambient temp >35°C → workability window reduces to 60 min

---

#### 27. Fleet Telematics Agent
```
ID:        fleet-telematics
ShortName: TelematicsAI
Priority:  HIGH
Status:    active
```

**Scope:** Monitors all fleet data in real time — GPS (30-second updates), speed, engine diagnostics, fuel levels, driver behavior scores (1–100), drum rotation, door sensors.

**What the LLM is told to do:**
- Report current fleet status with any active alerts
- Flag driver safety events: speeding >80 km/h loaded, harsh braking >0.4g, idling >10 min
- Calculate fuel consumption and identify fuel theft risks (flow vs. level discrepancy)
- Alert when RMX truck approaches 80 min since batching while still en route

**Driver score breakdown:** Speed compliance 30 pts, Harsh events 30 pts, Idling 20 pts, Route adherence 20 pts

---

#### 28. Drum Speed Control Agent
```
ID:        drum-speed
ShortName: DrumAI
Priority:  HIGH
Status:    active
```

**Scope:** Monitors drum RPM for all active RMX trucks — enforcing agitation mode during transit (2–4 RPM), tracking revolution counts, detecting slump loss, and flagging suspicious water additions.

**What the LLM is told to do:**
- Report time-remaining for workability window for each active truck
- Alert on trucks approaching drum revolution limit (warning at 250, limit at 300 revolutions)
- Flag suspicious drum activity: truck stopped + high RPM = suspected illicit water addition
- Recommend return-to-base decisions for loads exceeding workability limits

**Drum modes:** Mixing 12–14 RPM, Transit agitation 2–4 RPM, Discharge 10–14 RPM

---

#### 29. POD Capture Agent
```
ID:        pod-capture
ShortName: PODAI
Priority:  MEDIUM
Status:    active
```

**Scope:** Digital proof of delivery — GPS-stamped confirmation, e-signatures, delivery photos, concrete delivery tickets, and invoice triggering within 2 hours of confirmed POD.

**What the LLM is told to do:**
- Flag deliveries with quantity variance >±3%
- Identify unconfirmed deliveries (driver non-compliance)
- Report invoice backlog
- Manage disputes with evidence: photo for quantity, batch record for quality, GPS timestamp for timing

---

### 🟡 PHASE 8 — FINANCE & ESG (3 Agents)
> Phase color: `#EAB308`

---

#### 30. Revenue Cycle Agent
```
ID:        revenue-cycle
ShortName: RevenueAI
Priority:  HIGH
Status:    active
```

**Scope:** Automates the full order-to-cash cycle — auto-invoicing from POD, multi-channel invoice delivery, cash application, reconciliation, and revenue recognition.

**What the LLM is told to do:**
- Report today's cash collections vs. forecast
- Identify invoices at risk of becoming overdue
- Calculate monthly revenue recognition schedule
- Flag unusual patterns: large credits, unexplained adjustments

**Collections timeline:** Day 0 invoice + payment link, Day 25 pre-due reminder, Day 30 due date, Day 35 interest calc, Day 40 credit agent escalation, Day 60 legal notice

---

#### 31. Cost Analytics Agent
```
ID:        cost-analytics
ShortName: CostAI
Priority:  MEDIUM
Status:    active
```

**Scope:** Real-time cost intelligence for cement (cost/tonne) and RMX (cost/m³) — tracking actuals vs. budget, variance by category, and cost driver analysis.

**What the LLM is told to do:**
- Provide WTD and MTD cost vs. budget breakdowns
- Identify top 3 cost overrun areas with root cause
- Calculate impact of input price changes: "+$10/t pet coke impact on total cost/t cement"
- Recommend specific cost reduction actions with quantified savings potential

**Cost structure injected:** Cement — energy 30–40% (largest), raw materials 25–35%, maintenance 8–12%; RMX — cement 35–45%, aggregates 20–30%, delivery 10–15%

---

#### 32. Compliance & ESG Agent
```
ID:        compliance-esg
ShortName: ComplianceAI
Priority:  HIGH
Status:    active
```

**Scope:** Manages all regulatory compliance (environmental, mines, labour, finance, product, transport) and ESG reporting (GRI/TCFD framework, Scope 1/2/3 CO₂, water intensity, safety, biodiversity).

**What the LLM is told to do:**
- Report compliance calendar: upcoming filing deadlines, permit renewals, audits
- Provide ESG scorecard vs. targets and global benchmarks
- Flag compliance gaps requiring immediate action
- Calculate progress toward net-zero pathway

**CO₂ formula injected:** Net CO₂/t cement = (Clinker × process CO₂ + fuel CO₂) / (Clinker + SCM + filler). Process CO₂ = 0.507 kg/kg clinker (stoichiometric from calcination)

---

## 6. LLM Call Flow — Streaming vs Non-Streaming

### Individual Agent Chat (Streaming)
```typescript
// src/app/api/agents/[agentId]/route.ts
export const runtime = 'edge';   // Runs on Vercel Edge (V8 isolates globally)

const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of streamLLM(llmMessages)) {
      // Each chunk is one token (word fragment)
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ content: chunk })}\n\n`
      ));
    }
    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
    controller.close();
  },
});

return new NextResponse(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  },
});
```

### Orchestrator (Parallel Non-Streaming)
```typescript
// src/app/api/orchestrator/route.ts
const agentQueryPromises = selectedAgentIds.slice(0, 5).map(async (agentId) => {
  // callLLM() is non-streaming — returns full response as Promise
  const response = await callLLM([
    { role: 'system', content: agentSystemPrompt + ' BRIEF MODE: 100-150 words' },
    { role: 'user', content: query },
  ]);
  return { agentId, agentName, phase, response: response.content };
});

// All agents queried simultaneously
const agentResults = await Promise.all(agentQueryPromises);

// Then ONE synthesis call (also non-streaming)
const synthesis = await callLLM([
  { role: 'system', content: synthesisPrompt },
  { role: 'user', content: 'Synthesize the agent responses.' },
]);
```

---

## 7. Dependencies & Packages Used

### From `package.json` (actual file)

```json
{
  "dependencies": {
    "next": "14.2.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "ai": "^3.3.0",
    "@ai-sdk/openai": "^0.0.36",
    "openai": "^4.55.0",
    "groq-sdk": "^0.7.0",
    "zod": "^3.23.8",
    "lucide-react": "^0.436.0",
    "recharts": "^2.12.7",
    "framer-motion": "^11.3.31",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2",
    "date-fns": "^3.6.0",
    "uuid": "^10.0.0"
  }
}
```

### Key Package Notes

| Package | Version | What It Does in This Project |
|---|---|---|
| `groq-sdk` | 0.7.0 | Groq API SDK (installed but the project uses native `fetch` to call Groq directly — more compatible with Edge runtime) |
| `openai` | 4.55.0 | OpenAI SDK (installed but also used via native `fetch`) |
| `ai` | 3.3.0 | Vercel AI SDK (installed, provides helpers but LLM calls in `llm.ts` use raw fetch) |
| `@ai-sdk/openai` | 0.0.36 | OpenAI adapter for Vercel AI SDK |
| `recharts` | 2.12.7 | React SVG charts for Kiln 24h trend visualization |
| `framer-motion` | 11.3.31 | Animation library for card hover effects and transitions |
| `zod` | 3.23.8 | TypeScript schema validation (request body validation) |

> **Important architectural note:** Despite `groq-sdk` and `ai` being in `package.json`, the actual LLM calls in `src/lib/llm.ts` use **native `fetch()`** directly against both the Groq and OpenAI REST APIs. This was a deliberate choice for compatibility with **Vercel Edge Runtime** (which runs on V8 isolates, not Node.js, so Node-specific SDK features may not work).

---

## Summary — Key Architecture Facts

| Fact | Detail |
|---|---|
| **LLM models** | Primary: Groq LLaMA 3.1 70B (`llama-3.1-70b-versatile`). Fallback: OpenAI GPT-4o-mini |
| **Agent count** | 32 agents across 8 supply chain phases |
| **Critical agents** | 4: `kiln-optimization`, `quality-lab`, `batch-controller`, `route-optimization` |
| **Agent framework** | None — fully custom (no LangChain, no LangGraph, no AutoGen) |
| **Streaming** | Server-Sent Events (SSE) via native `ReadableStream` on Vercel Edge |
| **Orchestration** | Custom `Promise.all()` parallelism + 1 synthesis LLM call = 5 total LLM calls |
| **Agent memory** | In-session only (last 10 turns in React state, no database) |
| **LLM call method** | Native `fetch()` — NOT SDK methods, for Edge Runtime compatibility |
| **Plant data** | Simulated by default (`DEMO_MODE=true`); replace `getSimulatedPlantData()` for production |
| **Deployment** | Vercel Edge Functions (`export const runtime = 'edge'`), 60s max duration |
| **API key config** | `GROQ_API_KEY` (required), `OPENAI_API_KEY` (optional fallback), switchable via env vars |

---

*Generated from source code inspection of `cement_rmx_ai_agents.zip`*  
*Files read: `src/lib/llm.ts` · `src/lib/agents-registry.ts` · `src/app/api/agents/[agentId]/route.ts` · `src/app/api/orchestrator/route.ts` · `src/types/agents.ts` · `package.json`*
