# 🔥 PaloDiag

> **L'outil de diagnostic et monitoring professionnel pour firewalls Palo Alto Networks**

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

PaloDiag est une plateforme web moderne et intuitive conçue pour les ingénieurs réseau, les équipes TAC et les administrateurs de firewalls Palo Alto Networks. Elle offre un diagnostic en temps réel, une analyse intelligente des Tech Support Files (TSF) et des recommandations automatiques de type "Palo Alto TAC Support".

---

## ✨ Fonctionnalités

### 🔐 Connexion Sécurisée
- Authentification via API PAN-OS (keygen)
- Stockage sécurisé des credentials (cookies HTTP-only)
- Support des certificats auto-signés
- Gestion de session robuste

### 📊 Monitoring en Temps Réel
- **Métriques système** : CPU, Memory, Disk, Uptime
- **Sessions** : Active, Max, Utilisation
- **Interfaces réseau** : 149+ interfaces (Ethernet, AE, Sub-AE)
  - Status (up/down)
  - Throughput (RX/TX)
  - Packets, Errors, Drops
  - Utilization %
- **Graphiques interactifs** avec Recharts
- **Refresh automatique** toutes les 30 secondes

### 🤖 Diagnostic IA / Support Mode
- **Analyse automatique** des métriques live
- **Détection de problèmes** par catégorie :
  - 🔴 Critiques (CPU > 90%, Memory > 90%, Interfaces DOWN)
  - 🟠 Majeurs (Licenses expirées, HA non synchronisé)
  - 🟡 Warnings (Erreurs, Drops, Utilisation élevée)
- **Score de santé global** (0-100)
- **Recommandations détaillées** avec :
  - Description du problème
  - Impact sur le système
  - Actions correctives
  - **Commandes CLI copiables** pour diagnostic approfondi

### 📦 Tech Support File (TSF) Analysis
- **Upload drag & drop** de fichiers .tgz / .tar.gz
- **Parsing automatique** :
  - Informations système (hostname, model, serial, version, uptime)
  - Hardware (CPU, Memory, Disk)
  - Top processus consommateurs
  - Logs (Critical, Errors, Warnings)
  - High Availability status
  - Licenses
  - Interfaces et sessions
- **Analyse combinée** (Live + TSF) pour un diagnostic complet

