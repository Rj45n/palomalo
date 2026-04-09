# Changelog - Versions 2.x

## [2.1.0] - 8 avril 2026

### 🔧 Corrections majeures

#### Throughput corrigé
- **Corrigé** : Calcul du throughput (affichait 26 TB/s au lieu de MB/s)
- **Avant** : Utilisait les compteurs cumulés totaux (bytes depuis le démarrage)
- **Après** : Calcule le débit réel (bytes/seconde) entre deux mesures
- **Résultat** : Valeurs réalistes (ex: 125 MB/s au lieu de 26 TB/s)

#### Détection problèmes d'interfaces (MAJEUR)
- **Nouveau** : Surveillance active des compteurs d'erreurs/drops
- **Avant** : Alertait sur tous les compteurs non-nuls (même problèmes passés)
- **Après** : Compare entre deux mesures, alerte uniquement si les compteurs **augmentent**
- **Résultat** : Détection précise des problèmes **actifs** uniquement

#### Détection HA peer (MAJEUR)
- **Corrigé** : Fausse alerte "Peer HA inaccessible" alors que HA fonctionne
- **Avant** : Alertait si `peerState === "unknown"` (problème de parsing)
- **Après** : Alerte uniquement sur états vraiment problématiques (disconnected, non-functional, suspended)
- **Parsing amélioré** : Vérifie plusieurs champs XML (state, ha-state, status, conn-status)
- **Résultat** : Pas de fausse alerte si HA fonctionne correctement

### ✨ Améliorations

#### Analyse d'interfaces intelligente
- **Nouveau** : Cache des compteurs précédents
- **Nouveau** : Calcul du delta (différence entre mesures)
- **Nouveau** : Taux par seconde (erreurs/s, drops/s)
- **Nouveau** : Sévérité dynamique basée sur le taux
- **Nouveau** : Messages "Problème ACTIF" vs "Compteurs historiques"

#### Exemples de détection

**Problème passé (ignoré)** :
```
Mesure 1: rxErrors=1000
Mesure 2: rxErrors=1000 (delta=0)
→ ✅ Aucune alerte (problème résolu)
```

**Problème actif (alerté)** :
```
Mesure 1: rxErrors=1000
Mesure 2: rxErrors=1150 (delta=150)
→ ⚠️ ALERTE: 150 nouvelles erreurs (5.0/s)
```

### 📊 Sévérité dynamique

#### Erreurs
- **Critical** : > 1 erreur/sec
- **Major** : 0.1 - 1 erreur/sec
- **Warning** : < 0.1 erreur/sec

#### Drops
- **Critical** : > 100 drops/sec
- **Major** : 10 - 100 drops/sec
- **Warning** : < 10 drops/sec

### 📁 Fichiers modifiés

- `lib/interface-analyzer.ts` - Ajout cache + détection active
- `lib/diagnostic-engine.ts` - Refonte analyzeNetworkInterfaces()
- `app/dashboard/performance/page.tsx` - Correction calcul throughput
- `ACTIVE_MONITORING.md` - Documentation complète

### 🐛 Bugs corrigés

- ✅ Throughput affichant des valeurs irréalistes (26 TB/s)
- ✅ Faux positifs sur erreurs d'interfaces (problèmes passés)
- ✅ Faux positifs sur drops d'interfaces (problèmes passés)
- ✅ Manque de contexte sur l'évolution des problèmes

---

## [2.0.0] - 8 avril 2026

### 🎉 Nouvelle fonctionnalité majeure : Diagnostic TAC-Level

Transformation de PaloMalo en outil de diagnostic professionnel de niveau TAC (Technical Assistance Center) pour les firewalls Palo Alto Networks.

---

## ✨ Ajouts

### Métriques avancées

#### Resource Monitor
- **Nouveau** : CPU par core dataplane (0-100%)
- **Nouveau** : Utilisation packet descriptors
- **Nouveau** : Utilisation sessions dataplane
- **Nouveau** : Utilisation buffers
- Commande : `show running resource-monitor minute`

#### Counters globaux
- **Nouveau** : Drops de paquets par raison
- **Nouveau** : Catégorisation par sévérité
- **Nouveau** : Identification automatique des causes
- Commande : `show counter global filter delta yes severity drop`

#### High Availability
- **Nouveau** : État local et peer
- **Nouveau** : Status de synchronisation
- **Nouveau** : Dernier failover
- **Nouveau** : Détection split-brain
- Commande : `show high-availability all`

