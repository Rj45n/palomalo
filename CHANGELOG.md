# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
versionnage selon [Semantic Versioning](https://semver.org/lang/fr/).

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
