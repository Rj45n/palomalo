# Architecture de PaloDiag

## Vue d'ensemble

PaloDiag est une application web moderne construite avec Next.js 15, utilisant l'App Router pour une architecture serveur/client optimale.

```
┌─────────────────────────────────────────────────────────────┐
│                      NAVIGATEUR (Client)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Login      │  │  Dashboard   │  │ Diagnostics  │      │
│  │   Page       │  │    Page      │  │    Page      │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │              │
│         └─────────────────┼──────────────────┘              │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │ HTTP/HTTPS
┌───────────────────────────┼─────────────────────────────────┐
│                    SERVEUR NEXT.JS                          │
│  ┌────────────────────────┴──────────────────────────┐      │
│  │              API Routes (Edge/Node)               │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │      │
│  │  │ /connect │  │ /metrics │  │ /tsf/    │       │      │
│  │  │          │  │          │  │ upload   │       │      │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘       │      │
│  └───────┼─────────────┼─────────────┼──────────────┘      │
│          │             │             │                      │
│  ┌───────┴─────────────┴─────────────┴──────────────┐      │
│  │           Lib (Business Logic)                    │      │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │      │
│  │  │ panos.ts │  │tsf-parser│  │diagnostic│       │      │
│  │  │          │  │   .ts    │  │-engine.ts│       │      │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘       │      │
│  └───────┼─────────────┼─────────────┼──────────────┘      │
└──────────┼─────────────┼─────────────┼─────────────────────┘
           │             │             │
           │ XML/API     │ Parse .tgz  │ Analyze
           │             │             │
┌──────────┴─────────────┴─────────────┴─────────────────────┐
│                  FIREWALL PALO ALTO                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   PAN-OS     │  │   Tech       │  │   Metrics    │     │
│  │   API        │  │   Support    │  │   (Live)     │     │
│  │   (XML)      │  │   File       │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## Composants Principaux

### 1. Frontend (React + Next.js)

#### Pages
- **`app/page.tsx`** : Page de connexion avec formulaire sécurisé
- **`app/dashboard/page.tsx`** : Dashboard principal avec métriques live
- **`app/dashboard/diagnostics/page.tsx`** : Page de diagnostic + upload TSF

#### Composants
- **`components/dashboard/`** : Composants du dashboard
  - `DashboardLayout` : Layout avec sidebar et header
  - `MetricCard` : Carte de métrique individuelle
  - `CPUMemoryChart` : Graphique CPU/Memory
  - `SessionsChart` : Graphique des sessions
  - `InterfacesTableEnhanced` : Table des interfaces avec alertes
  - `InterfaceIssuesPanel` : Panneau des problèmes d'interfaces
  - `MetricsSkeleton` : Loading skeleton
- **`components/diagnostic/`** : Composants de diagnostic
  - `DiagnosticPanel` : Panneau principal avec score de santé et problèmes
- **`components/tsf/`** : Composants TSF
  - `TSFUpload` : Upload drag & drop
  - `TSFDataView` : Affichage des données TSF
- **`components/ui/`** : Composants shadcn/ui réutilisables

---

### 2. Backend (API Routes)

#### `/api/connect`
- **POST** : Authentification PAN-OS (keygen)
- **GET** : Vérification de session
- **DELETE** : Déconnexion

#### `/api/metrics`
- **GET** : Récupération des métriques live
  - Système (CPU, Memory, Disk)
  - Sessions
  - Interfaces (avec stats détaillées)
  - Détection automatique de problèmes d'interfaces

#### `/api/diagnostic`
- **POST** : Analyse complète du firewall
  - Métriques live + TSF (optionnel)
  - Retourne : liste de problèmes + score de santé

#### `/api/tsf/upload`
- **POST** : Upload et parsing de Tech Support File
  - Accepte : .tgz, .tar.gz (max 500MB)
  - Retourne : données extraites

---

### 3. Lib (Business Logic)

#### `lib/panos.ts`
Gestion de l'API PAN-OS :
- `generateApiKey()` : Génération de clé API via keygen
- `executeCommand()` : Exécution de commandes PAN-OS
- `getInterfaceConfig()` : Récupération de la configuration des interfaces
- `getInterfaceStats()` : Récupération des stats opérationnelles

**Commandes PAN-OS utilisées :**
```xml
<show><system><info></info></system></show>
<show><system><resources></resources></system></show>
<show><session><info></info></session></show>
<show><counter><interface><name></name></interface></counter></show>
```

#### `lib/tsf-parser.ts`
Parsing de Tech Support Files :
- Extraction de fichiers .tgz avec `tar-stream` et `zlib`
- Parsing XML avec `xml2js`
- Parsing de texte brut (logs, top, etc.)
- Extraction de :
  - System info
  - Hardware metrics
  - Processes
  - Logs (critical, errors, warnings)
  - HA status
  - Licenses
  - Interfaces
  - Sessions

#### `lib/diagnostic-engine.ts`
Moteur de diagnostic intelligent :
- `analyzeFirewall()` : Analyse complète
- `analyzeSystemMetrics()` : CPU, Memory, Disk
- `analyzeNetworkInterfaces()` : Erreurs, Drops, Utilization
- `analyzeSessions()` : Saturation de la table
- `analyzeTSFData()` : Logs, HA, Licenses, Processus
- `calculateHealthScore()` : Score 0-100

**Seuils de détection :**
- CPU : Critical > 90%, Warning > 75%
- Memory : Critical > 90%, Warning > 80%
- Disk : Critical > 90%
- Interface Errors : Critical > 100, Warning > 0
- Interface Drops : Critical > 1000, Warning > 0
- Interface Utilization : Critical > 95%, Warning > 85%
- Sessions : Critical > 95%, Warning > 85%

#### `lib/interface-analyzer.ts`
Analyse spécifique des interfaces :
- `analyzeInterfaces()` : Détection de problèmes
- `calculateUtilization()` : Calcul de l'utilisation en %

---

## Flux de Données

### 1. Connexion

```
User Input (URL, Username, Password)
  ↓
