# Changelog

Toutes les modifications notables de PaloDiag seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/lang/fr/).

## [1.0.0] - 2026-04-06

### 🎉 Version initiale

#### Ajouté
- **Connexion sécurisée** au firewall PAN-OS via API keygen
- **Dashboard en temps réel** avec métriques système (CPU, Memory, Disk, Uptime)
- **Monitoring des interfaces** : 149+ interfaces (Ethernet, AE, Sub-AE)
  - Status, Speed, Duplex
  - RX/TX Bytes, Packets, Errors, Drops
  - Utilization %
  - Détection automatique de problèmes
- **Graphiques interactifs** (CPU/Memory, Sessions) avec Recharts
- **Refresh automatique** toutes les 30 secondes
- **Moteur de diagnostic IA** :
  - Analyse automatique des métriques live
  - Détection de problèmes par sévérité (Critical, Major, Warning, Info)
  - Score de santé global (0-100)
  - Recommandations détaillées avec commandes CLI copiables
- **Upload et parsing de Tech Support Files** (.tgz / .tar.gz)
  - Extraction des données système, hardware, processus, logs, HA, licenses
  - Analyse combinée (Live + TSF)
- **Interface ultra-moderne** :
  - Design dark avec glassmorphism
  - Animations fluides avec Framer Motion
  - Responsive (mobile, tablet, desktop)
  - Loading skeletons
- **Gestion de session** robuste avec cookies HTTP-only
- **Support des certificats auto-signés**
- **Tests E2E complets** (90% de réussite)

#### Sécurité
- Credentials jamais exposés côté client
- Clé API stockée dans cookie HTTP-only
- Validation des inputs côté serveur
- Protection CSRF avec SameSite=strict

#### Documentation
- README complet avec installation, utilisation, architecture
- Tests automatisés
- Commentaires de code détaillés

---

## [Unreleased]

### À venir dans la version 1.1
- Graphiques d'interfaces individuelles avec historique
- Export PDF des rapports de diagnostic
- Historique des diagnostics
- Alertes par email/webhook
- Mode comparaison de configurations

### À venir dans la version 2.0
- Support multi-firewall
- Analyse de traffic (Application-ID)
- Intégration Panorama
- API REST publique
- Dashboard personnalisable

---

## Notes de version

### Version 1.0.0 - Détails techniques

**Performances :**
- Temps de chargement initial : ~2-3 secondes
- Récupération des métriques : ~3-5 secondes (149 interfaces)
- Parsing TSF : ~1-2 secondes (fichier de 50MB)
- Diagnostic automatique : ~500ms

**Compatibilité :**
- PAN-OS 9.0+
- Navigateurs : Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

**Limitations connues :**
- Maximum 500MB pour les fichiers TSF
- Refresh automatique limité à 30 secondes minimum
- Pas de support multi-firewall (1 seul firewall à la fois)

---

[1.0.0]: https://github.com/votre-username/palodiag/releases/tag/v1.0.0
[Unreleased]: https://github.com/votre-username/palodiag/compare/v1.0.0...HEAD
