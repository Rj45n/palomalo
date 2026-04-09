# Diagnostic TAC-Level Complet

## 🎯 Vue d'ensemble

Le nouveau diagnostic TAC exécute **12 commandes API** en parallèle pour collecter toutes les métriques nécessaires à un diagnostic complet du firewall.

---

## 📊 Métriques collectées

### 1. Data Plane CPU (le plus important !)

**Commande** : `show running resource-monitor minute`

**Métriques** :
- CPU par core (jusqu'à 40+ cores)
- Moyenne des cores actifs
- Maximum
- Graphique de distribution

**Seuils d'alerte** :
- ⚠️ > 80% : Major
- 🔴 > 90% : Critical

---

### 2. Management Plane CPU

**Commande** : `show system resources`

**Métriques** :
- CPU user, system, nice, idle
- Utilisation mémoire (MB et %)
- Load average (1min, 5min, 15min)

**Seuils d'alerte** :
- ⚠️ > 70% : Warning
- 🔴 > 85% : Major

---

### 3. Sessions

**Commande** : `show session info`

**Métriques** :
- Sessions supportées / allouées
- Sessions TCP / UDP / ICMP actives
- Utilisation table de sessions (%)
- Packet rate (pps)
- Throughput (kbps)
- New connection rate (cps)

**Seuils d'alerte** :
- ⚠️ > 70% utilisation : Warning
- 🔴 > 85% utilisation : Critical

---

### 4. Packet Drops (Global Counters)

**Commande** : `show counter global filter delta yes`

**Métriques** :
- Total drops
- Drops par raison (policy deny, no route, etc.)
- Top 30 compteurs

**Seuils d'alerte** :
- ⚠️ > 1000 drops : Warning
- 🔴 > 10000 drops : Major

---

### 5. High Availability (HA)

**Commande** : `show high-availability state`

**Métriques** :
- État HA (activé/désactivé)
- État local (active/passive)
- État peer
- Sync status

**Seuils d'alerte** :
- 🔴 Peer disconnected : Critical
- ⚠️ Non synchronized : Warning

---

### 6. VPN Tunnels

**Commandes** :
- `show vpn ike-sa`
- `show vpn ipsec-sa`

**Métriques** :
- Nombre de tunnels IKE
- État de chaque tunnel (established, etc.)
- Peers IP
- Tunnels IPSec

**Seuils d'alerte** :
- 🔴 Tunnel down : Major

---

### 7. GlobalProtect

**Commande** : `show global-protect-gateway current-user`

**Métriques** :
- Nombre d'utilisateurs connectés
- Liste des utilisateurs (username, IP, login time)

---

### 8. System Info

**Commande** : `show system info`

**Métriques** :
- Hostname
- Modèle
- Serial
- Version PAN-OS
- Uptime

---

### 9. Routing Summary

**Commande** : `show routing summary`

**Métriques** :
- Nombre total de routes
- Peers BGP
- Voisins OSPF

---

## 🖥️ Interface utilisateur

### Onglet "Diagnostic TAC Complet"

```
┌─────────────────────────────────────────────────────────────────┐
│ Diagnostic TAC-Level                                            │
│ Analyse complète en temps réel                    Health: 85%   │
├─────────────────────────────────────────────────────────────────┤
│ ⚠️ 2 Problème(s) détecté(s)                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [MAJOR] Data Plane CPU élevé                                │ │
│ │ CPU Data Plane à 82% (39 cores actifs)                      │ │
│ │ 1. Vérifier le trafic...                                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ DP CPU   │ │ MP CPU   │ │ Memory   │ │ Sessions │            │
│ │  43%     │ │  12%     │ │  65%     │ │  13%     │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ PPS      │ │ CPS      │ │ Drops    │ │ HA       │            │
│ │  122K    │ │  4292    │ │  0       │ │ Active   │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────────────────┤
│ [Graphique CPU par Core]                                        │
│ ████████████████████                                            │
├─────────────────────────────────────────────────────────────────┤
│ Sessions                     │ Top Drops                        │
│ TCP: 109K (20%)              │ flow_policy_deny: 5000           │
│ UDP: 434K (79%)              │ flow_no_route: 150               │
│ ICMP: 3K (1%)                │ ...                              │
├─────────────────────────────────────────────────────────────────┤
│ VPN Tunnels                  │ GlobalProtect                    │
│ tunnel1: established         │ 0 utilisateurs connectés         │
│ tunnel2: established         │                                  │
├─────────────────────────────────────────────────────────────────┤
│ System Info                                                     │
│ Hostname: PSECMRSB22FWL01  Model: PA-5220  Version: 10.2.4     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Détection automatique des problèmes

### Problèmes détectés automatiquement

| Problème | Condition | Sévérité |
|----------|-----------|----------|
| Data Plane CPU élevé | > 80% | Major |
| Data Plane CPU critique | > 90% | Critical |
| Management CPU élevé | > 70% | Warning |
| Mémoire élevée | > 80% | Warning |
| Mémoire critique | > 90% | Critical |
| Sessions élevées | > 70% | Warning |
| Sessions critiques | > 85% | Critical |
| Drops de paquets | > 1000 | Warning |
| Drops critiques | > 10000 | Major |
| HA Peer down | disconnected | Critical |
| HA non sync | not synchronized | Warning |
| VPN tunnel down | not established | Major |
| Load average élevé | > 10 | Warning |

---

## 📁 Fichiers créés

| Fichier | Description |
|---------|-------------|
| `app/api/diagnostic-live/route.ts` | API de diagnostic complet |
| `components/diagnostic/TACDiagnostic.tsx` | UI du diagnostic TAC |
| `lib/tsf-parser-enhanced.ts` | Parser TSF amélioré |

---

## 🧪 Test

1. Aller sur **Diagnostics** → **Diagnostic TAC Complet**
2. Attendre le chargement (quelques secondes)
3. Voir :
   - Health Score
   - Problèmes détectés
   - Métriques en temps réel
   - Graphique CPU par core
   - Sessions détaillées
   - VPN et GlobalProtect
   - Commandes CLI utiles

---

## 📈 Avantages

### Avant (diagnostic basique)
- ❌ Seulement CPU Management Plane
- ❌ Pas de Data Plane CPU
- ❌ Pas de sessions détaillées
- ❌ Pas de drops
- ❌ Pas de VPN
- ❌ Pas de GlobalProtect

### Après (diagnostic TAC complet)
- ✅ Data Plane CPU par core
- ✅ Management Plane CPU détaillé
- ✅ Mémoire et Load Average
- ✅ Sessions complètes (TCP/UDP/ICMP, pps, cps)
- ✅ Packet drops avec raisons
- ✅ HA status complet
- ✅ VPN tunnels
- ✅ GlobalProtect users
- ✅ Détection automatique des problèmes
- ✅ Health Score calculé
- ✅ Recommandations

---

## 🎯 Résultat

**PaloMalo peut maintenant diagnostiquer les vrais problèmes comme un TAC engineer ! 🔍**

- CPU Data Plane précis (43% au lieu de 7%)
- Détection automatique des problèmes
- Toutes les métriques importantes en un seul écran
- Recommandations et commandes CLI

---

**Version** : 2.2.0  
**Date** : 8 avril 2026  
**Statut** : ✅ Production-ready
