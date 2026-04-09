# 🔥 PaloMalo

> **L'outil de diagnostic et monitoring professionnel pour firewalls Palo Alto Networks**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Version](https://img.shields.io/badge/version-1.5.0-brightgreen)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

PaloMalo est une plateforme web moderne conçue pour les ingénieurs réseau, les équipes TAC et les administrateurs de firewalls Palo Alto Networks. Elle offre un diagnostic en temps réel de niveau TAC, une analyse approfondie des Tech Support Files (TSF), un historique persistant, des exports PDF et des alertes webhook.

---

## ✨ Fonctionnalités

### 🔐 Connexion Sécurisée
- Authentification via API PAN-OS (keygen)
- Credentials stockés dans cookies HTTP-only (jamais exposés côté client)
- Support des certificats auto-signés
- Déconnexion propre avec invalidation de session

### 📊 Monitoring en Temps Réel
- **Métriques système** : CPU, Memory, Disk, Uptime
- **Sessions** : Active, Max, Utilisation
- **Interfaces réseau** : Ethernet, AE, Sub-AE
  - Status (up/down), Throughput RX/TX, Packets, Errors, Drops
- **Graphiques interactifs** avec Recharts (AreaChart, LineChart, BarChart)
- **Refresh automatique** toutes les 30 secondes