#### Routing
- **Nouveau** : Nombre total de routes
- **Nouveau** : Peers BGP (état, préfixes)
- **Nouveau** : Voisins OSPF
- **Nouveau** : Détection de flapping
- Commandes : `show routing summary`, `show routing protocol bgp summary`

#### VPN
- **Nouveau** : Tunnels IKE (état, peer)
- **Nouveau** : Tunnels IPSec (SPI, paquets)
- **Nouveau** : Détection de tunnels down
- Commandes : `show vpn ike-sa`, `show vpn ipsec-sa`

#### GlobalProtect
- **Nouveau** : Nombre d'utilisateurs connectés
- **Nouveau** : Liste des utilisateurs (IP, login time)
- Commande : `show global-protect-gateway current-user`

### Analyse TSF avancée

#### Nouveaux fichiers parsés
- **Nouveau** : `var/log/pan/mp-monitor.log` - Historique management plane
- **Nouveau** : `var/log/pan/dp-monitor.log` - Historique dataplane
- **Nouveau** : `var/cores/crashinfo/*` - Backtraces des crashes
- **Nouveau** : `opt/pancfg/mgmt/saved-configs/running-config.xml` - Config running
- **Nouveau** : `var/log/pan/useridd.log` - Logs User-ID
- **Nouveau** : `var/log/pan/devsrvr.log` - Logs device server

#### Détection automatique
- **Nouveau** : 30+ patterns d'erreurs connus
- **Nouveau** : Analyse de crashes avec causes probables
- **Nouveau** : Extraction historique CPU/mémoire/sessions
- **Nouveau** : Détection de problèmes de configuration

### Moteur de diagnostic

#### Nouvelles analyses
- **Nouveau** : `analyzeDataplaneCPU()` - Analyse CPU par core
- **Nouveau** : `analyzePacketDrops()` - Catégorisation des drops
- **Nouveau** : `analyzeHAHealth()` - Santé HA
- **Nouveau** : `analyzeVPNTunnels()` - État des tunnels
- **Nouveau** : `analyzeRoutingStability()` - Stabilité routing
- **Nouveau** : `correlateMetrics()` - Corrélation live + TSF

#### Détection de problèmes
- **Nouveau** : Crashes et panics (segfault, kernel panic)
- **Nouveau** : Problèmes mémoire (OOM, swap full)
- **Nouveau** : Problèmes HA (peer down, split-brain, sync failed)
- **Nouveau** : Problèmes dataplane (restart, buffers full)
- **Nouveau** : Problèmes réseau (interfaces down, CRC errors)
- **Nouveau** : Problèmes VPN (IKE failed, tunnels down)
- **Nouveau** : Problèmes authentification (LDAP, RADIUS timeout)
- **Nouveau** : Licences expirées
- **Nouveau** : Disque saturé
- **Nouveau** : CPU overload
- **Nouveau** : Routing instability (BGP/OSPF down, flapping)

### Interface utilisateur

#### Diagnostic Center
- **Nouveau** : Health Score visuel (0-100) avec code couleur
- **Nouveau** : Statistiques par sévérité (Critical/Major/Warning/Info)
- **Nouveau** : Liste de problèmes expandables
- **Nouveau** : Détails complets par problème :
  - Impact
  - Recommandation
  - Commandes CLI
  - Composants affectés
  - Contexte TSF (si applicable)
- **Nouveau** : Indicateurs de tendance (↑↓−)
- **Nouveau** : Source du problème (live/tsf/combined)
- **Nouveau** : Bouton "Refresh Live"
- **Nouveau** : Bouton "Export" (JSON)

#### Onglets
- **Nouveau** : Onglet "Diagnostic TAC-Level"
- **Nouveau** : Onglet "Tech Support File"

### API

#### Nouvelles routes
- **Nouveau** : `GET /api/metrics-advanced` - Métriques avancées
- **Modifié** : `POST /api/diagnostic` - Support corrélation live+TSF

### Types TypeScript

#### Nouveaux types
- **Nouveau** : `AdvancedMetrics` - Métriques avancées
- **Nouveau** : `TSFAnalysisDeep` - Analyse TSF approfondie
- **Nouveau** : `CorrelatedIssue` - Problème avec corrélation

### Fichiers

