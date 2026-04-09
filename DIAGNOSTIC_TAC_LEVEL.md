# Diagnostic TAC-Level - PaloMalo

## Vue d'ensemble

PaloMalo dispose maintenant d'un système de diagnostic avancé de niveau TAC (Technical Assistance Center) pour analyser en profondeur les firewalls Palo Alto Networks.

## Nouvelles fonctionnalités

### 1. Métriques avancées PAN-OS

#### Resource Monitor (Dataplane)
- CPU par core dataplane (0-100%)
- Utilisation des packet descriptors
- Utilisation des sessions
- Utilisation des buffers

**Commande PAN-OS**: `show running resource-monitor minute`

#### Counters globaux (Drops)
- Analyse des drops de paquets par raison
- Catégorisation par sévérité
- Identification des causes (policy deny, no route, etc.)

**Commande PAN-OS**: `show counter global filter delta yes severity drop`

#### High Availability (HA)
- État local et peer
- Status de synchronisation
- Dernier failover
- Détection de problèmes de communication

**Commande PAN-OS**: `show high-availability all`

#### Routing
- Nombre total de routes
- Peers BGP (état, préfixes)
- Voisins OSPF
- Détection de flapping

**Commandes PAN-OS**: 
- `show routing summary`
- `show routing protocol bgp summary`

#### VPN
- Tunnels IKE (état, peer)
- Tunnels IPSec (SPI, paquets)
- Détection de tunnels down

**Commandes PAN-OS**: 
- `show vpn ike-sa`
- `show vpn ipsec-sa`

#### GlobalProtect (optionnel)
- Nombre d'utilisateurs connectés
- Liste des utilisateurs (username, IP, login time)

**Commande PAN-OS**: `show global-protect-gateway current-user`

---

### 2. Analyse TSF avancée

#### Fichiers parsés
- `var/log/pan/mp-monitor.log` - Historique management plane
- `var/log/pan/dp-monitor.log` - Historique dataplane
- `var/cores/crashinfo/*` - Backtraces des crashes
- `opt/pancfg/mgmt/saved-configs/running-config.xml` - Configuration
- `var/log/pan/ms.log` - Logs management server
- `var/log/pan/useridd.log` - Logs User-ID
- `var/log/pan/devsrvr.log` - Logs device server

#### Détection automatique de problèmes

**30+ patterns d'erreurs connus** incluant :

**Crashes & Panics**
- Segfault pan_task
- Kernel panic
- Crash device server

**Mémoire**
- Out of memory
- Swap saturé
- Fuites mémoire

**High Availability**
- Perte de communication HA
- Split-brain
- Échec de synchronisation
- Preemption

**Dataplane**
- Redémarrage dataplane
- Buffers saturés
- Table de sessions pleine

**Réseau**
- Interfaces down
- Erreurs CRC/Frame
- Problèmes ARP

**VPN**
- Échec négociation IKE
- Tunnels IPSec down

**Authentification**
- LDAP timeout
- RADIUS no response

**Licences**
- Licences expirées
- Échec mise à jour signatures

**Disque**
- Disque saturé
- Erreurs I/O

**Performance**
- CPU overload
- SSL decrypt overload

**Routing**
- BGP peer down
- OSPF neighbor down
- Route flapping

---

### 3. Moteur de diagnostic intelligent

#### Analyses TAC-level

**analyzeDataplaneCPU()**
- Détection CPU élevé par core
- Identification des cores saturés
- Recommandations d'optimisation

**analyzePacketDrops()**
- Analyse des drops par raison
- Priorisation par volume
- Recommandations ciblées (policy, routing, zone)

**analyzeHAHealth()**
- Vérification état peer
- Contrôle synchronisation
- Détection de problèmes de redondance

**analyzeVPNTunnels()**
- Détection tunnels IKE down
- Analyse tunnels IPSec
- Recommandations de troubleshooting

**analyzeRoutingStability()**
- Détection peers BGP down
- Analyse stabilité OSPF
- Identification de problèmes de connectivité

#### Corrélation Live + TSF

**correlateMetrics()**
- Compare CPU actuel vs historique TSF
- Identifie les tendances (increasing/decreasing/stable)
- Détecte les crashes récurrents
- Fournit du contexte historique
- Calcule la récurrence des problèmes

---

### 4. Interface utilisateur

#### Diagnostic Center

**Health Score (0-100)**
- Visualisation circulaire
- Code couleur (vert/jaune/orange/rouge)
- Label (Excellent/Bon/Attention/Critique)

**Statistiques**
- Critical (rouge)
- Major (orange)
- Warning (jaune)
- Info (bleu)

**Liste des problèmes**
- Groupés par sévérité
- Expandables pour détails
- Icônes de tendance (↑↓−)
- Source (live/tsf/combined)

**Détails d'un problème**
- Impact
- Recommandation
- Commandes CLI
- Composants affectés
- Contexte TSF (si applicable)