### 🖧 Monitoring d'Interfaces Individuelles
- Page dédiée par interface (`/dashboard/interfaces/[name]`)
- Graphiques temps réel : débit RX/TX (Kbps), packets/s, drops & errors
- Ring buffer en mémoire (60 points ≈ 5 min d'historique)
- Sparklines sur la liste des interfaces
- Filtres : all / up / down / problèmes

### 🤖 Diagnostic TAC Complet
- **Data Plane** : CPU par core, tendance 1h, groupes fonctionnels (flow_lookup, app-id, content-id), processus DP (pan_task, pan_comm, pan_hdl…)
- **Management Plane** : CPU total, top 10 processus par consommation
- **Sessions** : utilisation, packet rate, statistiques détaillées
- **Compteurs globaux** : drops, erreurs, avec delta
- **Ingress backlogs** : saturation des cores DP
- **Score de santé** (0–100) avec détection automatique de problèmes
- **Commandes CLI copiables** pour investigation approfondie

### 📦 Analyse Tech Support Files (TSF)
- Upload drag & drop de fichiers `.tgz` / `.tar.gz`
- Parsing complet : system info, hardware, logs, HA, licenses, interfaces, crash logs, mp-log, configurations
- Détection automatique de problèmes depuis le TSF
- Analyse combinée Live + TSF

### 📋 Historique des Diagnostics
- Sauvegarde automatique de chaque diagnostic TAC (max 100 entrées)
- Liste paginée avec health score, hostname, modèle, compteurs d'issues
- Page détail avec métriques et liste complète des problèmes
- Suppression individuelle

### 📄 Export PDF
- Rapport PDF généré côté serveur (`@react-pdf/renderer`)
- Header avec hostname/modèle/version, health score coloré
- Métriques en grille, issues avec couleurs par sévérité
- Accessible depuis la page détail de l'historique

### 🔔 Alertes Webhook
- 6 règles préconfigurées : DP CPU critique/élevé, mémoire, sessions, health score, drops
- Envoi webhook HTTP compatible **Slack**, **Teams** et tout endpoint custom
- Système de cooldown pour éviter le spam
- Test webhook en direct depuis l'interface
- Seuils modifiables par règle

### 🎨 Interface Ultra-Moderne
- Design dark avec glassmorphism
- Animations fluides avec Framer Motion
- Responsive (mobile, tablet, desktop)
- Loading skeletons pour une UX premium

---

## 🚀 Installation

### Prérequis
- Node.js 20+ et npm
- Accès à un firewall Palo Alto Networks (PAN-OS 9.0+)

### Installation rapide

```bash
git clone https://github.com/Rj45n/palomalo.git
cd palomalo
npm install
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

### Build pour production

```bash
npm run build
npm start
```

---

## 📖 Utilisation

### 1. Connexion au Firewall

1. Accédez à `http://localhost:3000`
2. Entrez l'URL/IP du firewall, votre username et password
3. Cliquez sur **Se connecter**

### 2. Dashboard Principal

- **Cartes métriques** : CPU, Memory, Sessions, Interfaces
- **Graphiques** : CPU/Memory historique, Sessions actives
- **Table des interfaces** avec détection automatique de problèmes (cliquable → détail)

### 3. Diagnostic TAC

1. Naviguez vers **Diagnostics** dans la sidebar
2. Cliquez sur **Lancer le diagnostic**
3. Le diagnostic est automatiquement sauvegardé dans l'historique
4. Les alertes webhook sont déclenchées si des seuils sont dépassés

### 4. Historique & Export PDF

1. Naviguez vers **Historique** dans la sidebar
2. Cliquez sur un diagnostic pour voir le détail
3. Cliquez sur **Exporter PDF** pour télécharger le rapport

### 5. Configuration des Alertes

1. Naviguez vers **Alertes** dans la sidebar
2. Entrez l'URL de votre webhook Slack/Teams
3. Activez les règles souhaitées et ajustez les seuils
4. Cliquez sur **Tester** pour valider la configuration

### 6. Upload TSF

1. Naviguez vers **Diagnostics** → section TSF
2. Glissez-déposez votre fichier `.tgz`
3. L'analyse combinée Live + TSF est automatiquement lancée

---

## 🏗️ Architecture

```
PaloMalo/
├── app/
│   ├── api/
│   │   ├── connect/                  # Authentification PAN-OS
│   │   ├── metrics/                  # Métriques temps réel
│   │   ├── metrics-advanced/         # CPU DP/MP avancé
│   │   ├── diagnostic/
│   │   │   ├── history/              # CRUD historique JSON
│   │   │   └── export-pdf/           # Génération PDF
│   │   ├── diagnostic-live/          # Diagnostic TAC complet
│   │   ├── interfaces/history/       # Ring buffer interfaces
│   │   ├── alerts/
│   │   │   ├── config/               # Config alertes
│   │   │   └── test/                 # Test webhook
│   │   └── tsf/upload/               # Upload TSF
│   └── dashboard/
│       ├── page.tsx                  # Overview
│       ├── performance/              # Performance
│       ├── interfaces/               # Liste interfaces
│       │   └── [name]/               # Détail interface
│       ├── diagnostics/              # Diagnostic TAC + TSF
│       ├── history/                  # Historique
│       │   └── [id]/                 # Détail diagnostic
│       ├── alerts/                   # Configuration alertes
│       ├── security/
│       └── hardware/
├── components/
│   ├── dashboard/
│   │   ├── DashboardLayout.tsx       # Sidebar + layout
│   │   ├── InterfaceDetailChart.tsx  # Graphiques interface
│   │   ├── SparklineChart.tsx        # Mini graphique
│   │   └── ...
│   └── diagnostic/
│       └── TACDiagnostic.tsx         # Vue diagnostic TAC
├── lib/
│   ├── panos.ts                      # API PAN-OS
│   ├── tsf-parser.ts                 # Orchestrateur TSF
│   ├── tsf-parser-*.ts               # Parsers spécialisés
│   ├── diagnostic-history.ts         # Persistance JSON
│   ├── alert-config.ts               # Config alertes
│   ├── alert-engine.ts               # Moteur d'alertes
│   └── pdf-generator.ts              # Génération PDF
├── types/index.ts                    # Types TypeScript
└── data/                             # Stockage JSON local (gitignored)
    ├── diagnostic-history.json
    └── alert-config.json
```

---

## 🔧 Technologies

| Catégorie | Technologie |
|-----------|-------------|
| Framework | [Next.js 15](https://nextjs.org/) App Router |
| Language | [TypeScript](https://www.typescriptlang.org/) strict |
| Styling | [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Charts | [Recharts](https://recharts.org/) |
| PDF | [@react-pdf/renderer](https://react-pdf.org/) |
| XML | [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) |
| TSF | [tar-stream](https://github.com/mafintosh/tar-stream) |

---

## 🔒 Sécurité

- ✅ Credentials jamais exposés côté client
- ✅ Clé API stockée dans cookie HTTP-only
- ✅ Mot de passe SMTP masqué côté client (`••••••`)
- ✅ Validation des inputs côté serveur
- ✅ Protection CSRF avec SameSite=strict
- ✅ HTTPS requis en production

---

## 📈 Roadmap

### v1.0 ✅
- Connexion sécurisée, dashboard temps réel, diagnostic IA, upload TSF

### v1.1 ✅
- Graphiques d'interfaces individuelles (RX/TX, drops, errors temps réel)
- CPU Data Plane : cores, tendance 1h, groupes fonctionnels, processus DP
- Export PDF des rapports de diagnostic
- Historique persistant des diagnostics
- Alertes webhook (Slack / Teams / custom)

### v2.0 ✅
- [x] Support multi-firewall (Fleet — tableau de bord centralisé)
- [ ] Comparaison de configurations entre deux firewalls
- [ ] Analyse de trafic (Application-ID, Top Talkers)
- [ ] Intégration Panorama
- [ ] API REST publique

---

## 📝 Changelog

Voir [CHANGELOG.md](https://github.com/Rj45n/palomalo/blob/main/CHANGELOG.md) pour l'historique complet des versions.

---

## 📄 Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus de détails.

---

## 👤 Auteur

**Romain Jean** — [@Rj45n](https://github.com/Rj45n) — [romain.jean@rj45.cloud](mailto:romain.jean@rj45.cloud)

---

## 📞 Support

- 📧 Email : [romain.jean@rj45.cloud](mailto:romain.jean@rj45.cloud)
- 🐛 Issues : [GitHub Issues](https://github.com/Rj45n/palomalo/issues)

---

<div align="center">
  <strong>Fait avec ❤️ pour la communauté Palo Alto Networks</strong>
</div>
