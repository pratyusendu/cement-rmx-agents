// ============================================================
// API Route: /api/plant-data — Real-time Plant Sensor Data
// ============================================================
import { NextResponse } from 'next/server';
import { getSimulatedPlantData, generateTimeSeries } from '@/lib/plant-simulator';
import { AGENTS, PHASES } from '@/lib/agents-registry';

export const runtime = 'edge';

export async function GET() {
  const plantData = getSimulatedPlantData();

  // Generate time series for dashboard charts
  const kilnTimeSeries = generateTimeSeries('kilnTemp', 24, 1450, 20);
  const productionTimeSeries = generateTimeSeries('productionRate', 24, 3200, 150);
  const energyTimeSeries = generateTimeSeries('energyConsumption', 24, 85, 5);
  const co2TimeSeries = generateTimeSeries('co2Emissions', 24, 0.72, 0.03);

  // Generate agent status summary
  const agentSummary = PHASES.map(phase => ({
    phase: phase.id,
    label: phase.label,
    color: phase.color,
    agentCount: AGENTS.filter(a => a.phase === phase.id).length,
    activeCount: AGENTS.filter(a => a.phase === phase.id && a.status === 'active').length,
    alertCount: AGENTS.filter(a => a.phase === phase.id && a.status === 'alert').length,
  }));

  // Generate recent alerts (simulated)
  const alerts = generateAlerts(plantData);

  return NextResponse.json({
    plantData,
    timeSeries: {
      kilnTemp: kilnTimeSeries,
      production: productionTimeSeries,
      energy: energyTimeSeries,
      co2: co2TimeSeries,
    },
    agentSummary,
    alerts,
    timestamp: new Date().toISOString(),
  });
}

function generateAlerts(data: ReturnType<typeof getSimulatedPlantData>) {
  const alerts = [];

  if (Math.abs(data.kilnTemp - data.kilnTempTarget) > 20) {
    alerts.push({
      id: 'kiln-temp',
      agentId: 'kiln-optimization',
      severity: 'warning',
      message: `Kiln temperature ${data.kilnTemp}°C — ${data.kilnTemp > data.kilnTempTarget ? 'above' : 'below'} target by ${Math.abs(data.kilnTemp - data.kilnTempTarget)}°C`,
      timestamp: new Date().toISOString(),
    });
  }

  if (data.siloLevel / data.siloCapacity < 0.3) {
    alerts.push({
      id: 'silo-low',
      agentId: 'silo-management',
      severity: 'critical',
      message: `Silo stock critically low: ${Math.round(data.siloLevel / data.siloCapacity * 100)}% capacity — accelerate dispatch scheduling`,
      timestamp: new Date().toISOString(),
    });
  }

  if (data.co2Emissions > 0.75) {
    alerts.push({
      id: 'co2-high',
      agentId: 'emission-control',
      severity: 'warning',
      message: `CO₂ intensity ${data.co2Emissions} kg/kg — approaching monthly limit`,
      timestamp: new Date().toISOString(),
    });
  }

  if (data.oee < 75) {
    alerts.push({
      id: 'oee-low',
      agentId: 'predictive-maintenance',
      severity: 'warning',
      message: `OEE dropped to ${data.oee}% — below 80% threshold, check equipment availability`,
      timestamp: new Date().toISOString(),
    });
  }

  // Always add an info alert for demo
  alerts.push({
    id: 'daily-production',
    agentId: 'kiln-optimization',
    severity: 'info',
    message: `Daily production on track: ${data.productionRate.toLocaleString()} t/d vs 3,200 t/d target`,
    timestamp: new Date().toISOString(),
  });

  return alerts;
}
