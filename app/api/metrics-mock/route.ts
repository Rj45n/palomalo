import { NextRequest, NextResponse } from "next/server";
import { DashboardMetrics, InterfaceStats } from "@/types";

/**
 * API Route MOCK pour tester le dashboard sans appels réels au firewall
 * GET /api/metrics-mock
 */
export async function GET(request: NextRequest) {
  // Vérifier la session
  const apiKey = request.cookies.get("panos_api_key")?.value;
  const url = request.cookies.get("panos_url")?.value;

  if (!apiKey || !url) {
    return NextResponse.json({ error: "Session expirée" }, { status: 401 });
  }

  // Données mockées réalistes pour PA-5220
  const interfaces: InterfaceStats[] = [];
  
  // Interfaces ethernet (16 ports pour PA-5220)
  for (let i = 1; i <= 16; i++) {
    const isUp = i <= 4;
    interfaces.push({
      name: `ethernet1/${i}`,
      status: isUp ? "up" : "down",
      speed: isUp ? "1000Mbps" : "N/A",
      rx: isUp ? Math.floor(Math.random() * 10000000000) : 0,
      tx: isUp ? Math.floor(Math.random() * 10000000000) : 0,
      rxPackets: isUp ? Math.floor(Math.random() * 10000000) : 0,
      txPackets: isUp ? Math.floor(Math.random() * 10000000) : 0,
      rxErrors: isUp ? Math.floor(Math.random() * 20) : 0,
      txErrors: isUp ? Math.floor(Math.random() * 10) : 0,
      rxDrops: isUp ? Math.floor(Math.random() * 1000) : 0,
      txDrops: isUp ? Math.floor(Math.random() * 500) : 0,
    });
  }
  
  // Interfaces AE (Aggregate Ethernet) - PA-5220 peut avoir jusqu'à 8 AE
  for (let i = 1; i <= 8; i++) {
    const isUp = i <= 5;
    interfaces.push({
      name: `ae${i}`,
      status: isUp ? "up" : "down",
      speed: isUp ? "2000Mbps" : "N/A",
      rx: isUp ? Math.floor(Math.random() * 20000000000) : 0,
      tx: isUp ? Math.floor(Math.random() * 20000000000) : 0,
      rxPackets: isUp ? Math.floor(Math.random() * 20000000) : 0,
      txPackets: isUp ? Math.floor(Math.random() * 20000000) : 0,
      rxErrors: isUp ? Math.floor(Math.random() * 30) : 0,
      txErrors: isUp ? Math.floor(Math.random() * 15) : 0,
      rxDrops: isUp ? Math.floor(Math.random() * 500) : 0,
      txDrops: isUp ? Math.floor(Math.random() * 300) : 0,
    });
  }
  
  // Sous-interfaces AE (VLANs)
  const aeSubInterfaces = [
    { ae: 1, vlan: 100 },
    { ae: 1, vlan: 200 },
    { ae: 1, vlan: 300 },
    { ae: 2, vlan: 100 },
    { ae: 2, vlan: 150 },
    { ae: 3, vlan: 100 },
    { ae: 3, vlan: 200 },
    { ae: 3, vlan: 300 },
    { ae: 3, vlan: 400 },
    { ae: 4, vlan: 100 },
    { ae: 5, vlan: 100 },
    { ae: 5, vlan: 200 },
  ];
  
  aeSubInterfaces.forEach(({ ae, vlan }) => {
    const isUp = ae <= 5;
    interfaces.push({
      name: `ae${ae}.${vlan}`,
      status: isUp ? "up" : "down",
      speed: "N/A",
      rx: isUp ? Math.floor(Math.random() * 5000000000) : 0,
      tx: isUp ? Math.floor(Math.random() * 5000000000) : 0,
      rxPackets: isUp ? Math.floor(Math.random() * 5000000) : 0,
      txPackets: isUp ? Math.floor(Math.random() * 5000000) : 0,
      rxErrors: isUp ? Math.floor(Math.random() * 5) : 0,
      txErrors: isUp ? Math.floor(Math.random() * 3) : 0,
      rxDrops: isUp ? Math.floor(Math.random() * 200) : 0,
      txDrops: isUp ? Math.floor(Math.random() * 100) : 0,
    });
  });
  
  // Interface management
  interfaces.push({
    name: "management",
    status: "up",
    speed: "1000Mbps",
    rx: Math.floor(Math.random() * 1000000000),
    tx: Math.floor(Math.random() * 1000000000),
    rxPackets: Math.floor(Math.random() * 1000000),
    txPackets: Math.floor(Math.random() * 1000000),
    rxErrors: Math.floor(Math.random() * 10),
    txErrors: Math.floor(Math.random() * 5),
    rxDrops: Math.floor(Math.random() * 100),
    txDrops: Math.floor(Math.random() * 50),
  });

  const metrics: DashboardMetrics = {
    system: {
      cpu: Math.floor(Math.random() * 40) + 20, // 20-60%
      memory: Math.floor(Math.random() * 30) + 40, // 40-70%
      disk: Math.floor(Math.random() * 20) + 30, // 30-50%
      uptime: "2 days, 3:33:50",
    },
    sessions: {
      total: 500000,
      active: Math.floor(Math.random() * 50000) + 10000,
      tcp: Math.floor(Math.random() * 40000) + 8000,
      udp: Math.floor(Math.random() * 10000) + 1000,
      icmp: Math.floor(Math.random() * 1000) + 100,
    },
    interfaces,
    info: {
      hostname: "PSECMRSB22FWL01",
      serial: "013201028945",
      model: "PA-5220",
      version: "10.2.3",
      uptime: "2 days, 3:33:50",
    },
  };

  return NextResponse.json(metrics);
}