#### Créés
- `lib/advanced-parsers.ts` (320 lignes)
- `lib/tsf-analyzer.ts` (550 lignes)
- `app/api/metrics-advanced/route.ts` (150 lignes)
- `components/diagnostic/DiagnosticCenter.tsx` (450 lignes)
- `components/ui/tabs.tsx` (100 lignes)
- `DIAGNOSTIC_TAC_LEVEL.md` (documentation complète)
- `IMPLEMENTATION_SUMMARY.md` (résumé implémentation)
- `QUICK_START_DIAGNOSTIC.md` (guide rapide)
- `CHANGELOG_V2.md` (ce fichier)

#### Modifiés
- `types/index.ts` (+80 lignes)
- `lib/panos.ts` (+120 lignes)
- `lib/tsf-parser.ts` (+150 lignes)
- `lib/diagnostic-engine.ts` (+300 lignes)
- `app/api/diagnostic/route.ts` (+50 lignes)
- `app/dashboard/diagnostics/page.tsx` (+100 lignes)

---

## 🔧 Améliorations

### Performance
- Appels API parallèles pour métriques avancées
- Gestion d'erreurs robuste (Promise.allSettled)
- Cache intelligent pour interfaces
- Parsing TSF optimisé

### Qualité du code
- Types TypeScript stricts
- Code commenté en français
- Architecture modulaire
- Pas d'erreurs de linting

### Expérience utilisateur
- Diagnostic automatique au chargement
- Mise à jour automatique après upload TSF
- Interface responsive
- Animations fluides
- Messages d'erreur clairs

---

## 📊 Statistiques

### Code
- **2370 lignes** ajoutées
- **11 fichiers** impactés
- **5 nouveaux fichiers**
- **6 fichiers modifiés**
- **0 erreurs**

### Fonctionnalités
- **8 catégories** de métriques avancées
- **30+ patterns** d'erreurs détectés
- **7 types** de fichiers TSF parsés
- **6 nouvelles analyses** TAC-level
- **1 système** de corrélation intelligent

---

## 🎯 Compatibilité

### Versions
- Next.js 15.0.0 ✅
- React 19.0.0 ✅
- TypeScript 5.x ✅
- PAN-OS 9.0+ ✅

### Navigateurs
- Chrome/Edge 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅

---

## 📚 Documentation

### Nouveaux documents
- `DIAGNOSTIC_TAC_LEVEL.md` - Documentation technique complète
- `IMPLEMENTATION_SUMMARY.md` - Résumé de l'implémentation
- `QUICK_START_DIAGNOSTIC.md` - Guide de démarrage rapide
- `CHANGELOG_V2.md` - Ce changelog

### Mise à jour
- `README.md` - À mettre à jour avec les nouvelles fonctionnalités

---

## 🚀 Migration depuis v1.x

### Pas de breaking changes
- L'API existante reste compatible
- Les métriques basiques fonctionnent toujours
- Ajout de nouvelles routes optionnelles

### Nouveautés accessibles
1. Aller dans "Diagnostics"
2. Le diagnostic TAC-level démarre automatiquement
3. Uploader un TSF pour analyse approfondie (optionnel)

---

## 🐛 Corrections

Aucune correction dans cette version (nouvelles fonctionnalités uniquement).

---

## ⚠️ Limitations connues

### Métriques avancées
- Certaines commandes peuvent échouer si la fonctionnalité n'est pas configurée (HA, BGP, VPN, GP)
- C'est normal et géré gracieusement

### Parsing TSF
- Dépend de la structure du TSF (peut varier selon versions PAN-OS)
- Certains fichiers peuvent ne pas être présents dans tous les TSF

### Performance
- Upload TSF peut prendre 5-10 secondes selon la taille
- Métriques avancées prennent 2-3 secondes

---

## 🔮 Roadmap v2.1

### Prévu
- Timeline visuelle des événements TSF
- Graphiques de comparaison live vs TSF
- Export PDF du rapport
- Alertes automatiques par email

### En réflexion
- Intégration systèmes de ticketing
- Analyse multi-TSF (tendances)
- ML pour prédiction de pannes
- Dashboard temps réel WebSocket

---

## 👥 Contributeurs

- **PaloMalo Team** - Développement complet

---

## 📄 Licence

Même licence que v1.x

---

## 🙏 Remerciements

- **Palo Alto Networks** pour la documentation API
- **Communauté TAC** pour les patterns d'erreurs
- **Next.js Team** pour le framework

---

**Version** : 2.0.0  
**Date** : 8 avril 2026  
**Statut** : Production-ready ✅
