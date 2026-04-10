# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
versionnage selon [Semantic Versioning](https://semver.org/lang/fr/).

---

## [2.1.0] - 2026-04-09

### Ajouté
- **Authentification applicative** (`/login`) : page de connexion dédiée à PaloMalo (séparée des credentials PAN-OS)
  - Formulaire username/password avec bcrypt (cost 12)
  - Bouton "Se connecter avec Keycloak" (activé via variables d'environnement)
  - Compte admin par défaut : `admin` / `PaloMalo@2024`
- **Gestion des utilisateurs** (`/dashboard/users`) : interface admin pour créer, modifier, supprimer des comptes
  - Trois rôles : `admin` (accès complet), `operator` (lecture/écriture), `viewer` (lecture seule)
  - Protection contre la suppression du dernier administrateur et l'auto-suppression
- **Middleware de protection** : toutes les routes `/dashboard/*` et `/api/*` nécessitent une session valide
  - Redirection automatique vers `/login` si non authentifié
  - Contrôle d'accès par rôle (admin-only, operator+, viewer)
- **Intégration Keycloak / OAuth2** : provider OIDC configurable via `.env.local`
  - Mapping automatique des rôles Keycloak (`palomalo-admin` → admin, `palomalo-operator` → operator)
  - Compatible avec tout provider OAuth2 (Azure AD, Google, GitHub…)
- **Sidebar enrichie** : profil utilisateur avec badge de rôle, menu déroulant, déconnexion NextAuth
- **API utilisateurs** : `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/[id]`
- **Persistance** : `data/users.json` (hashé bcrypt, jamais exposé côté client)

### Technique
- NextAuth v5 (Auth.js) avec stratégie JWT
- `lib/auth.ts` : configuration providers + callbacks rôles
- `lib/user-store.ts` : CRUD JSON + bcrypt
- Nouveaux types : `AppUser`, `AppUserSafe`, `UserRole`
- `SessionProvider` dans le layout root

---

## [2.0.0] - 2026-04-09

### Ajouté
- **Fleet multi-firewall** (`/dashboard/fleet`) : tableau de bord centralisé pour gérer et surveiller plusieurs firewalls Palo Alto simultanément
  - Ajout / modification / suppression de firewalls (label, URL, credentials, tags)
  - Collecte des métriques en un clic par firewall ou pour toute la flotte (`/api/fleet/poll`)
  - Résumé global : total, en ligne, dégradés, hors ligne, health score moyen
  - Cartes par firewall : status, DP CPU, mémoire, sessions, issues critiques, barre de santé
  - Page détail par firewall (`/dashboard/fleet/[id]`) avec métriques complètes et gestion des erreurs
- **API Fleet** : `GET/POST /api/fleet`, `GET/PATCH/DELETE /api/fleet/[id]`, `GET/POST /api/fleet/[id]/metrics`, `POST /api/fleet/poll`
- **Persistance** : `data/fleet.json` (firewalls) + `data/fleet-snapshots.json` (derniers snapshots)
- **Sidebar** : ajout du lien "Fleet" avec icône Server
- **Nouveaux types** : `FirewallEntry`, `FirewallEntrySafe`, `FirewallSnapshot`, `FleetSummary`, `FirewallStatus`

### Sécurité
- Les mots de passe des firewalls de la flotte ne sont jamais exposés côté client (`FirewallEntrySafe`)

---

## [1.5.0] - 2026-04-09

### Ajouté
- **Historique des diagnostics** (`/dashboard/history`) : liste paginée de tous les diagnostics TAC passés avec health score, compteurs d'issues, hostname, modèle et version PAN-OS
- **Page détail historique** (`/dashboard/history/[id]`) : métriques clés, liste complète des problèmes détectés, bouton export PDF
- **Export PDF** (`/api/diagnostic/export-pdf`) : rapport PDF généré côté serveur via `@react-pdf/renderer` — header, métriques, liste des issues avec couleurs par sévérité, footer paginé
- **Persistance automatique** : chaque diagnostic TAC lancé est automatiquement sauvegardé dans `data/diagnostic-history.json` (max 100 entrées FIFO)
- **Moteur d'alertes** (`lib/alert-engine.ts`) : évaluation des seuils sur chaque diagnostic, envoi de webhook HTTP compatible Slack/Teams/custom
- **Configuration des alertes** (`/dashboard/alerts`) : 6 règles préconfigurées (DP CPU critique/élevé, mémoire, sessions, health score, drops) avec toggle, seuil modifiable, cooldown, test webhook en direct
- **API alertes** : `GET/POST /api/alerts/config` et `POST /api/alerts/test`
- **Sidebar** : ajout des liens "Historique" et "Alertes"
- **Bouton PDF** dans `TACDiagnostic` : accès rapide à l'historique pour export

### Technique
- Nouveaux types TypeScript : `DiagnosticRecord`, `AlertRule`, `AlertConfig`
- Dossier `data/` pour le stockage persistant JSON (gitignored)
- Fix TypeScript : `Buffer` → `BodyInit` pour la réponse PDF

---

## [1.4.0] - 2026-04-09

### Ajouté
- **Page Interfaces** (`/dashboard/interfaces`) : grille de toutes les interfaces avec statut, sparkline RX, débit estimé, badges d'alertes (errors/drops), filtres (all/up/down/problèmes) et barre de recherche
- **Page détail interface** (`/dashboard/interfaces/[name]`) : graphiques temps réel avec polling toutes les 5s
  - Débit RX/TX en Kbps (AreaChart avec gradient)
  - Packets par seconde RX/TX (LineChart)
  - Drops & Errors RX/TX (LineChart multi-séries)
  - 4 cartes de résumé avec tendance (hausse/baisse)
  - Bouton Pause/Reprendre le polling
- **API `/api/interfaces/history`** : ring buffer en mémoire (60 points = ~5 min) avec calcul des débits par delta entre snapshots
- **Composant `SparklineChart`** : mini graphique AreaChart sans axes pour les cartes d'interface
- **Sidebar** : ajout du lien "Interfaces" avec icône Network
- **Tableau InterfacesTableEnhanced** : noms d'interfaces cliquables vers la page de détail

---

## [1.3.0] - 2026-04-09

### Ajouté
- **Processus Data Plane** dans le diagnostic TAC : affichage des tasks DP (`pan_task`, `pan_comm`, `pan_hdl`, etc.) avec CPU actuel et moyen par processus, barre de progression colorée selon la charge
- Légende de référence des processus DP connus dans l'interface
- Fallback sur les groupes fonctionnels si les tasks individuelles ne sont pas disponibles (compatibilité PAN-OS < 10.x)

### Modifié
- `parseResourceMonitor` enrichi : extraction des tasks DP depuis `resource-monitor/data-processors/dp0/minute/task`, agrégation par nom sur tous les cores

---

## [1.2.0] - 2026-04-09

### Ajouté
- **Tendance CPU 1 heure** (`show running resource-monitor hour`) : graphique LineChart avec CPU moyen et max sur 60 minutes, détection du CPU chroniquement élevé (> 10 min à +80%)
- **Backlogs ingress Data Plane** (`show running resource-monitor ingress-backlogs`) : détection des cores DP saturés avec alerte critique
- **CPU par groupe fonctionnel** (flow_lookup, app-id, content-id, decryption…) extrait du resource-monitor
- **Top processus Management Plane** extraits depuis `show system resources` (format `top`)
- **Statistiques de session étendues** (`show session statistics`) : sessions offloaded, predicted, discard
- 3 nouvelles issues CPU automatiques : `dp-cpu-chronic`, `dp-ingress-backlog`, hot cores
- Nouvelles fonctions dans `lib/panos.ts` : `getResourceMonitorHour`, `getResourceMonitorIngress`, `getGlobalCountersAll`, `getSessionStats`

### Corrigé
- Alignement des cookies d'authentification : `diagnostic-live` lit maintenant `panos_api_key` / `panos_url` (standard) en plus du cookie `panos_session` (legacy), résolvant l'erreur 401 sur l'onglet "Diagnostic TAC Complet"

---

## [1.1.0] - 2026-04-08

### Ajouté
- Composants shadcn/ui manquants : `badge`, `progress`, `scroll-area`
- **TSFAnalysisView** : vue tabulée complète pour l'analyse TAC-level des Tech Support Files (Overview, Resources, Sessions, Drops, Network, HA, Logs, Processus, System)
- **TSFDataPlaneView** : graphique CPU par core et par groupe fonctionnel depuis le TSF
- **TSFDropsView** : top drops, graphique PieChart et recommandations
- Interface `TSFDataComplete` dans `types/index.ts` avec toutes les métriques TAC-level
- Parsers TSF spécialisés : `tsf-parser-main.ts`, `tsf-parser-dpmonitor.ts`, `tsf-parser-mpmonitor.ts`, `tsf-parser-logs.ts`
- Détecteur automatique de problèmes TSF : `tsf-issue-detector.ts`
- Endpoint `parseTSFComplete` dans `app/api/tsf/upload/route.ts`

### Corrigé
- Erreurs TypeScript sur `tar-stream` (types manquants), `mergeData` (comparaisons de types), `metrics-mock` (champs `InterfaceStats` manquants)
- Sévérités PAN-OS `"drop"` et `"warn"` non reconnues dans le parser de compteurs

---

## [1.0.0] - 2026-04-07

### Ajouté
- **Connexion sécurisée** au firewall PAN-OS via API keygen (cookies HTTP-only)
- **Dashboard temps réel** : CPU, mémoire, disque, uptime, sessions (TCP/UDP/ICMP), interfaces
- **Diagnostic TAC-Level** (`/api/diagnostic-live`) avec :
  - `show system resources` — CPU et mémoire Management Plane
  - `show session info` / `show session meter` — sessions actives
  - `show running resource-monitor minute` — CPU Data Plane par core
  - `show counter global filter delta yes` — compteurs drops/warnings
  - `show high-availability state` — état HA
  - `show routing summary` / `show routing protocol bgp summary` — routage
  - `show vpn ike-sa` / `show vpn ipsec-sa` — tunnels VPN
  - `show global-protect-gateway current-user` — utilisateurs GP
  - `show system info` — informations système
- **Health Score** (0–100) et détection automatique de 9 catégories de problèmes
- **Upload et parsing Tech Support Files** (.tgz / .tar.gz)
- **Analyse CPU** dédiée avec graphique par core
- **Analyse Drops** avec top 30 compteurs et recommandations
- Interface dark theme glassmorphism, composants shadcn/ui, graphiques Recharts

---

## Auteur

**Romain Jean** — [romain.jean@rj45.cloud](mailto:romain.jean@rj45.cloud) — [@Rj45n](https://github.com/Rj45n)
