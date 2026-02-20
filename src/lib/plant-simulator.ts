// ============================================================
// Plant Data Simulator — Generates realistic real-time sensor data
// ============================================================
import { PlantData } from '@/types/agents';

// Simulate realistic plant sensor readings with time-based variation
export function getSimulatedPlantData(): PlantData {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const timeOfDay = hour + minute / 60;

  // Kiln temperature oscillates ±15°C around 1450°C
  const kilnBase = 1450;
  const kilnVariation = Math.sin(timeOfDay * Math.PI / 6) * 15 + Math.random() * 5 - 2.5;
  const kilnTemp = Math.round(kilnBase + kilnVariation);

  // Production rate peaks in mid-morning and afternoon
  const productionFactor = 0.8 + 0.2 * Math.sin((timeOfDay - 6) * Math.PI / 8);
  const productionRate = Math.round(3200 * productionFactor + Math.random() * 50 - 25);

  // Silo fills during production, drains during dispatch
  const dispatchActive = timeOfDay >= 6 && timeOfDay <= 20;
  const siloChange = dispatchActive ? Math.random() * 200 - 150 : Math.random() * 100;
  const siloBase = 28400;
  const siloLevel = Math.max(5000, Math.min(40000, siloBase + siloChange));
  const siloCapacity = 40000;

  // Active orders increase morning, decrease afternoon
  const orderFactor = hour >= 7 && hour <= 17 ? 1.0 : 0.3;
  const activeOrders = Math.round(38 * orderFactor + Math.random() * 5);

  // Trucks: more active during business hours
  const trucksDeployed = hour >= 6 && hour <= 18
    ? Math.round(8 + Math.random() * 4)
    : Math.round(2 + Math.random() * 3);
  const trucksReturning = Math.round(trucksDeployed * 0.4);

  // Revenue accumulates through day
  const dailyTarget = 4200000 / 30; // $4.2M monthly / 30 days
  const progressFactor = Math.min(1, timeOfDay / 20);
  const dailyRevenue = Math.round(dailyTarget * progressFactor + Math.random() * 10000);

  // Energy: higher during production hours
  const energyBase = 85;
  const energyVariation = hour >= 6 && hour <= 18 ? Math.random() * 5 : -(Math.random() * 10);
  const energyConsumption = Math.round(energyBase + energyVariation);

  // CO2 — correlated with production
  const co2Base = 0.72;
  const co2Variation = (Math.random() - 0.5) * 0.04;
  const co2Emissions = Number((co2Base + co2Variation).toFixed(3));

  // OEE calculation
  const availability = 0.92 + Math.random() * 0.06;
  const performance = 0.88 + Math.random() * 0.08;
  const quality = 0.97 + Math.random() * 0.02;
  const oee = Math.round(availability * performance * quality * 100);

  return {
    kilnTemp,
    kilnTempTarget: 1450,
    clinkerQuality: Math.round(975 + Math.random() * 50), // litre weight g/L
    energyConsumption,
    co2Emissions,
    productionRate,
    siloLevel: Math.round(siloLevel),
    siloCapacity,
    activeOrders,
    trucksDeployed,
    trucksReturning,
    dailyRevenue,
    oee,
  };
}

// Build context string from plant data for LLM prompts
export function buildPlantContext(data: PlantData): string {
  const siloPercent = Math.round((data.siloLevel / data.siloCapacity) * 100);
  const kilnStatus = Math.abs(data.kilnTemp - data.kilnTempTarget) < 20
    ? 'NORMAL' : data.kilnTemp > data.kilnTempTarget + 20
    ? 'OVER TEMP' : 'BELOW TARGET';

  return `
CURRENT PLANT STATUS (Live Sensor Data — ${new Date().toLocaleTimeString()}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 KILN: ${data.kilnTemp}°C (Target: ${data.kilnTempTarget}°C) — Status: ${kilnStatus}
📊 PRODUCTION: ${data.productionRate.toLocaleString()} t/d clinker
⚡ ENERGY: ${data.energyConsumption} kWh/t specific consumption
🌿 CO₂: ${data.co2Emissions} kg/kg cement (Net)
🏗️ SILO STOCK: ${data.siloLevel.toLocaleString()}t / ${data.siloCapacity.toLocaleString()}t capacity (${siloPercent}%)
📦 ACTIVE ORDERS: ${data.activeOrders} orders pending
🚛 FLEET: ${data.trucksDeployed} trucks deployed, ${data.trucksReturning} returning
💰 TODAY'S REVENUE: $${(data.dailyRevenue / 1000).toFixed(0)}K
📈 OEE: ${data.oee}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use this real-time context to inform your analysis and recommendations.`.trim();
}

// Generate time-series data for charts
export function generateTimeSeries(
  metric: keyof PlantData,
  hours: number = 24,
  baseValue: number,
  variance: number
): { time: string; value: number }[] {
  const data = [];
  const now = new Date();

  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = time.getHours();

    // Add time-of-day variation
    const tod = hour + time.getMinutes() / 60;
    const todFactor = Math.sin((tod - 6) * Math.PI / 12) * 0.1;
    const noise = (Math.random() - 0.5) * variance;
    const value = Number((baseValue * (1 + todFactor) + noise).toFixed(2));

    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      value: Math.max(0, value),
    });
  }

  return data;
}