POST /api/connect
  ↓
lib/panos.ts → generateApiKey()
  ↓
PAN-OS API: type=keygen
  ↓
Parse XML Response
  ↓
Store API Key in HTTP-only Cookie
  ↓
Redirect to /dashboard
```

### 2. Dashboard Live Metrics

```
Dashboard Page Load
  ↓
GET /api/metrics (with cookie)
  ↓
lib/panos.ts → executeCommand()
  ↓
PAN-OS API: show system info, show system resources, etc.
  ↓
Parse XML Responses
  ↓
lib/interface-analyzer.ts → analyzeInterfaces()
  ↓
Return DashboardMetrics + InterfaceIssues
  ↓
POST /api/diagnostic (automatic)
  ↓
lib/diagnostic-engine.ts → analyzeFirewall()
  ↓
Return DiagnosticIssues + HealthScore
  ↓
Display in UI
  ↓
Auto-refresh every 30s
```

### 3. TSF Upload & Analysis

```
User Drag & Drop .tgz file
  ↓
POST /api/tsf/upload (FormData)
  ↓
lib/tsf-parser.ts → parseTSF()
  ↓
Extract .tgz with tar-stream
  ↓
Parse each file (XML, text)
  ↓
Return TSFData
  ↓
Display in TSFDataView
  ↓
(Optional) POST /api/diagnostic with TSFData
  ↓
Combined analysis (Live + TSF)
```

---

## Sécurité

### Authentification
- **Keygen API** : Génération de clé API temporaire
- **HTTP-only Cookies** : Stockage sécurisé (pas accessible en JS)
- **SameSite=strict** : Protection CSRF
- **Secure flag** : HTTPS uniquement en production

### Validation
- **Côté serveur** : Tous les inputs sont validés
- **Côté client** : Validation HTML5 + React

### Certificats
- **Auto-signés** : Support en développement (`rejectUnauthorized: false`)
- **Production** : Certificats valides requis

---

## Performance

### Optimisations
- **Caching** : Cache des stats d'interfaces (20 secondes)
- **Batch Fetching** : Récupération parallèle des stats (5 à la fois)
- **Limite** : 20 interfaces avec stats détaillées (pour éviter timeout)
- **Streaming** : Parsing TSF en streaming (pas de chargement complet en mémoire)

### Métriques
- **Temps de réponse** :
  - `/api/connect` : ~1-2s
  - `/api/metrics` : ~3-5s (149 interfaces)
  - `/api/diagnostic` : ~500ms
  - `/api/tsf/upload` : ~1-2s (fichier 50MB)
- **Taille des réponses** :
  - `/api/metrics` : ~50-100KB
  - `/api/diagnostic` : ~10-20KB
  - `/api/tsf/upload` : ~20-50KB

---

## Technologies

| Composant | Technologie | Version | Raison |
|-----------|-------------|---------|--------|
| Framework | Next.js | 15.0 | App Router, SSR, API Routes |
| Language | TypeScript | 5.0 | Type safety, DX |
| Styling | Tailwind CSS | 3.4 | Utility-first, responsive |
| UI Components | shadcn/ui | - | Composants réutilisables |
| Animations | Framer Motion | 11.15 | Animations fluides |
| Charts | Recharts | 2.15 | Graphiques interactifs |
| XML Parsing | xml2js | 0.6 | Parse PAN-OS XML |
| TSF Parsing | tar-stream | - | Extract .tgz files |

---

## Évolutivité

### Scalabilité Horizontale
- **Stateless** : Pas d'état serveur (cookies uniquement)
- **Cache externe** : Possibilité d'ajouter Redis pour le cache
- **Load Balancer** : Support natif (Next.js)

### Scalabilité Verticale
- **Optimisation mémoire** : Streaming pour TSF
- **Optimisation CPU** : Parsing asynchrone
- **Optimisation réseau** : Compression gzip

### Multi-firewall (Future)
- **Session par firewall** : Cookies avec préfixe
- **Dashboard multi-firewall** : Sélection dans UI
- **Comparaison** : Analyse comparative

---

## Déploiement

### Environnements

#### Développement
```bash
npm run dev
```
- Hot reload
- Certificats auto-signés acceptés
- Source maps

#### Production
```bash
npm run build
npm start
```
- Build optimisé
- Minification
- HTTPS requis
- Certificats valides

### Docker (Future)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Monitoring & Logs

### Logs Serveur
- **Console** : Logs détaillés des API calls
- **Format** : `[timestamp] [level] message`
- **Niveaux** : INFO, WARN, ERROR

### Métriques (Future)
- **Prometheus** : Métriques applicatives
- **Grafana** : Dashboards
- **Sentry** : Error tracking

---

## Tests

### Types de tests
- **E2E** : Tests end-to-end complets
- **Unit** : Tests unitaires des fonctions
- **Integration** : Tests des API routes

### Coverage
- **Actuel** : 90% (9/10 tests E2E)
- **Objectif** : 95%

---

## Maintenance

### Mises à jour
- **Dependencies** : Vérification mensuelle
- **Security** : Patches immédiats
- **PAN-OS API** : Suivi des changements

### Backup
- **Code** : Git + GitHub
- **Config** : Variables d'environnement
- **Données** : Pas de base de données (stateless)

---

## Références

- [Next.js Documentation](https://nextjs.org/docs)
- [PAN-OS XML API](https://docs.paloaltonetworks.com/pan-os/10-2/pan-os-panorama-api)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