### 🎨 Interface Ultra-Moderne
- **Design dark** avec glassmorphism
- **Animations fluides** avec Framer Motion
- **Responsive** (mobile, tablet, desktop)
- **Couleurs Palo Alto** (bleu #0072B8, orange #FF6B35)
- **Loading skeletons** pour une UX premium

---

## 🚀 Installation

### Prérequis
- Node.js 20+ et npm
- Accès à un firewall Palo Alto Networks (PAN-OS 9.0+)

### Installation rapide

```bash
# Cloner le repository
git clone https://github.com/Rj45n/palomalo.git
cd palomalo

# Installer les dépendances
npm install

# Lancer en développement
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

### Build pour production

```bash
# Build optimisé
npm run build

# Lancer en production
npm start
```

---

## 📖 Utilisation

### 1. Connexion au Firewall

1. Accédez à `http://localhost:3000`
2. Entrez les informations de connexion :
   - **URL/IP** : `192.168.1.1` ou `firewall.example.com`
   - **Username** : Votre nom d'utilisateur PAN-OS
   - **Password** : Votre mot de passe
3. Cliquez sur **Se connecter**

### 2. Dashboard Principal

Le dashboard affiche en temps réel :
- **Cartes métriques** : CPU, Memory, Sessions, Interfaces
- **Graphiques** : CPU/Memory historique, Sessions actives
- **Table des interfaces** avec détection automatique de problèmes
- **Panneau de diagnostic** avec score de santé et recommandations

### 3. Upload d'un Tech Support File

1. Naviguez vers **Diagnostics** dans la sidebar
2. Glissez-déposez votre fichier `.tgz` ou cliquez pour sélectionner
3. Le fichier est automatiquement parsé et analysé
4. Consultez les données extraites et les problèmes détectés

### 4. Diagnostic Complet

Le moteur de diagnostic analyse automatiquement :
- ✅ Métriques système (CPU, Memory, Disk)
- ✅ Interfaces réseau (Errors, Drops, Utilization)
- ✅ Sessions (Saturation)
- ✅ Logs critiques (si TSF uploadé)
- ✅ High Availability (si TSF uploadé)
- ✅ Licenses (si TSF uploadé)

Pour chaque problème, vous obtenez :
- **Sévérité** (Critical, Major, Warning, Info)
- **Description** claire du problème
- **Impact** sur le firewall
- **Recommandations** étape par étape
- **Commandes CLI** à copier-coller pour investigation

---

## 🏗️ Architecture

```
PaloDiag/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── connect/              # Authentification PAN-OS
│   │   ├── metrics/              # Métriques en temps réel
│   │   ├── diagnostic/           # Moteur de diagnostic
│   │   └── tsf/upload/           # Upload TSF
│   ├── dashboard/                # Dashboard principal
│   │   └── diagnostics/          # Page diagnostics + TSF
│   ├── layout.tsx                # Layout racine
│   ├── page.tsx                  # Page de connexion
│   └── globals.css               # Styles globaux
├── components/                   # Composants React
│   ├── dashboard/                # Composants dashboard
│   │   ├── DashboardLayout.tsx
│   │   ├── MetricCard.tsx
│   │   ├── CPUMemoryChart.tsx
│   │   ├── SessionsChart.tsx
│   │   ├── InterfacesTableEnhanced.tsx
│   │   ├── InterfaceIssuesPanel.tsx
│   │   └── MetricsSkeleton.tsx
│   ├── diagnostic/               # Composants diagnostic
│   │   └── DiagnosticPanel.tsx
│   ├── tsf/                      # Composants TSF
│   │   ├── TSFUpload.tsx
│   │   └── TSFDataView.tsx
│   └── ui/                       # Composants shadcn/ui
│       ├── button.tsx
│       ├── input.tsx
│       ├── card.tsx
│       ├── label.tsx
│       └── skeleton.tsx
├── lib/                          # Utilitaires et logique métier
│   ├── panos.ts                  # API PAN-OS (keygen, commands)
│   ├── tsf-parser.ts             # Parser TSF
│   ├── diagnostic-engine.ts      # Moteur de diagnostic IA
│   ├── interface-analyzer.ts     # Analyse des interfaces
│   └── utils.ts                  # Utilitaires généraux
├── types/                        # Types TypeScript
│   └── index.ts
├── public/                       # Assets statiques
├── docs/                         # Documentation détaillée
│   ├── architecture.md
│   ├── api-routes.md
│   ├── tsf-parsing-guide.md
│   ├── diagnostic-engine.md
│   └── contributing.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

---

## 🔧 Technologies

- **Framework** : [Next.js 15](https://nextjs.org/) (App Router)
- **Language** : [TypeScript](https://www.typescriptlang.org/) (strict mode)
- **Styling** : [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Animations** : [Framer Motion](https://www.framer.com/motion/)
- **Charts** : [Recharts](https://recharts.org/)
- **XML Parsing** : [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js)
- **TSF Parsing** : [tar-stream](https://github.com/mafintosh/tar-stream)

---

## 🔒 Sécurité

- ✅ **Credentials jamais exposés côté client**
- ✅ **Clé API stockée dans cookie HTTP-only**
- ✅ **Validation des inputs côté serveur**
- ✅ **Protection CSRF** avec SameSite=strict
- ✅ **HTTPS requis en production**
- ✅ **Support des certificats auto-signés** (dev uniquement)

---

## 🧪 Tests

PaloDiag inclut une suite de tests complète :

```bash
# Tests E2E complets
node test-complete-e2e.js

# Test du moteur de diagnostic
node test-diagnostic-engine.js

# Test du parser TSF
node test-tsf-parser.js

# Test des métriques d'interfaces
node test-interface-metrics.js
```

**Taux de réussite actuel : 90% (9/10 tests)**

---

## 📈 Roadmap

### Version 1.0 (Actuelle)
- ✅ Connexion sécurisée
- ✅ Dashboard temps réel
- ✅ Diagnostic IA
- ✅ Upload et parsing TSF

### Version 1.1 (En cours)
- [x] Graphiques d'interfaces individuelles
- [ ] Export PDF des rapports de diagnostic
- [ ] Historique des diagnostics
- [ ] Alertes par email/webhook

### Version 2.0 (Future)
- [ ] Support multi-firewall
- [ ] Comparaison de configurations
- [ ] Analyse de traffic (Application-ID)
- [ ] Intégration Panorama
- [ ] API REST publique

---

## 🤝 Contribution

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](docs/contributing.md) pour plus de détails.

### Comment contribuer

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📝 Changelog

Voir [CHANGELOG.md](https://github.com/Rj45n/palomalo/blob/main/CHANGELOG.md) pour l'historique complet des versions.

---

## 📄 Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus de détails.

---

## 👥 Auteurs

- **Romain Jean** - *Initial work* - [@Rj45n](https://github.com/Rj45n)

---

## 🙏 Remerciements

- [Palo Alto Networks](https://www.paloaltonetworks.com/) pour leur excellente documentation API
- La communauté open-source pour les outils utilisés
- Tous les contributeurs qui ont participé au projet

---

## 📞 Support

- 📧 Email : [romain.jean@rj45.cloud](mailto:romain.jean@rj45.cloud)
- 🐛 Issues : [GitHub Issues](https://github.com/Rj45n/palomalo/issues)

---

## ⭐ Donnez une étoile !

Si PaloDiag vous a aidé, n'hésitez pas à donner une ⭐ sur GitHub !

---

<div align="center">
  <strong>Fait avec ❤️ pour la communauté Palo Alto Networks</strong>
</div>
