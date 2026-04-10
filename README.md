# 🔥 PaloMalo

> **L'outil de diagnostic et monitoring professionnel pour firewalls Palo Alto Networks**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Version](https://img.shields.io/badge/version-1.5.0-brightgreen)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

PaloMalo est une plateforme web moderne conçue pour les ingénieurs réseau, les équipes TAC et les administrateurs de firewalls Palo Alto Networks. Elle offre un diagnostic en temps réel de niveau TAC, une analyse approfondie des Tech Support Files (TSF), un historique persistant, des exports PDF et des alertes webhook.

---

## ✨ Fonctionnalités

### 🔑 Authentification Applicative
- **Page de login** (`/login`) : connexion à PaloMalo avant tout accès au dashboard
- **Credentials locaux** : username/password hashé bcrypt (cost 12), stocké dans `data/users.json`
- **Keycloak / OAuth2** : SSO via OIDC, activé par variables d'environnement
- **Rôles** :
  - `admin` — accès complet + gestion des utilisateurs
  - `operator` — diagnostics, Fleet, alertes, lecture/écriture
  - `viewer` — lecture seule (overview, interfaces, historique)
- **Compte par défaut** : `admin` / `PaloMalo@2024` (à changer en production)
- **Middleware** : protection automatique de toutes les routes `/dashboard/*` et `/api/*`
- **Gestion des utilisateurs** (`/dashboard/users`) : créer, modifier, supprimer des comptes (admin uniquement)

### 🔐 Connexion Firewall (PAN-OS)
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

### Configuration Keycloak (optionnel)

Décommenter dans `.env.local` :

```bash
AUTH_KEYCLOAK_ID=palomalo
AUTH_KEYCLOAK_SECRET=<client-secret>
AUTH_KEYCLOAK_ISSUER=https://keycloak.example.com/realms/palomalo
NEXT_PUBLIC_KEYCLOAK_ENABLED=true
```

Créer les rôles dans Keycloak : `palomalo-admin`, `palomalo-operator` (les utilisateurs sans ces rôles obtiennent `viewer`).

---

## 📖 Utilisation

### 1. Connexion à PaloMalo

1. Accédez à `http://localhost:3000` → redirigé vers `/login`
2. Connectez-vous avec `admin` / `PaloMalo@2024` (ou via Keycloak si configuré)
3. Changez le mot de passe admin depuis **Utilisateurs** → modifier

### 2. Connexion au Firewall

1. Depuis le dashboard, entrez l'URL/IP du firewall, votre username et password PAN-OS
2. Cliquez sur **Se connecter**

### 4. Dashboard Principal

- **Cartes métriques** : CPU, Memory, Sessions, Interfaces
- **Graphiques** : CPU/Memory historique, Sessions actives
- **Table des interfaces** avec détection automatique de problèmes (cliquable → détail)

### 5. Diagnostic TAC

1. Naviguez vers **Diagnostics** dans la sidebar
2. Cliquez sur **Lancer le diagnostic**
3. Le diagnostic est automatiquement sauvegardé dans l'historique
4. Les alertes webhook sont déclenchées si des seuils sont dépassés

### 6. Historique & Export PDF

1. Naviguez vers **Historique** dans la sidebar
2. Cliquez sur un diagnostic pour voir le détail
3. Cliquez sur **Exporter PDF** pour télécharger le rapport

### 7. Configuration des Alertes

1. Naviguez vers **Alertes** dans la sidebar
2. Entrez l'URL de votre webhook Slack/Teams
3. Activez les règles souhaitées et ajustez les seuils
4. Cliquez sur **Tester** pour valider la configuration

### 8. Upload TSF

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
│   ├── pdf-generator.ts              # Génération PDF
│   ├── fleet-store.ts                # Gestion flotte firewalls
│   ├── auth.ts                       # NextAuth v5 (Credentials + Keycloak)
│   └── user-store.ts                 # CRUD utilisateurs + bcrypt
├── middleware.ts                     # Protection routes + RBAC
├── types/index.ts                    # Types TypeScript
└── data/                             # Stockage JSON local (gitignored)
    ├── diagnostic-history.json
    ├── alert-config.json
    ├── fleet.json
    ├── fleet-snapshots.json
    └── users.json
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
| Auth | [NextAuth v5 (Auth.js)](https://authjs.dev/) |
| Crypto | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| XML | [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js) |
| TSF | [tar-stream](https://github.com/mafintosh/tar-stream) |

---

## 🔒 Sécurité

- ✅ **Authentification applicative** : session JWT NextAuth, toutes les routes protégées
- ✅ **RBAC** : contrôle d'accès par rôle (admin / operator / viewer) au niveau middleware
- ✅ **Mots de passe hashés** : bcrypt cost 12, jamais stockés en clair
- ✅ **Credentials PAN-OS** jamais exposés côté client (cookie HTTP-only)
- ✅ **Credentials Fleet** : mots de passe des firewalls jamais renvoyés au client (`FirewallEntrySafe`)
- ✅ **Mot de passe SMTP** masqué côté client (`••••••`)
- ✅ **Validation des inputs** côté serveur sur toutes les API
- ✅ **Protection CSRF** avec SameSite=strict
- ✅ **HTTPS requis** en production (`AUTH_URL` à configurer)

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
- [x] Authentification applicative (NextAuth v5, Keycloak/OAuth2, gestion des utilisateurs)
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
