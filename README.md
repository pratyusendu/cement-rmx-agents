# 🏭 Cement & RMX Supply Chain — AI Multi-Agent System

> **32 specialized AI agents** orchestrating end-to-end supply chain automation for Cement Manufacturing and Ready-Mix Concrete (RMX) industries. Deployable on **Vercel** in minutes.

Live Link : https://cement-rmx-agents.vercel.app/
---

## 🚀 Quick Start

### 1. Get a FREE Groq API Key
Go to [console.groq.com](https://console.groq.com) → Sign up → Create API Key (free, generous limits)

### 2. Deploy to Vercel (1-click)
```
https://vercel.com/new/clone?repository-url=https://github.com/YOUR_REPO
```
Add environment variable: `GROQ_API_KEY=gsk_your_key_here`

### 3. Run Locally
```bash
git clone <repo>
cd cement-rmx-agents
npm install
cp .env.example .env.local
# Edit .env.local with your GROQ_API_KEY
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## 🤖 32 AI Agents — Complete Directory

### Phase 1: Procurement (4 Agents)
| # | Agent | Role |
|---|-------|------|
| 01 | Supplier Intelligence | Vendor scoring, risk assessment, alternate sourcing |
| 02 | Price Forecasting | Raw material price prediction, hedging strategy |
| 03 | Contract Management | SLA tracking, renewal alerts, penalty calculation |
| 04 | Demand Signal | Demand forecasting, MRP signal, seasonality |

### Phase 2: Mining & Quarrying (3 Agents)
| # | Agent | Role |
|---|-------|------|
| 05 | Geological Survey | Ore grade mapping, quarry face planning |
| 06 | Blast Planning | Blast pattern design, fragmentation optimization |
| 07 | Equipment Utilization | Fleet OEE, haul route optimization |

### Phase 3: Cement Manufacturing (5 Agents)
| # | Agent | Role |
|---|-------|------|
| 08 | Kiln Optimization 🔥 | Temperature control, fuel optimization, clinker quality |
| 09 | Quality Lab | Strength prediction, NCR management, grade certification |
| 10 | Energy Management | Peak demand control, AFR optimization, carbon tracking |
| 11 | Predictive Maintenance | Vibration analysis, MTBF prediction, spare parts |
| 12 | Emission Control | CEMS monitoring, NOx/SO₂/dust control, ESG |

### Phase 4: Inventory & Dispatch (4 Agents)
| # | Agent | Role |
|---|-------|------|
| 13 | Silo Management | Level monitoring, FIFO rotation, capacity planning |
| 14 | Bulk Dispatch | Truck TAT optimization, loading sequence |
| 15 | Stock Replenishment | Reorder points, safety stock, EOQ calculations |
| 16 | Bagging Control | Packing line efficiency, weight compliance |

### Phase 5: RMX Plant Operations (5 Agents)
| # | Agent | Role |
|---|-------|------|
| 17 | Batch Controller 🔑 | Batching sequence, weighing accuracy, cycle time |
| 18 | Mix Design 🔑 | Mix optimization, strength prediction, cost per m³ |
| 19 | Plant Scheduler | Pour scheduling, truck dispatch, capacity planning |
| 20 | Water/Admixture | Moisture correction, w/c ratio control, slump management |
| 21 | Drum Washout | Water reclaim, return concrete, washout scheduling |

### Phase 6: Sales & CRM (4 Agents)
| # | Agent | Role |
|---|-------|------|
| 22 | Order Intake | Multi-channel orders, spec validation, credit check |
| 23 | Pricing Engine | Dynamic pricing, margin optimization, discount control |
| 24 | CRM & Retention | Churn prediction, NPS, customer segmentation |
| 25 | Credit Risk | Credit scoring, DSO management, collections |

### Phase 7: Last-Mile Delivery (4 Agents)
| # | Agent | Role |
|---|-------|------|
| 26 | Route Optimization 🔑 | Real-time routing, workability window enforcement |
| 27 | Fleet Telematics | GPS tracking, driver scoring, fuel monitoring |
| 28 | Drum Speed Control | Drum RPM monitoring, slump prediction, water alerts |
| 29 | POD Capture | Digital proof of delivery, invoice triggering |

### Phase 8: Finance & ESG (3 Agents)
| # | Agent | Role |
|---|-------|------|
| 30 | Revenue Cycle | Order-to-cash automation, invoicing, collections |
| 31 | Cost Analytics | Cost per tonne/m³, variance analysis, budget tracking |
| 32 | Compliance & ESG | Regulatory reporting, carbon accounting, audit trails |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    NEXT.JS 14 APP (Vercel Edge)                 │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React)           │  Backend (API Routes)             │
│  ├─ Dashboard               │  ├─ /api/agents/[agentId]        │
│  ├─ 32 Agent Cards          │  │    └─ Streaming SSE chat       │
│  ├─ Agent Chat (streaming)  │  ├─ /api/orchestrator            │
│  ├─ Orchestrator Panel      │  │    └─ Multi-agent synthesis    │
│  ├─ Live KPI Strip          │  └─ /api/plant-data              │
│  ├─ Kiln Trend Chart        │       └─ Simulated sensor data   │
│  └─ Alert Feed              │                                   │
├─────────────────────────────────────────────────────────────────┤
│                         LLM LAYER                               │
│  Primary: Groq LLaMA 3.1 70B (fast, free)                      │
│  Fallback: OpenAI GPT-4o-mini                                   │
│  Streaming: Server-Sent Events (SSE)                            │
├─────────────────────────────────────────────────────────────────┤
│                    SIMULATED PLANT DATA                         │
│  Real-time sensor simulation (30s refresh)                      │
│  Kiln temp, production rate, OEE, silo levels, fleet status     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | ✅ (or OpenAI) | - | Free at console.groq.com |
| `OPENAI_API_KEY` | Optional | - | Fallback LLM provider |
| `LLM_PROVIDER` | No | `groq` | `groq` or `openai` |
| `GROQ_MODEL` | No | `llama-3.1-70b-versatile` | Groq model name |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model name |
| `DEMO_MODE` | No | `true` | Use simulated plant data |

### Groq Model Options (Free)
| Model | Speed | Quality | Context |
|-------|-------|---------|---------|
| `llama-3.1-70b-versatile` | Fast | ⭐⭐⭐⭐⭐ | 128k |
| `llama-3.1-8b-instant` | Ultra-fast | ⭐⭐⭐⭐ | 128k |
| `mixtral-8x7b-32768` | Medium | ⭐⭐⭐⭐ | 32k |

---

## 📁 Project Structure

```
cement-rmx-agents/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Main dashboard
│   │   ├── layout.tsx                  # Root layout
│   │   ├── globals.css                 # Industrial UI styles
│   │   └── api/
│   │       ├── agents/[agentId]/
│   │       │   └── route.ts            # Individual agent chat (streaming)
│   │       ├── orchestrator/
│   │       │   └── route.ts            # Multi-agent orchestrator
│   │       └── plant-data/
│   │           └── route.ts            # Live plant data API
│   ├── components/
│   │   ├── agents/
│   │   │   ├── AgentCard.tsx           # Agent grid cards
│   │   │   ├── AgentChat.tsx           # Streaming chat interface
│   │   │   └── OrchestratorPanel.tsx   # Multi-agent coordination UI
│   │   └── dashboard/
│   │       ├── MetricCard.tsx          # KPI display cards
│   │       ├── KilnChart.tsx           # Real-time trend chart
│   │       ├── AlertFeed.tsx           # Live alert stream
│   │       └── PhaseFilter.tsx         # Supply chain phase filter
│   ├── lib/
│   │   ├── agents-registry.ts          # All 32 agent definitions + system prompts
│   │   ├── llm.ts                      # Groq/OpenAI client (streaming + sync)
│   │   └── plant-simulator.ts          # Real-time plant data simulation
│   └── types/
│       └── agents.ts                   # TypeScript type definitions
├── vercel.json                         # Vercel deployment config
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 🌐 Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add GROQ_API_KEY
```

Or use the Vercel Dashboard:
1. Import repository
2. Add `GROQ_API_KEY` environment variable
3. Deploy → Live in 2 minutes

---

## 🔌 Extending the System

### Add Real Plant Data (replace simulator)
```typescript
// src/lib/plant-simulator.ts
export async function getPlantData(): Promise<PlantData> {
  // Replace with your OPC-UA, SCADA, or API integration
  const data = await fetch('https://your-plant-api.com/sensors');
  return data.json();
}
```

### Add a New Agent
```typescript
// In src/lib/agents-registry.ts
{
  id: 'your-new-agent',
  name: 'Your New Agent',
  shortName: 'NewAgentAI',
  phase: 'manufacturing',
  priority: 'high',
  systemPrompt: `You are... [detailed role description]`,
  // ... rest of config
}
```

### Integrate with ERP/SCADA
The API routes accept `plantData` in POST body — pass real sensor data from your OPC-UA, Ignition, OSIsoft PI, or SAP PM systems.

---

## 💡 Use Cases

- **Operations Manager**: Chat with KilnAI for real-time production optimization
- **Procurement Head**: Ask SupplierAI + PriceAI via Orchestrator for sourcing strategy
- **RMX Plant Manager**: BatchAI + MixAI for concrete quality and throughput
- **CFO**: Orchestrate CostAI + RevenueAI + ComplianceAI for financial overview
- **Dispatch Coordinator**: RouteAI + DrumAI for fleet and concrete quality management

---

## 📊 Expected Business Impact

| KPI | Improvement |
|----|-------------|
| Kiln OEE | +12-18% |
| Fuel cost | -8-12% |
| Batch accuracy | >99.5% |
| On-time delivery | +15% |
| DSO | -10 days |
| CO₂ intensity | -10-15% |

---

## 🛡️ Security Notes

- API keys are server-side only (never exposed to browser)
- Rate limiting recommended for production (`vercel.json` includes function timeouts)
- Add authentication (NextAuth.js) for production deployments
- Plant sensor data: Use VPN/private endpoints for real OT data

---

## 📄 Contact

contact pratdala@gmail.com for an implemenation and production deployment.


---

*Built for the global cement and concrete industry. Powered by open-source LLMs.*
"# cement-rmx-agents" 