**Actions**
- Refresh Live
- Export (JSON)

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PaloMalo Frontend                     │
├─────────────────────────────────────────────────────────┤
│  Diagnostic Center (React)                              │
│  - Health Score                                         │
│  - Issues List                                          │
│  - TSF Upload                                           │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                      API Routes                          │
├─────────────────────────────────────────────────────────┤
│  /api/metrics-advanced    → AdvancedMetrics            │
│  /api/diagnostic          → Correlation + Analysis      │
│  /api/tsf/upload          → TSF Parsing                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend Logic                         │
├─────────────────────────────────────────────────────────┤
│  lib/panos.ts             → PAN-OS API calls            │
│  lib/advanced-parsers.ts  → Parse XML responses         │
│  lib/tsf-parser.ts        → Parse TSF files             │
│  lib/tsf-analyzer.ts      → Pattern detection           │
│  lib/diagnostic-engine.ts → Analysis + Correlation      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│                  Palo Alto Firewall                      │
├─────────────────────────────────────────────────────────┤
│  XML API (type=op)                                      │
│  - show running resource-monitor                        │
│  - show counter global                                  │
│  - show high-availability all                           │
│  - show routing summary/bgp/ospf                        │
│  - show vpn ike-sa/ipsec-sa                            │
│  - show global-protect-gateway current-user            │
└─────────────────────────────────────────────────────────┘
```

---

## Utilisation

### 1. Diagnostic Live

```typescript
// Récupérer les métriques avancées
const response = await fetch("/api/metrics-advanced");
const metrics: AdvancedMetrics = await response.json();

// Lancer le diagnostic
const diagResponse = await fetch("/api/diagnostic", {
  method: "POST",
  body: JSON.stringify({
    liveMetrics,
    advancedMetrics: metrics,
  }),
});

const result = await diagResponse.json();
// result.issues: DiagnosticIssue[]
// result.healthScore: number (0-100)
// result.stats: { critical, major, warning, info }
```

### 2. Diagnostic avec TSF

```typescript
// Upload TSF
const formData = new FormData();
formData.append("file", tsfFile);

const uploadResponse = await fetch("/api/tsf/upload", {
  method: "POST",
  body: formData,
});

const tsfData: TSFData = await uploadResponse.json();

// Diagnostic avec corrélation
const diagResponse = await fetch("/api/diagnostic", {
  method: "POST",
  body: JSON.stringify({
    liveMetrics,
    advancedMetrics,
    tsfData,
  }),
});

const result = await diagResponse.json();
// result.issues inclut maintenant les problèmes corrélés
// avec trend, recurrence, tsfContext
```

---

## Types TypeScript

### AdvancedMetrics

```typescript
interface AdvancedMetrics {
  resourceMonitor: {
    dataplane: { core: number; usage: number }[];
    packetDescriptor: number;
    sessionUtilization: number;
    bufferUtilization: number;
  };
  counters: {
    drops: { name: string; count: number; severity: string; reason: string }[];
    warnings: { name: string; count: number }[];
  };
  ha: {
    enabled: boolean;
    localState: string;
    peerState: string;
    syncStatus: string;
    lastFailover?: string;
  };
  routing: {
    totalRoutes: number;
    bgpPeers: { peer: string; state: string; prefixes: number }[];
    ospfNeighbors: { neighbor: string; state: string }[];
  };
  vpn: {
    ikeSa: { name: string; peer: string; state: string }[];
    ipsecSa: { name: string; spi: string; encapPackets: number }[];
  };
  globalProtect?: {
    connectedUsers: number;
    users: { username: string; ip: string; loginTime: string }[];
  };
}
```

### TSFAnalysisDeep

```typescript
interface TSFAnalysisDeep extends TSFData {
  crashes: {
    timestamp: string;
    process: string;
    backtrace: string;
    possibleCause: string;
  }[];
  history: {
    cpuTrend: { time: string; value: number }[];
    memoryTrend: { time: string; value: number }[];
    sessionTrend: { time: string; value: number }[];
  };
  configIssues: {
    type: string;
    description: string;
    location: string;
  }[];
  knownIssues: {
    pattern: string;
    matches: string[];
    kbArticle?: string;
  }[];
}
```

### CorrelatedIssue

```typescript
interface CorrelatedIssue extends DiagnosticIssue {
  trend?: "increasing" | "stable" | "decreasing";
  firstSeen?: string;
  recurrence?: number;
  tsfContext?: string;
}
```

---

## Fichiers créés/modifiés

### Nouveaux fichiers

- `lib/advanced-parsers.ts` - Parsers pour métriques avancées
- `lib/tsf-analyzer.ts` - Détection de patterns d'erreurs
- `app/api/metrics-advanced/route.ts` - API métriques avancées
- `components/diagnostic/DiagnosticCenter.tsx` - UI principale
- `components/ui/tabs.tsx` - Composant Tabs

### Fichiers modifiés

- `types/index.ts` - Ajout AdvancedMetrics, TSFAnalysisDeep, CorrelatedIssue
- `lib/panos.ts` - Ajout fonctions pour métriques avancées
- `lib/tsf-parser.ts` - Extension pour mp-log, dp-monitor, crashinfo
- `lib/diagnostic-engine.ts` - Ajout analyses TAC-level + corrélation
- `app/api/diagnostic/route.ts` - Support corrélation live+TSF
- `app/dashboard/diagnostics/page.tsx` - Intégration DiagnosticCenter

---

## Performance

- **Métriques avancées** : ~2-3 secondes (appels API parallèles)
- **Parsing TSF** : ~5-10 secondes (selon taille du fichier)
- **Analyse diagnostic** : <1 seconde
- **Corrélation** : <1 seconde

---

## Roadmap

### Phase suivante (optionnel)

- Timeline visuelle des événements TSF
- Comparaison live vs TSF (graphiques)
- Export PDF du rapport
- Alertes automatiques par email
- Intégration avec systèmes de ticketing
- Analyse de tendances sur plusieurs TSF
- Recommandations IA basées sur ML

---

## Support

Pour toute question sur le diagnostic TAC-level :

- Documentation PAN-OS : https://docs.paloaltonetworks.com
- Knowledge Base : https://knowledgebase.paloaltonetworks.com
- TAC Support : https://support.paloaltonetworks.com

---

**Version** : 1.0.0  
**Date** : 8 avril 2026  
**Auteur** : PaloMalo Team
