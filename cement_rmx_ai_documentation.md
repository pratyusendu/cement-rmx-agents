# 🏭 Cement & RMX Supply Chain — AI Multi-Agent System
## Complete Technical Documentation

> **Version:** 1.0 · **Date:** February 2026  
> **Stack:** Next.js 14 · TypeScript · Groq LLaMA 3.1 70B · Vercel Edge  
> **Classification:** Internal Use Only

---

## 📋 Table of Contents

| # | Section |
|---|---------|
| [1](#part-1--frequently-asked-questions) | Frequently Asked Questions (30 Q&As) |
| [2](#part-2--system-design--architecture) | System Design & Architecture |
| [3](#part-3--user-manual) | User Manual |
| [4](#part-4--agent-reference-guide) | Agent Reference Guide (All 32 Agents) |
| [5](#part-5--orchestrator-step-by-step-guide) | Orchestrator Step-by-Step Guide |
| [6](#part-6--administrator-manual) | Administrator Manual |
| [7](#part-7--api-reference) | API Reference |
| [8](#part-8--troubleshooting-guide) | Troubleshooting Guide |

---

# Part 1 — Frequently Asked Questions

---

### Q1. What is the Cement & RMX Supply Chain AI Multi-Agent System?

It is a web-based command center featuring **32 specialized AI agents** that automate and assist with every process in the cement manufacturing and ready-mix concrete (RMX) supply chain — from limestone quarrying through to customer delivery and financial reconciliation.

Each agent is a domain expert powered by a Large Language Model (LLM) and given a detailed system prompt that encodes deep industry knowledge including IS/ASTM standards, process chemistry, equipment specifications, and KPI thresholds.

---

### Q2. How many agents are there and what do they cover?

There are exactly **32 specialized agents** organized across **8 supply chain phases**:

| Phase | Name | Agents | Count |
|-------|------|--------|-------|
| **Phase 1** | Procurement | Supplier Intelligence, Price Forecasting, Contract Management, Demand Signal | 4 |
| **Phase 2** | Mining & Quarrying | Geological Survey, Blast Planning, Equipment Utilization | 3 |
| **Phase 3** | Manufacturing | Kiln Optimization ⚠️, Quality Lab ⚠️, Energy Management, Predictive Maintenance, Emission Control | 5 |
| **Phase 4** | Inventory | Silo Management, Bulk Dispatch, Stock Replenishment, Bagging Control | 4 |
| **Phase 5** | RMX Operations | Batch Controller ⚠️, Mix Design ⚠️, Plant Scheduler, Water/Admixture, Drum Washout | 5 |
| **Phase 6** | Sales & CRM | Order Intake, Pricing Engine, CRM & Retention, Credit Risk | 4 |
| **Phase 7** | Delivery | Route Optimization ⚠️, Fleet Telematics, Drum Speed Control, POD Capture | 4 |
| **Phase 8** | Finance & ESG | Revenue Cycle, Cost Analytics, Compliance & ESG | 3 |

> ⚠️ = CRITICAL priority agent

---

### Q3. Which LLM powers the agents?

By default, the system uses **Groq LLaMA 3.1 70B Versatile** as the primary LLM.

- **Why Groq?** Free API tier, ultra-fast inference (<2 seconds), excellent reasoning
- **Fallback:** OpenAI GPT-4o-mini (activated automatically if Groq fails)
- **Configurable:** Switch model via environment variables — no code changes needed

---

### Q4. Is the LLM API free to use?

**Yes**, for development and moderate production use:

| Provider | Cost | Rate Limits | Best For |
|----------|------|-------------|---------|
| Groq (LLaMA 3.1 70B) | **Free** | Thousands of requests/day | Default — development & production |
| Groq (Paid) | Usage-based | Unlimited | High-volume production |
| OpenAI GPT-4o-mini | ~$0.15 / 1M tokens | Generous | Fallback only |
| Ollama (self-hosted) | **Free** | Hardware-limited | Air-gapped / offline deployments |

---

### Q5. How does an individual agent receive context about the plant?

Every agent receives **two context sources** on every request:

1. **Domain System Prompt** — A detailed role definition encoding industry knowledge (stored in `agents-registry.ts`). This includes IS/ASTM codes, equipment parameters, and alert thresholds.
2. **Live Plant Data** — Real-time sensor readings injected into every system prompt: kiln temperature, production rate, OEE, silo levels, active orders, fleet status, CO₂ intensity, and daily revenue. Refreshes every 30 seconds.

---

### Q6. What is the Orchestrator and how is it different from individual agents?

The **Orchestrator** is a meta-agent that coordinates multiple domain agents simultaneously to answer cross-functional questions.

| Feature | Individual Agent Chat | Orchestrator |
|---------|----------------------|--------------|
| Agents involved | 1 | 3–5 (auto-selected) |
| Response time | 1–3 seconds | 5–15 seconds |
| Best for | Deep domain questions | Strategic, cross-functional insight |
| Output | Single expert response | Per-agent responses + unified synthesis |
| Use case example | "What is the kiln free lime?" | "What supply chain risks do we face today?" |

---

### Q7. How does agent auto-selection in the Orchestrator work?

The Orchestrator uses a **keyword-scoring algorithm**:

```
1. Scan user query for domain keywords
2. Each keyword match → +2 points to matching agent
3. CRITICAL-priority agents receive +1 bonus point
4. Top 4 highest-scoring agents are selected
5. If no matches → fallback to: Kiln, Quality Lab, Batch Controller, Route Optimization
```

**Example:** Query "RMX batch quality problem with truck scheduling" scores:
- `batch-controller` → +4 pts (+ 1 critical bonus) = 5 ✓ Selected
- `quality-lab` → +2 pts (+ 1 critical bonus) = 3 ✓ Selected
- `route-optimization` → +2 pts (+ 1 critical bonus) = 3 ✓ Selected
- `mix-design` → +2 pts (+ 1 critical bonus) = 3 ✓ Selected

---

### Q8. Is the plant data real or simulated?

By **default** (`DEMO_MODE=true`), the system generates **realistic simulated sensor data** using `plant-simulator.ts`.

The simulation produces time-of-day-correlated readings:
- Kiln temperature oscillates around 1450°C ± 15°C with random noise
- Production rate peaks mid-morning and mid-afternoon
- Silo levels fluctuate with dispatch cycles
- Fleet activity mirrors business hours (07:00–17:00)

**For production:** Replace `getSimulatedPlantData()` in `plant-simulator.ts` with a real OPC-UA, SCADA API, or OSIsoft PI historian integration. See [Admin Manual §6.5](#65-connecting-real-plant-data).

---

### Q9. How does streaming work — why do responses appear word by word?

Responses stream using **Server-Sent Events (SSE)**:

```
Browser → POST /api/agents/{agentId}
       ← data: {"content": "The "}
       ← data: {"content": "kiln "}
       ← data: {"content": "temperature "}
       ← ... (one token per SSE event)
       ← data: [DONE]
```

This eliminates waiting for the full LLM response — words appear as they are generated, creating a real-time expert consultation experience.

---

### Q10. How do I deploy this on Vercel?

**Three steps, ~3 minutes total:**

```bash
# Step 1: Push to GitHub (ensure .env.local is in .gitignore)
git push origin main

# Step 2: Import at vercel.com/new
# Step 3: Add environment variable
GROQ_API_KEY = gsk_your_key_here
```

Vercel auto-detects Next.js, deploys API routes as Edge Functions, provides global CDN, HTTPS, and auto-scaling — zero configuration required.

---

### Q11. What edge cases do agents handle?

Each agent's system prompt includes specific alert thresholds and escalation rules:

| Agent | Edge Case Handled |
|-------|------------------|
| Kiln Optimization | Rising free lime trend → immediate temperature correction protocol |
| Quality Lab | 28-day strength forecast below grade minimum → triggers NCR process |
| Credit Risk | Account >30 days overdue >5% limit → automatic new order block |
| Route Optimization | RMX truck approaching 90-minute workability window → driver alert |
| Batch Controller | Truck breakdown mid-sequence → automatic resequencing recommendation |
| Emission Control | Stack readings approaching CPCB limit → fuel blend adjustment |

---

### Q12. Can agents remember previous conversations?

| Scope | Memory Available |
|-------|----------------|
| **Within session** | ✅ Full history (last 10 messages sent to LLM as context) |
| **Across page refresh** | ❌ Conversation resets (stored in React state only) |
| **Across users** | ❌ Each session is independent by default |
| **With database** | ✅ Add Supabase + Prisma for persistent history |

---

### Q13. How do I add a new agent?

Add one entry to the `AGENTS` array in `src/lib/agents-registry.ts`:

```typescript
{
  id: 'your-agent-id',          // Unique URL-safe slug
  name: 'Your Agent Name',
  shortName: 'AgentAI',
  phase: 'manufacturing',        // One of the 8 phases
  priority: 'high',              // 'critical' | 'high' | 'medium'
  status: 'active',
  color: '#0891B2',              // Hex color for card
  icon: '🔧',                   // Emoji icon
  description: 'Brief description...',
  systemPrompt: `You are a specialist in...`, // Full domain prompt
  capabilities: ['Capability 1', 'Capability 2'],
  metrics: [{ label: 'KPI Name', value: '95%', trend: 'up' }],
}
```

The agent immediately appears in the dashboard with full chat capability — **no other code changes needed**.

---

### Q14. How do I connect real OPC-UA / SCADA data?

Replace `getSimulatedPlantData()` in `src/lib/plant-simulator.ts`:

```typescript
export async function getSimulatedPlantData(): Promise<PlantData> {
  // Option A: OPC-UA (npm install node-opcua)
  const kilnTemp = await opcuaSession.read({ nodeId: "ns=2;s=KilnBurningZone" });

  // Option B: SCADA REST API
  const sensors = await fetch("https://scada.plant.local/api/live").then(r => r.json());

  // Option C: OSIsoft PI Web API
  const pi = await fetch(`${PI_BASE}/streams/KilnTemp/value`).then(r => r.json());

  return {
    kilnTemp: sensors.kilnBurningZoneTemp,
    kilnTempTarget: 1450,
    productionRate: sensors.clinkerTpd,
    oee: sensors.oeePercent,
    // ... map all PlantData fields
  };
}
```

All 32 agents automatically receive the real data — no other changes required.

---

### Q15. What is the system prompt and why does it matter?

The system prompt is the **foundational instruction** given to the LLM before any user message. It is what transforms a generic chatbot into a specialized cement plant expert.

A well-crafted system prompt encodes:
- Agent identity and role boundaries
- Domain knowledge (IS codes, ASTM standards, process chemistry)
- Specific KPIs and alert thresholds to monitor
- Response format and escalation rules
- Plant context injection point (sensor readings appended dynamically)

All 32 system prompts in this application encode real cement and RMX industry knowledge reviewed against industry standards.

---

### Q16. How does the dashboard refresh?

```typescript
// In page.tsx
useEffect(() => {
  const fetchData = async () => {
    const res = await fetch('/api/plant-data');
    const data = await res.json();
    setPlantData(data.plantData);
    setAlerts(data.alerts);
    setTimeSeries(data.timeSeries);
  };

  fetchData(); // Initial load
  const interval = setInterval(fetchData, 30000); // Every 30 seconds
  return () => clearInterval(interval);
}, []);
```

The KPI strip, alert feed, and charts all update with each cycle without a page reload.

---

### Q17. What happens if the Groq API is rate-limited or unavailable?

The LLM client in `src/lib/llm.ts` implements **automatic fallback**:

```
1. Call Groq API
   ├── Success → Stream response to user
   └── Failure (429 rate limit, 5xx error, timeout)
       └── Retry with OpenAI GPT-4o-mini
           ├── Success → Stream response to user
           └── Failure → Show error message in chat UI
```

No user action required — the fallback is transparent.

---

### Q18. How does the Phase Filter work?

The Phase Filter is a **pure client-side filter** — no API call:

```typescript
const filteredAgents = selectedPhase === 'all'
  ? AGENTS
  : AGENTS.filter(agent => agent.phase === selectedPhase);
```

Clicking a phase button sets `selectedPhase` state → React re-renders the grid instantly.

---

### Q19. Is there authentication / login?

**Not in the base version** — open access by default (suitable for internal corporate networks or demos).

For production with external access, add **NextAuth.js** (supports Azure AD/Microsoft SSO, Google, email magic links). See [Admin Manual §6.6](#66-adding-authentication).

---

### Q20. How is the application structured?

```
Framework:     Next.js 14 App Router (React Server + Client Components)
API Runtime:   Vercel Edge Functions (V8 isolates, not Node.js — global low latency)
Styling:       Tailwind CSS utility classes
Charts:        Recharts (React-native SVG)
Type Safety:   TypeScript throughout
```

---

### Q21. What are the infrastructure requirements?

| Environment | Requirements |
|-------------|-------------|
| **Vercel deployment** | None — fully serverless, no servers to provision |
| **Local development** | Node.js 18+, 4GB RAM, any modern OS |
| **Self-hosted** | Any server running Node.js 18+ or Docker |
| **Database** | Not required in demo mode |

---

### Q22. Can multiple users chat with agents simultaneously?

**Yes.** Each browser session is fully independent. The API routes are stateless on the server — Vercel auto-scales Edge Functions globally.

> **Scaling note:** Under high concurrent load (100+ users), Groq free-tier rate limits may become a bottleneck. Implement a request queue or upgrade to Groq paid tiers for high-volume production.

---

### Q23. How do Quick Prompts work?

Quick Prompt buttons appear when a chat is newly opened (`messages.length <= 1`). They are phase-specific and designed to showcase the most valuable queries per agent:

```typescript
// Example: Manufacturing phase quick prompts
const QUICK_PROMPTS = {
  manufacturing: [
    "What is the current kiln heat consumption vs target?",
    "Analyze today's free lime trend and recommend action",
    "Which equipment is showing early failure signatures?",
  ]
}
```

Clicking a button calls `sendMessage(promptText)` directly — same as typing it.

---

### Q24. What payload does the Orchestrator API accept?

```json
POST /api/orchestrator
Content-Type: application/json

{
  "query": "What are the top 3 operational risks today?",
  "includeAgents": [              // Optional — if omitted, auto-selection runs
    "kiln-optimization",
    "quality-lab",
    "route-optimization",
    "credit-risk"
  ],
  "context": "We have a major pour tomorrow at site A"  // Optional
}
```

---

### Q25. How accurate are the agent responses?

Accuracy depends on:

1. **LLM quality** — LLaMA 3.1 70B is a state-of-the-art model with strong reasoning
2. **System prompt quality** — All 32 prompts encode real IS/ASTM standards and process knowledge
3. **Plant data quality** — Real sensor data produces more accurate contextual responses

> ⚠️ **Important:** For safety-critical decisions (structural concrete mix designs, blast patterns, equipment bypass), always have a qualified human expert review and approve agent recommendations. The system is an advisory tool, not a replacement for professional engineering judgment.

---

### Q26. Can I use Ollama (local LLM) instead of Groq?

Yes, with a small modification to `src/lib/llm.ts`:

```typescript
// Add to llm.ts:
async function ollamaLLM(messages: Message[]): Promise<string> {
  const res = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model: 'llama3.1:70b',  // Or llama3.1:8b for lower VRAM
      messages,
      stream: false,
    }),
  });
  const data = await res.json();
  return data.message.content;
}
```

Set `LLM_PROVIDER=ollama` in `.env.local`. Enables **fully offline, zero-cost** operation.

| Model | VRAM Required | Quality |
|-------|--------------|---------|
| llama3.1:70b | ~40 GB | Best |
| llama3.1:8b | ~6 GB | Good for most queries |
| mistral:7b | ~5 GB | Fast, lower quality |

---

### Q27. What monitoring and observability is built in?

| Built-in | Add for Production |
|---------|-------------------|
| Console error logging in all API routes | Sentry (`@sentry/nextjs`) |
| Vercel function logs & analytics | Datadog / New Relic via OpenTelemetry |
| Real-time alert feed on dashboard | Email/SMS alerting (Resend, SendGrid) |
| OEE / production KPI tracking | Custom metrics for agent response times |

---

### Q28. How does the Kiln Chart (24-hour trend) work?

```typescript
// /api/plant-data calls this:
function generateTimeSeries(baseValue: number, variance: number): DataPoint[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    time: `${String(hour).padStart(2, '0')}:00`,
    value: baseValue
      + Math.sin((hour / 24) * Math.PI * 2) * variance  // Sinusoidal base
      + (Math.random() - 0.5) * variance * 0.5,          // Random noise
  }));
}
```

The `KilnChart` component uses Recharts `LineChart` with:
- **Left Y-axis:** Kiln temperature (range 1380–1520°C)
- **Right Y-axis:** Production rate (range 2,500–3,800 t/d)
- **Reference line:** 1450°C target temperature

---

### Q29. What security considerations are important for production?

| Priority | Practice |
|----------|---------|
| 🔴 Critical | Never commit `.env.local` to version control |
| 🔴 Critical | Add authentication before any public-facing deployment |
| 🟠 High | Rate-limit all API routes (Vercel edge middleware) |
| 🟠 High | Validate all request bodies with Zod schema |
| 🟠 High | Use VPN or private network for SCADA/OT integration — never expose plant systems to internet |
| 🟡 Medium | Implement audit logs for all agent recommendations |
| 🟡 Medium | Add CORS restrictions in `vercel.json` for production domains |

---

### Q30. What is the recommended path to make this production-ready?

```
Priority Hardening Checklist:

CRITICAL (do before any external exposure)
  □ Add NextAuth.js authentication (Azure AD / Google SSO)
  □ Add Zod request body validation to all API routes
  □ Implement API rate limiting

HIGH (do before production go-live)
  □ Connect real plant sensor data (OPC-UA or SCADA API)
  □ Add Sentry error monitoring
  □ Set up database for conversation history (Supabase + Prisma)

MEDIUM (first month of operation)
  □ Implement user role management (manager / operator / viewer)
  □ Configure Vercel Analytics for usage tracking
  □ Add email/SMS alerting for critical threshold breaches
  □ Create audit log for all agent recommendations

ONGOING
  □ Quarterly system prompt review with domain experts
  □ Monthly load testing at expected peak concurrent users
```

---

# Part 2 — System Design & Architecture

---

## 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE NETWORK (Global CDN)                     │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    NEXT.JS 14 APPLICATION                            │   │
│  │                                                                      │   │
│  │  ┌──────────────────────┐    ┌──────────────────────────────────┐   │   │
│  │  │   FRONTEND (React)   │    │   BACKEND (Edge API Routes)      │   │   │
│  │  │                      │    │                                  │   │   │
│  │  │  • Dashboard (page)  │◄──►│  /api/agents/[agentId]           │   │   │
│  │  │  • 32 Agent Cards    │    │    └─ Streaming SSE chat         │   │   │
│  │  │  • Agent Chat UI     │    │                                  │   │   │
│  │  │  • Orchestrator UI   │    │  /api/orchestrator               │   │   │
│  │  │  • KPI Strip         │    │    └─ Multi-agent parallel       │   │   │
│  │  │  • Kiln Chart        │    │       query + synthesis          │   │   │
│  │  │  • Alert Feed        │    │                                  │   │   │
│  │  │  • Phase Filter      │    │  /api/plant-data                 │   │   │
│  │  └──────────────────────┘    │    └─ Sensor data (30s refresh)  │   │   │
│  │                              └──────────────┬───────────────────┘   │   │
│  └─────────────────────────────────────────────┼──────────────────────┘   │
│                                                 │                            │
└─────────────────────────────────────────────────┼────────────────────────────┘
                                                  │
          ┌───────────────────────────────────────┴─────────────────────────┐
          │                    EXTERNAL SERVICES                              │
          │                                                                    │
          │  ┌──────────────────────┐    ┌──────────────────────┐            │
          │  │  GROQ API (Primary)  │    │  OpenAI API (Fallback)│            │
          │  │  LLaMA 3.1 70B Free  │    │  GPT-4o-mini (Paid)   │            │
          │  └────────────┬─────────┘    └──────────┬────────────┘            │
          │               └──────────────┬───────────┘                         │
          │                              │ Streaming SSE / REST                 │
          │  ┌───────────────────────────┴──────────────────────────────────┐  │
          │  │                PLANT DATA LAYER (Optional)                    │  │
          │  │   OPC-UA  │  SCADA REST API  │  OSIsoft PI  │  Ignition      │  │
          │  └──────────────────────────────────────────────────────────────┘  │
          └────────────────────────────────────────────────────────────────────┘
```

---

## 2.2 File Structure & Component Map

```
src/
├── app/
│   ├── page.tsx                    ← Main dashboard (Client Component)
│   │   ├── imports: AgentCard, AgentChat, OrchestratorPanel
│   │   ├── imports: MetricCard, KilnChart, AlertFeed, PhaseFilter
│   │   └── fetches: /api/plant-data (30-second interval)
│   ├── layout.tsx                  ← Root layout + Google Fonts
│   ├── globals.css                 ← Industrial design system (custom scrollbars,
│   │                                 grid backgrounds, glow effects, animations)
│   └── api/
│       ├── agents/[agentId]/
│       │   └── route.ts            ← Individual agent SSE streaming chat
│       │       ├── imports: agents-registry.ts → getAgent()
│       │       ├── imports: llm.ts → streamLLM()
│       │       └── imports: plant-simulator.ts → getSimulatedPlantData()
│       ├── orchestrator/
│       │   └── route.ts            ← Multi-agent parallel coordination
│       │       ├── imports: agents-registry.ts → AGENTS, getAgent()
│       │       ├── imports: llm.ts → callLLM() (non-streaming for parallel)
│       │       └── auto-selects via keyword scoring algorithm
│       └── plant-data/
│           └── route.ts            ← Dashboard sensor data endpoint
│               └── imports: plant-simulator.ts → all simulation functions
│
├── components/
│   ├── agents/
│   │   ├── AgentCard.tsx           ← Grid card: status, priority badge, top metric
│   │   ├── AgentChat.tsx           ← Streaming chat drawer with quick prompts
│   │   └── OrchestratorPanel.tsx   ← Multi-agent query + synthesis display
│   └── dashboard/
│       ├── MetricCard.tsx          ← KPI tile with alert states & color coding
│       ├── KilnChart.tsx           ← Recharts dual-axis 24h trend chart
│       ├── AlertFeed.tsx           ← Real-time alert list with severity levels
│       └── PhaseFilter.tsx         ← Supply chain phase tab selector
│
├── lib/
│   ├── agents-registry.ts          ← ALL 32 agent definitions + system prompts
│   ├── llm.ts                      ← Groq/OpenAI client (streaming + sync modes)
│   └── plant-simulator.ts          ← Sensor simulation + plant context builder
│
└── types/
    └── agents.ts                   ← TypeScript interfaces (Agent, PlantData, etc.)
```

---

## 2.3 Data Flow — Single Agent Chat

```
USER TYPES MESSAGE IN BROWSER
│
▼
AgentChat.tsx
├─ Appends user message to messages[] state
├─ Sets isStreaming = true, shows typing indicator
└─ POST /api/agents/{agentId}
   Body: { messages: [...last 10 turns], plantData: {...} }
   │
   ▼
/api/agents/[agentId]/route.ts  (Vercel Edge Function)
├─ Looks up agent definition in AGENTS[] registry by ID
├─ Calls getSimulatedPlantData() → builds plant context string:
│    "LIVE PLANT STATUS: Kiln: 1450°C | Production: 3,200 t/d | OEE: 84%..."
├─ Constructs LLM message array:
│    [0] system: agent.systemPrompt + "\n\n" + plantContext + instructions
│    [1..n] user/assistant: last 10 conversation turns from request body
└─ Calls streamLLM(messages) from llm.ts
   │
   ▼
lib/llm.ts → streamLLM()
├─ POST https://api.groq.com/openai/v1/chat/completions
│    { stream: true, model: "llama-3.1-70b-versatile", messages }
└─ Returns AsyncGenerator<string> (one string per token)
   │
   ▼
Edge Function creates ReadableStream (Server-Sent Events)
├─ For each token chunk from Groq generator:
│    controller.enqueue(`data: {"content": "word "}\n\n`)
└─ On completion:
     controller.enqueue(`data: [DONE]\n\n`)
   │
   ▼
AgentChat.tsx reads SSE stream (fetch + ReadableStream API)
├─ Accumulates tokens → streamingContent state variable
├─ React re-renders on every token (word-by-word display)
└─ On [DONE]: finalizes message, appends to messages[], isStreaming = false
```

---

## 2.4 Data Flow — Orchestrator (Multi-Agent Coordination)

```
USER SUBMITS ORCHESTRATOR QUERY
│
▼
OrchestratorPanel.tsx
└─ POST /api/orchestrator
   Body: { query: "...", includeAgents?: [...] }
   │
   ▼
/api/orchestrator/route.ts

STEP 1: Get live plant data
   └─ getSimulatedPlantData() → plantData object

STEP 2: Agent Selection
   ├─ If includeAgents[] provided → use those IDs directly
   └─ Else → autoSelectAgents(query):
        • Tokenize query into words
        • Match words against each agent's keyword list
        • Score: +2 per keyword match, +1 for CRITICAL agents
        • Sort by score descending → take top 4

STEP 3: Parallel Agent Queries (Promise.all — all simultaneous)
   ├─ callLLM([system_kiln + plant, user: query]) ──────┐
   ├─ callLLM([system_quality + plant, user: query]) ───┤ → await all
   ├─ callLLM([system_batch + plant, user: query]) ─────┤   completes
   └─ callLLM([system_route + plant, user: query]) ─────┘

STEP 4: Synthesis LLM Call
   └─ callLLM([
        system: "You are the Orchestrator. Synthesize all agent responses...",
        user: "QUERY: {...} AGENT RESPONSES: [Kiln]: {...} [Quality]: {...}..."
      ])
      → Returns: UNIFIED INSIGHT + TOP 3 RECOMMENDATIONS + ALERTS

STEP 5: Return JSON Response
   └─ {
        query, plantData, agentResponses[], synthesis,
        agentsConsulted: 4, timestamp: "2026-02-20T09:15:32Z"
      }
   │
   ▼
OrchestratorPanel.tsx renders:
├─ Per-agent response cards (color-coded by phase)
└─ Unified synthesis block with recommendations
```

---

## 2.5 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js App Router | 14.x | Full-stack React with Edge support |
| Language | TypeScript | 5.x | Type safety across all code |
| Styling | Tailwind CSS | 3.x | Utility-first responsive design |
| Charts | Recharts | 2.x | React-native SVG charts |
| Primary LLM | Groq LLaMA 3.1 70B | Latest | Fast, free inference |
| Fallback LLM | OpenAI GPT-4o-mini | Latest | Backup when Groq unavailable |
| Streaming | Server-Sent Events | Native | Real-time token streaming |
| Deployment | Vercel Edge Functions | Latest | Serverless, global, zero-config |
| Fonts | JetBrains Mono, Rajdhani, Inter | Latest | Industrial UI typography |

---

# Part 3 — User Manual

---

## 3.1 Accessing the Application

1. Open your web browser (Chrome, Edge, Firefox, or Safari recommended)
2. Navigate to the application URL provided by your administrator
3. If authentication is configured, log in with your corporate credentials
4. The main dashboard loads automatically — no installation or plugins required

---

## 3.2 Dashboard Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│  NAVIGATION BAR                                              [LIVE]  │
│  🏭 CEMENT & RMX AI COMMAND    32 Active Agents  [🤖 ORCHESTRATOR]  │
├──────────────────────────────────────────────────────────────────────┤
│  KPI STRIP — 8 Metrics, auto-refreshes every 30 seconds              │
│  [🔥 Kiln Temp]  [⚙️ Production]  [📊 OEE]  [⚡ Energy]  [🏗️ Silo]│
│  [🌿 CO₂/t]      [📋 Orders]      [💰 Revenue]                      │
├─────────────────────────────────┬────────────────────────────────────┤
│  KILN 24H TREND CHART           │  LIVE ALERTS FEED                  │
│  Temperature + Production rate  │  🔴 CRITICAL: Message...           │
│                                 │  🟡 WARNING:  Message...           │
│                                 │  🔵 INFO:     Message...           │
├─────────────────────────────────┴────────────────────────────────────┤
│  PHASE FILTER: [ALL] [Procurement] [Mining] [Manufacturing] [...]    │
├──────────────────────────────────────────────────────────────────────┤
│  AGENT GRID — 32 cards, filterable by phase                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │🔥 KilnAI │  │🔬 QualAI │  │⚡ EnerAI │  │🔧 MaintAI│            │
│  │  ACTIVE  │  │  ACTIVE  │  │  ACTIVE  │  │  ACTIVE  │            │
│  │ 1450°C   │  │ 58.2 MPa │  │ 85 kWh/t │  │ 0.8% stp │            │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3.3 KPI Strip Reference

| Metric | Icon | Normal Range | What to Watch For |
|--------|------|-------------|-------------------|
| Kiln Temperature | 🔥 | 1430–1470°C | Any reading outside range → open Kiln Agent immediately |
| Production Rate | ⚙️ | 3,000–3,500 t/d | Below 2,800 → investigate with Kiln + Maintenance Agents |
| OEE | 📊 | >80% | Below 75% → Predictive Maintenance Agent for root cause |
| Energy | ⚡ | <90 kWh/t | Rising trend over 3 days → Energy Agent for analysis |
| Silo Stock | 🏗️ | >25,000 t | Below 20,000 → Silo Management + Stock Replenishment Agents |
| CO₂ Intensity | 🌿 | <0.75 kg/kg | Approaching 0.75 → Emission Control Agent |
| Active Orders | 📋 | Varies by shift | Sudden spike → Order Intake + Batch Controller Agents |
| Daily Revenue | 💰 | Daily target | Significantly below run-rate → Revenue Cycle Agent |

---

## 3.4 Chatting with an Individual Agent

**Step-by-step:**

1. **Select an agent** — Click any card in the agent grid. The chat drawer opens from the bottom-right.
2. **Review live metrics** — The top of the chat shows the agent's current KPIs with live plant values.
3. **Use Quick Prompts** — On first open, 3 phase-specific quick prompts appear. Click any to start immediately.
4. **Type your question** — Enter your question in the input box and press `Enter` or click Send.
5. **Read the streaming response** — Words appear in real time as the AI generates the answer.
6. **Continue the conversation** — The agent remembers everything in the current session.
7. **Close the drawer** — Click `×` to close. Chat history is preserved in memory.

> 💡 **Tip:** Each agent is a domain expert. Asking the Kiln Agent about delivery routes will produce a brief answer and a redirect to the Route Optimization Agent.

---

## 3.5 Using the Orchestrator

The Orchestrator is for **strategic, cross-functional questions** requiring multiple expert perspectives simultaneously.

**Step-by-step:**

1. Click **🤖 ORCHESTRATOR** in the top navigation bar
2. Type your strategic question in the "Strategic Query" input
3. *(Optional)* Select specific agents to consult by clicking agent cards — or leave blank for auto-selection
4. Click **🚀 RUN ORCHESTRATION**
5. Wait 5–15 seconds while agents are queried in parallel
6. Review:
   - **Per-agent responses** (color-coded by phase) for domain-specific insights
   - **Synthesized recommendation** for the unified strategic view
   - **Top 3 actions** and any **critical alerts** identified

**Example orchestrator queries:**
```
"What are our top 3 operational risks for today's production shift?"

"We have a ₹50M infrastructure project concrete delivery starting Monday.
 What supply chain preparations should we make this week?"

"Our kiln has been sub-optimal for 3 days. What is the downstream impact
 on RMX quality, customer commitments, and month-end revenue?"

"Identify cost reduction opportunities across the supply chain for Q2."
```

---

# Part 4 — Agent Reference Guide

---

## Phase 1: Procurement Agents

### 🏭 Supplier Intelligence Agent

| Field | Details |
|-------|---------|
| **ID** | `supplier-intelligence` |
| **Priority** | HIGH |
| **Phase** | Procurement |

**Inputs:** Vendor delivery records, quality NCR history, price variance data, financial stability indicators

**Outputs:** Supplier scorecard (0–100), risk-flagged vendor list, alternate source recommendations, procurement action plan

**Sample Conversation:**

> **User:** Which of our limestone suppliers are currently at risk?
>
> **Agent:** Supplier XYZ shows a 23% late delivery rate in Q3 (up from 14% in Q2) and 2 quality NCRs in the last 60 days. Risk rating: HIGH. Recommended action: Issue a formal performance notice within 7 days and begin qualifying ABC Quarries as an alternate source. ABC's material assays match our LSF target of 96, and they can supply 800 t/day within 3 weeks of agreement.

---

### 📈 Price Forecasting Agent

| Field | Details |
|-------|---------|
| **ID** | `price-forecasting` |
| **Priority** | HIGH |
| **Phase** | Procurement |

**Inputs:** Commodity price indices (coal, gypsum, fly ash), freight rate trends, seasonal demand patterns, FX rates

**Outputs:** 90-day price forecast, procurement timing recommendations, hedging opportunities, budget variance alerts

---

### 📑 Contract Management Agent

| Field | Details |
|-------|---------|
| **ID** | `contract-management` |
| **Priority** | MEDIUM |
| **Phase** | Procurement |

**Inputs:** Active contract database, renewal dates, performance clauses, volume commitments

**Outputs:** Renewal alerts (90/60/30 days), performance clause breach alerts, renegotiation talking points, contract comparison analysis

---

### 📡 Demand Signal Agent

| Field | Details |
|-------|---------|
| **ID** | `demand-signal` |
| **Priority** | HIGH |
| **Phase** | Procurement |

**Inputs:** Order pipeline, project tracker, seasonal indices, construction permit data

**Outputs:** 30/60/90-day demand forecast, procurement quantity recommendations, capacity pre-booking alerts

---

## Phase 2: Mining & Quarrying Agents

### 🪨 Geological Survey Agent

| Field | Details |
|-------|---------|
| **ID** | `geological-survey` |
| **Priority** | HIGH |
| **Phase** | Mining |

**Inputs:** Drill core assay data, face mapping reports, GPS coordinates, reserve estimates

**Outputs:** Grade quality predictions, mining sequence recommendations, reserve depletion timeline, blending ratios for target chemistry

---

### 💥 Blast Planning Agent

| Field | Details |
|-------|---------|
| **ID** | `blast-planning` |
| **Priority** | HIGH |
| **Phase** | Mining |

**Inputs:** Rock type and hardness (RQD), face dimensions, explosive inventory, fragmentation targets

**Outputs:** Drill pattern design (burden, spacing, hole depth), explosive charge calculation, stemming specification, blast timing sequence

> ⚠️ All blast plans must be reviewed and approved by a licensed shot-firer before execution.

---

### ⛏️ Equipment Utilization Agent

| Field | Details |
|-------|---------|
| **ID** | `equipment-utilization` |
| **Priority** | MEDIUM |
| **Phase** | Mining |

**Inputs:** Excavator/dumper GPS tracking, load cycles per hour, fuel consumption, maintenance schedules

**Outputs:** Fleet utilization scorecard, truck matching optimization, idle time analysis, shift productivity comparison

---

## Phase 3: Manufacturing Agents (CRITICAL)

### 🔥 Kiln Optimization Agent ⚠️ CRITICAL

| Field | Details |
|-------|---------|
| **ID** | `kiln-optimization` |
| **Priority** | CRITICAL |
| **Phase** | Manufacturing |

**Inputs:** Burning zone temperature (°C), secondary air temperature, kiln feed rate (tph), fuel feed rate, raw mix chemistry (LSF/SR/AR), preheater exit gas temperature

**Outputs:** Temperature adjustment recommendation (°C), fuel rate change (tph), free lime prediction, heat consumption analysis (kcal/kg)

**Sample Conversation:**

> **User:** The kiln temp dropped to 1420°C and free lime is trending up to 2.1%. What do I do?
>
> **Agent:** Free lime at 2.1% confirms underfiring — immediate action required.
> 1. Increase pet coke feed rate by 1.5 tph (from 18.2 → 19.7 tph)
> 2. Check secondary air temperature — if below 820°C, increase cooler grate speed by 10%
> 3. Reduce kiln feed by 5% (210 → 200 tph) for 2 hours to allow burning zone recovery
>
> Target: Free lime below 1.5% within 4 hours. Monitor C4 exit gas temperature — should rise from 880°C to above 920°C confirming recovery.

---

### 🔬 Quality Lab Agent ⚠️ CRITICAL

| Field | Details |
|-------|---------|
| **ID** | `quality-lab` |
| **Priority** | CRITICAL |
| **Phase** | Manufacturing |

**Inputs:** Clinker analysis (free lime, C3S, C4AF), cement fineness (Blaine cm²/g), setting time, compressive strength (3d/7d/28d), SO₃ content

**Outputs:** Grade conformance decision, NCR trigger, mix design adjustment, strength forecast, regulatory sample schedule

---

### ⚡ Energy Management Agent

| Field | Details |
|-------|---------|
| **ID** | `energy-management` |
| **Priority** | HIGH |
| **Phase** | Manufacturing |

**Inputs:** Specific power consumption (kWh/t), demand charge peaks, compressed air pressure, motor load factors

**Outputs:** Load shifting recommendations, power factor improvement actions, motor efficiency ranking, monthly energy cost projection

---

### 🔧 Predictive Maintenance Agent

| Field | Details |
|-------|---------|
| **ID** | `predictive-maintenance` |
| **Priority** | HIGH |
| **Phase** | Manufacturing |

**Inputs:** Vibration spectra (mm/s), bearing temperatures (°C), oil analysis results, runtime hours since last PM

**Outputs:** Failure probability scores, maintenance priority ranking, parts pre-order recommendations, downtime impact forecast

---

### 🌿 Emission Control Agent

| Field | Details |
|-------|---------|
| **ID** | `emission-control` |
| **Priority** | HIGH |
| **Phase** | Manufacturing |

**Inputs:** CEMS data (PM, SO₂, NOₓ mg/Nm³), stack gas O₂%, AFR combustion mix, bag filter differential pressure

**Outputs:** Emission compliance status vs. CPCB/EU limits, fuel blend recommendation to reduce NOₓ, filter maintenance schedule, monthly compliance report data

---

## Phase 4: Inventory Agents

### 🏗️ Silo Management Agent

| Field | Details |
|-------|---------|
| **ID** | `silo-management` |
| **Priority** | HIGH |
| **Phase** | Inventory |

**Inputs:** Silo level sensors (% capacity per silo per grade), production rate, dispatch rate, silo allocation by grade

**Outputs:** Grade-level status map, low-stock alerts (< 25% trigger), silo routing for next batch, predicted stockout timeline

---

### 🚛 Bulk Dispatch Agent

| Field | Details |
|-------|---------|
| **ID** | `bulk-dispatch` |
| **Priority** | HIGH |
| **Phase** | Inventory |

**Inputs:** Bulk tanker queue, loading bay availability, weighbridge readings, grade assignments per vehicle

**Outputs:** Loading sequence, bay allocation, loading time estimates, DO generation status, weighbridge discrepancy alerts

---

## Phase 5: RMX Operations Agents (CRITICAL)

### ⚙️ Batch Controller Agent ⚠️ CRITICAL

| Field | Details |
|-------|---------|
| **ID** | `batch-controller` |
| **Priority** | CRITICAL |
| **Phase** | RMX Operations |

**Inputs:** Order queue (grade, volume m³, site), material bin levels (cement/aggregate/sand kg), truck availability, concrete mixer drum status

**Outputs:** Batch sequence plan, cycle time estimates, material alarm triggers (low bin), throughput projection (m³/hr)

**Sample Conversation:**

> **User:** 12 M30 batches pending and Truck 7 is delayed. How do I resequence?
>
> **Agent:** Resequence recommendation:
> - Batch 1–4 (Site A, 4×7m³): Trucks 1, 2, 3, 4 — depart 06:00–06:20
> - Batch 5–6 (Site B, 2×8m³): Hold for Truck 8 returning at 06:35 (GPS confirmed)
> - Batch 7–12 (Site C): Trucks 5, 6, 9, 10 — proceed as scheduled
>
> Net impact: Site B delayed 35 minutes. Notify site engineer now to adjust pour start. Plant throughput maintained at 76 m³/hr.

---

### 🧪 Mix Design Agent ⚠️ CRITICAL

| Field | Details |
|-------|---------|
| **ID** | `mix-design` |
| **Priority** | CRITICAL |
| **Phase** | RMX Operations |

**Inputs:** Grade required (M20–M80), exposure condition (XC1–XC4), max aggregate size, target workability (slump mm), available admixtures

**Outputs:** Mix proportion (kg/m³ per ingredient), w/c ratio, admixture dosage, expected 28-day strength, mix design record

---

### 📅 Plant Scheduler Agent

| Field | Details |
|-------|---------|
| **ID** | `plant-scheduler` |
| **Priority** | HIGH |
| **Phase** | RMX Operations |

**Inputs:** Order book (next 7 days), plant capacity (m³/hr), truck availability calendar, maintenance windows, site pour schedules

**Outputs:** Daily production plan, truck utilization forecast, capacity gap alerts, overtime requirement flags

---

## Phase 6: Sales & CRM Agents

### 💰 Pricing Engine Agent

| Field | Details |
|-------|---------|
| **ID** | `pricing-engine` |
| **Priority** | HIGH |
| **Phase** | Sales & CRM |

**Inputs:** Customer segment and history, volume and grade requested, delivery distance (km), competitor pricing data, raw material costs

**Outputs:** Recommended price (₹/m³ or ₹/t), margin calculation, discount authorization decision, competitor benchmark position

**Sample Conversation:**

> **User:** Customer ABC wants 500m³ M40 at ₹5,200/m³ with 10% discount. Standard rate ₹5,800. Should I approve?
>
> **Agent:** Cost floor for M40 is ₹4,680/m³. Requested price yields 11.1% margin — below the 18% minimum threshold.
>
> **Recommendation:** Counter-offer ₹5,450/m³ (6.0% discount, 14.1% margin). Customer ABC is B-tier, 36-month relationship, good payment record — a 6% volume discount is commercially justified. At ₹5,450 × 500m³ = ₹27.25L. Approve if customer accepts with no further negotiation.

---

### 🤝 CRM & Retention Agent

| Field | Details |
|-------|---------|
| **ID** | `crm-retention` |
| **Priority** | MEDIUM |
| **Phase** | Sales & CRM |

**Inputs:** Customer purchase frequency, volume trend (YoY), complaint history, last contact date, NPS score

**Outputs:** Churn risk score, retention action plan, upsell opportunity flags, visit priority list for sales team

---

### 🔒 Credit Risk Agent

| Field | Details |
|-------|---------|
| **ID** | `credit-risk` |
| **Priority** | HIGH |
| **Phase** | Sales & CRM |

**Inputs:** Outstanding balance, credit limit, days overdue, payment history (24 months), trade references

**Outputs:** Credit release decision (approve/hold/block), overdue escalation, credit limit revision recommendation, collection priority list

---

## Phase 7: Delivery Agents (CRITICAL)

### 🗺️ Route Optimization Agent ⚠️ CRITICAL

| Field | Details |
|-------|---------|
| **ID** | `route-optimization` |
| **Priority** | CRITICAL |
| **Phase** | Delivery |

**Inputs:** Truck GPS positions, site delivery addresses, batch timestamps, ambient temperature, traffic data

**Outputs:** Optimized route per truck, ETA to site, workability window remaining (minutes), delay alerts, rejection risk flags

**Sample Conversation:**

> **User:** Truck 5 was batched at 09:15, it's now 10:42, and it's 18km from site. Is the concrete at risk?
>
> **Agent:** 🔴 CRITICAL WORKABILITY RISK
>
> Truck 5: 87 minutes since batching. At 32°C ambient, workability window reduces to ~75 minutes. Concrete is NOW BEYOND standard window.
>
> Immediate actions:
> 1. Call site engineer — advise of delay, request workability test on arrival
> 2. If slump < 100mm on site, concrete must be rejected
> 3. Approved retarder (0.3% by cement weight) only with written site engineer authorization
> 4. Document all actions on delivery ticket
>
> Do NOT discharge without site approval.

---

### 📡 Fleet Telematics Agent

| Field | Details |
|-------|---------|
| **ID** | `fleet-telematics` |
| **Priority** | HIGH |
| **Phase** | Delivery |

**Inputs:** GPS position (all trucks), drum rotation speed (rpm), engine diagnostics, fuel level, driver behavior scores

**Outputs:** Fleet status map, drum rotation compliance alerts, fuel efficiency ranking, breakdown prediction flags, driver performance report

---

### 🥁 Drum Speed Control Agent

| Field | Details |
|-------|---------|
| **ID** | `drum-speed` |
| **Priority** | HIGH |
| **Phase** | Delivery |

**Inputs:** Transit drum rpm, time since loading, mix design water-cement ratio, current GPS location

**Outputs:** Drum speed recommendation (rpm) for transit and discharge, over-agitation alerts, segregation risk flags

---

## Phase 8: Finance & ESG Agents

### 💵 Revenue Cycle Agent

| Field | Details |
|-------|---------|
| **ID** | `revenue-cycle` |
| **Priority** | HIGH |
| **Phase** | Finance & ESG |

**Inputs:** Daily dispatch volumes, invoice generation status, payment receipts, DSO by customer, month-to-date revenue

**Outputs:** Revenue recognition status, DSO trend analysis, overdue invoice escalation, month-end closing forecast

---

### 📊 Cost Analytics Agent

| Field | Details |
|-------|---------|
| **ID** | `cost-analytics` |
| **Priority** | HIGH |
| **Phase** | Finance & ESG |

**Inputs:** Variable costs (fuel, power, raw materials), fixed overhead allocation, production volumes, budget targets

**Outputs:** Cost per tonne (cement and RMX), variance to budget, cost driver analysis, savings opportunity identification

---

### 🌱 Compliance & ESG Agent

| Field | Details |
|-------|---------|
| **ID** | `compliance-esg` |
| **Priority** | HIGH |
| **Phase** | Finance & ESG |

**Inputs:** Monthly CEMS data, production volumes, fuel consumption breakdown (fossil vs. AFR), clinker-to-cement ratio

**Outputs:** CO₂ intensity calculation (kg/kg cement), ESG scorecard, regulatory filing status, upcoming submission deadlines

**Sample Conversation:**

> **User:** Are we on track for our ESG target of 0.70 kg CO₂/kg cement?
>
> **Agent:** Current YTD: 0.718 kg/kg (target 0.70). Gap: 0.018 kg/kg — requires 2.5% improvement.
>
> Key levers to close gap:
> 1. **AFR rate** currently 12.3% vs. target 18% — increasing biomass/RDF by 6% would save ~0.012 kg/kg
> 2. **Clinker-to-cement ratio** at 0.73 vs. target 0.70 — GGBS/fly ash substitution for OPC 43 grade
>
> Upcoming compliance: CPCB quarterly return due in 18 days. Three stack emission reports pending sign-off. Estimated annual CO₂ saving from AFR increase: 8,400 tonnes.

---

# Part 5 — Orchestrator Step-by-Step Guide

---

## 5.1 The 5-Step Orchestration Process

### STEP 1 — User Submits Query

```
Input Query: "Our kiln has been sub-optimal for 3 days. What is the downstream
              impact on RMX quality, delivery scheduling, and customer commitments?"
```

### STEP 2 — Keyword Scoring & Agent Auto-Selection

```
Keyword → Agent Mapping:
  "kiln"        → kiln-optimization:  score +2  (+1 CRITICAL bonus) = 3
  "sub-optimal" → kiln-optimization:  score +2  total = 5
  "RMX"         → batch-controller:   score +2  (+1 CRITICAL bonus) = 3
  "quality"     → quality-lab:        score +2  (+1 CRITICAL bonus) = 3
  "delivery"    → route-optimization: score +2  (+1 CRITICAL bonus) = 3
  "scheduling"  → plant-scheduler:    score +2  = 2

SELECTED (Top 4):
  1. kiln-optimization  (score: 5)
  2. quality-lab        (score: 3)
  3. batch-controller   (score: 3)
  4. route-optimization (score: 3)
```

### STEP 3 — Parallel Agent Queries

```javascript
const agentResponses = await Promise.all([
  callLLM([kiln_system + plantData, userQuery]),      // ─┐
  callLLM([quality_system + plantData, userQuery]),   //  ├── All run simultaneously
  callLLM([batch_system + plantData, userQuery]),     //  │
  callLLM([route_system + plantData, userQuery]),     // ─┘
]);
// Total time: ~5–8 seconds (same as one call)
```

### STEP 4 — Synthesis Prompt

```
SYSTEM: You are the Orchestrator AI for a Cement & RMX Supply Chain command center.
        You synthesize multiple domain expert responses into unified strategic insight.

USER:   ORIGINAL QUERY: "Our kiln has been sub-optimal for 3 days..."

        PLANT DATA: Kiln: 1420°C | Production: 2,980 t/d | OEE: 71%...

        AGENT RESPONSES:
        [🔥 Kiln Agent]: "Temperature deficit of 30°C for 72 hours has produced
          clinker with free lime 2.3–2.8%. Estimated 180t of off-spec material..."

        [🔬 Quality Lab]: "Elevated free lime >2% in clinker reduces 28-day
          concrete strength by 8–12%. M40+ grades at risk. Quarantine recommended..."

        [⚙️ Batch Controller]: "Recommend holding all M50+ batches pending quality
          clearance. M30 and below can proceed using pre-crisis clinker stock..."

        [🗺️ Route Optimization]: "3 infrastructure project deliveries scheduled
          tomorrow require M45. Customer communication required now..."

        Provide:
        1. UNIFIED INSIGHT (200–250 words)
        2. TOP 3 RECOMMENDATIONS (numbered, action-oriented)
        3. ALERTS (critical issues requiring immediate action)
```

### STEP 5 — Rendered Response

```
┌─────────────────────────────────────────────────────────────────────┐
│  QUERY: "Our kiln has been sub-optimal for 3 days..."               │
│  Agents Consulted: 4  |  Time: 7.2 seconds                          │
├─────────────────────────────────────────────────────────────────────┤
│  AGENT RESPONSES                                                     │
│                                                                      │
│  🔥 Kiln Optimization Agent                            [GREEN BADGE] │
│  Temperature at 1420°C for 3 days indicates underfiring.            │
│  Free lime trending at 2.3%. Estimated quality recovery...          │
│                                                                      │
│  🔬 Quality Lab Agent                                  [GREEN BADGE] │
│  Elevated free lime (>2%) in clinker will reduce 28-day strength    │
│  by 8–12%. Current M40 mix designs will be affected...             │
│                                                                      │
│  ⚙️  Batch Controller Agent                            [ORANGE BADGE]│
│  Recommend holding M50+ grade batches for 24hrs until clinker       │
│  quality confirmed. Standard grades M30 and below can proceed...    │
│                                                                      │
│  🗺️  Route Optimization Agent                          [RED BADGE]   │
│  3 infrastructure project deliveries tomorrow require M45.          │
│  Proactive customer communication recommended immediately...         │
├─────────────────────────────────────────────────────────────────────┤
│  🤖 ORCHESTRATOR SYNTHESIS                                           │
│                                                                      │
│  The 3-day kiln temperature deficit has created a quality cascade.  │
│  ~180t of clinker produced in this window should be quarantined.    │
│  Free lime at 2.3% poses direct risk to M40+ concrete strength...  │
│                                                                      │
│  TOP 3 RECOMMENDATIONS:                                             │
│  1. Immediately quarantine last 72hr clinker production (est. 180t) │
│  2. Contact 3 infrastructure customers — offer M30 substitution     │
│  3. Increase kiln to 1465°C for recovery batch (6 hrs)             │
│                                                                      │
│  ⚠️  ALERTS: Site A project delivery at CRITICAL RISK tomorrow      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5.2 Orchestrator API — Request & Response Payloads

### Request

```json
POST /api/orchestrator
Content-Type: application/json

{
  "query": "What are the top 3 operational risks we should address today?",
  "includeAgents": [
    "kiln-optimization",
    "quality-lab",
    "route-optimization",
    "credit-risk"
  ]
}
```

### Response

```json
{
  "query": "What are the top 3 operational risks we should address today?",
  "plantData": {
    "kilnTemp": 1448,
    "kilnTempTarget": 1450,
    "clinkerQuality": 1195,
    "energyConsumption": 86,
    "co2Emissions": 0.718,
    "productionRate": 3250,
    "siloLevel": 28400,
    "siloCapacity": 40000,
    "activeOrders": 42,
    "trucksDeployed": 11,
    "trucksReturning": 4,
    "dailyRevenue": 142000,
    "oee": 84
  },
  "agentResponses": [
    {
      "agentId": "kiln-optimization",
      "agentName": "Kiln Optimization Agent",
      "phase": "manufacturing",
      "response": "Current kiln at 1448°C — within 2°C of target. Heat consumption 725 kcal/kg (target: 720). Recommend minor fuel increase of 0.3 tph to stabilize..."
    },
    {
      "agentId": "quality-lab",
      "agentName": "Quality Lab Agent",
      "phase": "manufacturing",
      "response": "Free lime at 1.2% — within acceptable range. C3S at 62% (target 60–65%). OPC 53 grade product conforming. Watch: Blaine fineness trending 310 cm²/g, approaching lower limit of 300..."
    },
    {
      "agentId": "route-optimization",
      "agentName": "Route Optimization Agent",
      "phase": "delivery",
      "response": "Fleet status: 11 trucks deployed, 4 returning. Truck 3 at 78 minutes post-batch — monitor closely, approaching 90-minute window at 32°C ambient..."
    },
    {
      "agentId": "credit-risk",
      "agentName": "Credit Risk Agent",
      "phase": "sales",
      "response": "2 accounts flagged: XYZ Builders overdue 45 days (₹12L exposure) — recommend hold. ABC Infra at 95% of credit limit — proactive call recommended before new order..."
    }
  ],
  "synthesis": "UNIFIED INSIGHT: Operations are near-normal but three time-sensitive risks require attention within the next 4 hours...\n\nTOP 3 RECOMMENDATIONS:\n1. Monitor Truck 3 workability — driver alert now\n2. Contact XYZ Builders finance team for payment plan\n3. Increase kiln fuel by 0.3 tph to prevent temperature drift\n\nALERTS: Truck 3 approaching workability limit",
  "agentsConsulted": 4,
  "timestamp": "2026-02-20T09:15:32.000Z"
}
```

---

# Part 6 — Administrator Manual

---

## 6.1 Prerequisites

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| Node.js | 18.x LTS | Required for local development and build |
| npm | 9.x | Included with Node.js |
| Git | 2.x | Required for Vercel deployment |
| Groq API Key | Free account | Get at [console.groq.com](https://console.groq.com) |
| Vercel Account | Free Hobby plan | [vercel.com](https://vercel.com) |
| OpenAI API Key | Optional (paid) | Only needed as LLM fallback |

---

## 6.2 Local Installation

```bash
# 1. Extract the application
unzip cement_rmx_ai_agents.zip
cd cement-rmx-agents

# 2. Install all dependencies (~200MB)
npm install

# 3. Configure environment
cp .env.example .env.local
# Open .env.local and set:
# GROQ_API_KEY=gsk_your_actual_key_here

# 4. Start development server
npm run dev
# → Application available at http://localhost:3000
# → Hot reload enabled — changes reflect immediately

# 5. Build for production (optional local test)
npm run build
npm start
```

---

## 6.3 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | **YES*** | none | Groq API key. Format: `gsk_...` Get free at console.groq.com |
| `OPENAI_API_KEY` | No | none | OpenAI fallback key. Format: `sk-...` |
| `LLM_PROVIDER` | No | `groq` | Primary LLM: `"groq"` or `"openai"` |
| `GROQ_MODEL` | No | `llama-3.1-70b-versatile` | Model name. Options: `llama-3.1-8b-instant`, `mixtral-8x7b-32768` |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model for fallback |
| `DEMO_MODE` | No | `true` | `true` = simulated sensor data. `false` = requires real data integration |
| `NEXTAUTH_SECRET` | Prod only | none | Random 32+ char string for session encryption |
| `NEXTAUTH_URL` | Prod only | `http://localhost:3000` | Full deployment URL for auth callbacks |

> *Either `GROQ_API_KEY` or `OPENAI_API_KEY` must be set. Groq is strongly recommended — it is free and fast.

---

## 6.4 Vercel Deployment

```bash
# Method A: Via GitHub (recommended)
# 1. Push code to GitHub (NEVER commit .env.local)
git add .
git commit -m "Initial deployment"
git push origin main

# 2. Import at vercel.com/new → select your repository
# 3. Add Environment Variables in Vercel dashboard:
#    GROQ_API_KEY = gsk_...
#    NEXTAUTH_SECRET = any-random-32-char-string (for auth)
# 4. Click Deploy → live in 2-3 minutes

# Method B: Via Vercel CLI
npm install -g vercel
vercel login
vercel --prod
vercel env add GROQ_API_KEY    # Prompted to enter value securely
```

> The included `vercel.json` sets 60-second function timeout for LLM calls and appropriate CORS headers.

---

## 6.5 Connecting Real Plant Data

Replace `getSimulatedPlantData()` in `src/lib/plant-simulator.ts`:

```typescript
import type { PlantData } from '@/types/agents';

export async function getSimulatedPlantData(): Promise<PlantData> {

  // ── Option A: OPC-UA ─────────────────────────────────────────────
  // npm install node-opcua
  const { OPCUAClient } = await import('node-opcua');
  const client = OPCUAClient.create({ endpointMustExist: false });
  await client.connect('opc.tcp://your-plc-server:4840');
  const session = await client.createSession();
  const kilnTempNode = await session.readVariableValue('ns=2;s=KilnBurningZoneTemp');
  const productionNode = await session.readVariableValue('ns=2;s=ClinkerProductionTpd');
  await session.close();
  await client.disconnect();

  // ── Option B: SCADA REST API ──────────────────────────────────────
  const sensors = await fetch('https://scada.plant.local/api/live', {
    headers: { 'Authorization': `Bearer ${process.env.SCADA_API_KEY}` }
  }).then(r => r.json());

  // ── Option C: OSIsoft PI Web API ──────────────────────────────────
  const piBase = process.env.PI_SERVER_URL;
  const kilnTemp = await fetch(`${piBase}/streams/KilnTemp/value`)
    .then(r => r.json());

  // ── Return standardized PlantData object ──────────────────────────
  return {
    kilnTemp: Number(kilnTempNode.value.value) || sensors.kilnBurningZoneTemp,
    kilnTempTarget: 1450,
    clinkerQuality: sensors.litreWeight,
    energyConsumption: sensors.specificPower,
    co2Emissions: sensors.co2Intensity,
    productionRate: Number(productionNode.value.value),
    siloLevel: sensors.totalCementStock,
    siloCapacity: 40000,
    activeOrders: sensors.openOrderCount,
    trucksDeployed: sensors.trucksOnRoute,
    trucksReturning: sensors.trucksReturning,
    dailyRevenue: sensors.todayRevenue,
    oee: sensors.oeePercent,
  };
}
```

---

## 6.6 Adding Authentication

```bash
npm install next-auth
```

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import GoogleProvider from 'next-auth/providers/google';

const authOptions = {
  providers: [
    // Microsoft / Azure AD (recommended for enterprise)
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
    // Google (alternative)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token }) {
      // Add role from token claims
      session.user.role = token.role as string;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

Create `src/middleware.ts` to protect all routes:

```typescript
export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 6.7 Production Hardening Checklist

| Priority | Task | Implementation |
|----------|------|----------------|
| 🔴 CRITICAL | Add authentication | NextAuth.js — see §6.6 |
| 🔴 CRITICAL | Zod request validation on all API routes | `npm install zod` |
| 🔴 CRITICAL | Rate limiting on API routes | Vercel edge middleware |
| 🟠 HIGH | Connect real SCADA/OPC-UA data | See §6.5 |
| 🟠 HIGH | Sentry error monitoring | `npm install @sentry/nextjs` |
| 🟠 HIGH | Database for chat history | Supabase + Prisma recommended |
| 🟡 MEDIUM | User role management | NextAuth.js role callbacks |
| 🟡 MEDIUM | Vercel Analytics | Enable in Vercel dashboard |
| 🟡 MEDIUM | Email alerts for critical thresholds | Resend or SendGrid API |
| 🟡 MEDIUM | Audit log for agent recommendations | Database table + middleware |
| 🟢 LOW | Weekly system prompt review with domain experts | Calendar cadence |
| 🟢 LOW | Load testing at peak concurrent users | k6 or Artillery |

---

# Part 7 — API Reference

---

## 7.1 Endpoints Overview

| Method | Endpoint | Response Type | Description |
|--------|----------|--------------|-------------|
| `POST` | `/api/agents/[agentId]` | SSE Stream | Chat with a specific agent. Streams response token by token. |
| `GET` | `/api/agents/[agentId]` | JSON | Get agent metadata: name, phase, status, capabilities, metrics. |
| `POST` | `/api/orchestrator` | JSON | Multi-agent orchestration. Returns synthesized response from 4 agents. |
| `GET` | `/api/plant-data` | JSON | Live plant sensor data, time series, alerts, agent summary. |

---

## 7.2 Agent Chat API — POST /api/agents/{agentId}

### Valid Agent IDs

```
Procurement:   supplier-intelligence | price-forecasting | contract-management | demand-signal
Mining:        geological-survey | blast-planning | equipment-utilization
Manufacturing: kiln-optimization | quality-lab | energy-management | predictive-maintenance | emission-control
Inventory:     silo-management | bulk-dispatch | stock-replenishment | bagging-control
RMX:           batch-controller | mix-design | plant-scheduler | water-admixture | drum-washout
Sales:         order-intake | pricing-engine | crm-retention | credit-risk
Delivery:      route-optimization | fleet-telematics | drum-speed | pod-capture
Finance:       revenue-cycle | cost-analytics | compliance-esg
```

### Request Body

```json
{
  "messages": [
    { "role": "user",      "content": "What is the current kiln status?" },
    { "role": "assistant", "content": "Kiln running at 1450°C, stable..." },
    { "role": "user",      "content": "Any fuel efficiency improvements?" }
  ],
  "plantData": {
    "kilnTemp": 1452,
    "productionRate": 3250,
    "oee": 84
  }
}
```

### SSE Response Stream

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

data: {"content": "Based"}

data: {"content": " on"}

data: {"content": " current"}

data: {"content": " kiln"}

data: {"content": " readings..."}

data: [DONE]
```

### JavaScript Client Example

```javascript
const response = await fetch(`/api/agents/kiln-optimization`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages, plantData }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();
let accumulated = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') break;
      const parsed = JSON.parse(data);
      accumulated += parsed.content;
      setStreamingContent(accumulated); // Update UI
    }
  }
}
```

---

## 7.3 Plant Data API — GET /api/plant-data

### Response Structure

```json
{
  "plantData": {
    "kilnTemp": 1452,
    "kilnTempTarget": 1450,
    "clinkerQuality": 1195,
    "energyConsumption": 86,
    "co2Emissions": 0.718,
    "productionRate": 3250,
    "siloLevel": 28400,
    "siloCapacity": 40000,
    "activeOrders": 42,
    "trucksDeployed": 11,
    "trucksReturning": 4,
    "dailyRevenue": 142000,
    "oee": 84
  },
  "timeSeries": {
    "kilnTemp": [
      { "time": "00:00", "value": 1448 },
      { "time": "01:00", "value": 1451 },
      // ... 24 hourly data points
    ],
    "production": [
      { "time": "00:00", "value": 3100 },
      // ...
    ],
    "energy": [
      { "time": "00:00", "value": 82 },
      // ...
    ]
  },
  "agentSummary": [
    {
      "phase": "manufacturing",
      "label": "Manufacturing",
      "color": "#10B981",
      "agentCount": 5,
      "activeCount": 5,
      "alertCount": 0
    }
    // ... one entry per phase
  ],
  "alerts": [
    {
      "id": "co2-high",
      "agentId": "emission-control",
      "severity": "warning",
      "message": "CO₂ intensity 0.72 kg/kg approaching monthly limit of 0.75",
      "timestamp": "2026-02-20T09:15:32.000Z"
    }
  ],
  "timestamp": "2026-02-20T09:15:32.000Z"
}
```

### PlantData TypeScript Interface

```typescript
interface PlantData {
  kilnTemp: number;            // Burning zone temperature °C
  kilnTempTarget: number;      // Target temperature °C (default: 1450)
  clinkerQuality: number;      // Litre weight g/L (target: 1150–1200)
  energyConsumption: number;   // Specific electrical energy kWh/t
  co2Emissions: number;        // Net CO₂ intensity kg CO₂/kg cement
  productionRate: number;      // Clinker production t/d
  siloLevel: number;           // Total cement stock tonnes (all silos)
  siloCapacity: number;        // Total silo capacity tonnes
  activeOrders: number;        // Open order count
  trucksDeployed: number;      // Trucks currently on route
  trucksReturning: number;     // Trucks returning to plant
  dailyRevenue: number;        // Today's revenue in local currency
  oee: number;                 // Overall Equipment Effectiveness %
}
```

---

## 7.4 Error Responses

```json
// 404 — Agent Not Found
{
  "error": "Agent not found",
  "validAgentIds": ["kiln-optimization", "quality-lab", ...]
}

// 500 — LLM Error (both Groq and OpenAI failed)
{
  "error": "LLM service unavailable",
  "message": "Please check your API key configuration",
  "groqError": "429 Rate limit exceeded",
  "openaiError": "No API key configured"
}

// 400 — Invalid Request Body
{
  "error": "Invalid request body",
  "details": "messages field is required and must be an array"
}
```

---

# Part 8 — Troubleshooting Guide

---

## 8.1 Common Issues & Resolutions

| Problem | Likely Cause | Resolution |
|---------|-------------|-----------|
| **Agent chat shows "Connection error"** | `GROQ_API_KEY` not set or invalid | Check `.env.local` has `GROQ_API_KEY=gsk_...` and restart `npm run dev` |
| **Agent response very slow (>10s)** | Using OpenAI fallback or network latency | Verify `GROQ_API_KEY` is valid — Groq responds in <2s |
| **"Agent not found" error** | Invalid `agentId` in URL | Check agent ID list in §7.2 |
| **Dashboard shows "---" for all KPIs** | `/api/plant-data` returning error | Check server console for errors — verify environment variables |
| **Orchestrator returns empty responses** | Parallel agent queries timing out | Reduce to 3 agents or increase `maxDuration` in `vercel.json` |
| **`npm install` fails** | Node.js version too old | Upgrade: `nvm install 18 && nvm use 18` |
| **Vercel build fails** | TypeScript errors | Run `npm run build` locally first — fix all type errors |
| **"Rate limit exceeded" from Groq** | Too many requests on free tier | Add `OPENAI_API_KEY` as fallback, or upgrade Groq plan |
| **Charts not rendering** | Recharts SSR issue | Ensure `KilnChart.tsx` has `'use client'` directive at top |
| **Streaming stops mid-response** | Edge function timeout | Add `maxDuration: 60` to `vercel.json` route config |
| **Mobile layout broken** | CSS conflict | Hard reload: Ctrl+Shift+R (PC) or Cmd+Shift+R (Mac) |
| **Plant data not updating** | 30s interval not firing | Check browser console for errors in fetch calls |

---

## 8.2 Debugging Commands

```bash
# Check Node.js version
node --version    # Should be 18.x or higher

# Verify environment variables are loaded
node -e "require('dotenv').config({path:'.env.local'}); console.log(process.env.GROQ_API_KEY?.slice(0,8))"

# Test Groq API directly
curl https://api.groq.com/openai/v1/models \
  -H "Authorization: Bearer $GROQ_API_KEY"

# Test agent API locally
curl -X POST http://localhost:3000/api/agents/kiln-optimization \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is kiln status?"}]}'

# Test plant data API
curl http://localhost:3000/api/plant-data | jq .plantData

# Check Vercel deployment logs
vercel logs your-project-name --since 1h
```

---

## 8.3 Performance Benchmarks

| Metric | Expected Value | Investigate If |
|--------|---------------|----------------|
| Single agent response (Groq) | 1–3 seconds | > 5 seconds |
| Single agent response (OpenAI fallback) | 3–8 seconds | > 15 seconds |
| Orchestrator (4 agents) | 5–12 seconds | > 20 seconds |
| Plant data API response | < 100ms | > 500ms |
| Dashboard initial load | < 2 seconds | > 5 seconds |
| Dashboard KPI refresh | < 100ms (client-side) | N/A |

---

## 8.4 Expected KPI Improvements After Deployment

Based on industry benchmarks for AI-assisted plant operations:

| KPI | Baseline | Target Improvement | Agent Responsible |
|-----|---------|-------------------|------------------|
| Kiln OEE | ~78% | +12–18% | Kiln Optimization + Predictive Maintenance |
| Specific fuel consumption | ~725 kcal/kg | -5–8% | Kiln Optimization + Energy Management |
| RMX batch accuracy | 98.5% | >99.5% | Batch Controller + Mix Design |
| On-time concrete delivery | 82% | +15% | Route Optimization + Plant Scheduler |
| Days Sales Outstanding | 45 days | -10 days | Credit Risk + Revenue Cycle |
| CO₂ intensity | 0.74 kg/kg | -10–15% | Emission Control + Compliance ESG |
| Supplier performance score | 72/100 | >85/100 | Supplier Intelligence |
| Free lime rejection rate | 1.8% | <0.8% | Quality Lab + Kiln Optimization |

---

## 8.5 Version History

| Version | Date | Changes |
|---------|------|---------|
| **1.0.0** | February 2026 | Initial release. 32 agents, Groq/OpenAI streaming, Orchestrator, simulated plant data, Vercel Edge deployment, industrial dashboard UI, complete documentation. |

---

## 8.6 Support & Resources

| Resource | URL |
|----------|-----|
| Groq API Documentation | https://console.groq.com/docs |
| Groq Free Tier Limits | https://console.groq.com/settings/limits |
| Next.js Documentation | https://nextjs.org/docs |
| Vercel Documentation | https://vercel.com/docs |
| NextAuth.js | https://next-auth.js.org |
| Recharts | https://recharts.org |
| Tailwind CSS | https://tailwindcss.com/docs |

---

<div align="center">

---

**Cement & RMX Supply Chain AI Multi-Agent System**

*Version 1.0 · February 2026 · Internal Use Only*

*32 Agents · 8 Phases · Powered by Groq LLaMA 3.1 70B · Deployed on Vercel Edge*

</div>
