# Quick Start - Diagnostic TAC-Level

## 🚀 Démarrage rapide

### 1. Lancer l'application

```bash
cd /home/romain/PaloMalo
npm run dev
```

L'application démarre sur http://localhost:3000

### 2. Se connecter au firewall

1. Ouvrir http://localhost:3000
2. Entrer les informations du firewall :
   - **URL** : 172.18.111.201 (ou votre firewall)
   - **Username** : Codex
   - **Password** : C0d3x!34970
3. Cliquer sur "Se connecter"

### 3. Accéder au Diagnostic Center

1. Cliquer sur "Diagnostics" dans la sidebar
2. Le diagnostic démarre automatiquement

---

## 📊 Ce que vous verrez

### Health Score

```
┌─────────────────────────┐
│  HEALTH SCORE           │
│                         │
│    72/100               │
│    Warning              │
│                         │
│  ○○○○○○○○○○○○○○○○○○○○  │
└─────────────────────────┘
```

### Statistiques

- **Critical** : Problèmes critiques (rouge)
- **Major** : Problèmes majeurs (orange)
- **Warning** : Avertissements (jaune)
- **Info** : Informations (bleu)

### Liste des problèmes

Chaque problème affiche :
- **Titre** : Description courte
- **Description** : Détails du problème
- **Impact** : Conséquences
- **Recommandation** : Actions à prendre
- **Commandes CLI** : Commandes de diagnostic
- **Composants affectés** : Interfaces, peers, etc.

---

## 🔍 Types de problèmes détectés

### Système
- ✅ CPU élevé/critique
- ✅ Mémoire saturée
- ✅ Disque plein
- ✅ Crashes détectés

### Réseau
- ✅ Interfaces down
- ✅ Erreurs CRC/Frame
- ✅ Drops de paquets
- ✅ Problèmes ARP

### Performance
- ✅ CPU dataplane saturé (par core)
- ✅ Buffers pleins
- ✅ Sessions saturées
- ✅ SSL decrypt overload

### High Availability
- ✅ Peer down
- ✅ Synchronisation échouée
- ✅ Split-brain
- ✅ Preemption

### VPN
- ✅ Tunnels IKE down
- ✅ Tunnels IPSec down
- ✅ Négociation failed

### Routing
- ✅ Peers BGP down
- ✅ Voisins OSPF down
- ✅ Route flapping

---

## 📁 Upload d'un Tech Support File (TSF)

### Générer un TSF sur le firewall

```bash
# Via CLI
admin@PA> request tech-support-file

# Via GUI
Device > Support > Tech Support File > Generate Tech Support File
```

### Uploader le TSF dans PaloMalo

1. Aller dans l'onglet "Tech Support File"
2. Glisser-déposer le fichier `.tgz`
3. Attendre l'analyse (5-10 secondes)
4. Le diagnostic se met à jour automatiquement avec :
   - Historique CPU/mémoire
   - Crashes détectés
   - Patterns d'erreurs connus
   - Corrélation avec les métriques live

---

## 🎯 Métriques avancées collectées

### Resource Monitor
- CPU par core dataplane (0-100%)
- Utilisation packet descriptors
- Utilisation sessions
- Utilisation buffers

### Counters
- Drops de paquets par raison
- flow_policy_deny
- flow_no_route
- session_discard
- etc.

### High Availability
- État local et peer
- Status de synchronisation
- Dernier failover

### Routing
- Nombre total de routes
- Peers BGP (état, préfixes)
- Voisins OSPF

### VPN
- Tunnels IKE (état, peer)
- Tunnels IPSec (SPI, paquets)

### GlobalProtect
- Utilisateurs connectés
- Liste des users (IP, login time)

---

## 💡 Exemples de problèmes détectés

### Exemple 1 : CPU Dataplane saturé

```
⚠️ Dataplane CPU Core 3 saturé

Description: Le core 3 du dataplane est à 97.2%

Impact: Perte de paquets, latence élevée, dégradation des performances

Recommandation:
1. Identifier les fonctions consommatrices avec 'debug dataplane pow performance'
2. Vérifier les règles de sécurité complexes
3. Activer hardware offload si disponible
4. Considérer un upgrade hardware

Commandes CLI:
- show running resource-monitor minute
- debug dataplane pow performance
- show counter global filter packet-filter yes

Composants affectés: DP Core 3
```

### Exemple 2 : Drops de paquets

```
⚠️ Drops de paquets: flow_policy_deny

Description: 15,234 paquets droppés - Blocked by security policy

Impact: Perte de connectivité, services impactés

Recommandation:
Vérifier les règles de sécurité, ajouter des règles allow si nécessaire

Commandes CLI:
- show counter global filter delta yes severity drop
- show counter global filter packet-filter yes

Tendance: ↑ (increasing)
```

### Exemple 3 : HA Peer down

```
⚠️ Peer HA inaccessible

Description: Le peer HA est dans l'état: down

Impact: Pas de redondance, risque de perte de service en cas de panne

Recommandation:
1. Vérifier la connectivité réseau avec le peer
2. Vérifier les câbles et interfaces HA
3. Vérifier l'état du firewall peer
4. Consulter les logs HA

Commandes CLI:
- show high-availability all
- show high-availability state
- show log system direction equal backward | match HA
```

---

## 📤 Export du rapport

1. Cliquer sur le bouton "Export"
2. Un fichier JSON est téléchargé : `diagnostic-report-<timestamp>.json`

Contenu du rapport :
```json
{
  "timestamp": "2026-04-08T10:30:00.000Z",
  "healthScore": 72,
  "stats": {
    "critical": 2,
    "major": 3,
    "warning": 5,
    "info": 1
  },
  "issues": [
    {
      "id": "...",
      "category": "performance",
      "severity": "critical",
      "title": "Dataplane CPU Core 3 saturé",
      "description": "...",
      "impact": "...",
      "recommendation": "...",
      "cliCommands": ["..."],
      "affectedComponents": ["..."],
      "detectedAt": "...",
      "source": "live"
    }
  ],
  "tsfIncluded": true
}
```

---

## 🔄 Refresh

Cliquer sur "Refresh Live" pour :
- Récupérer les dernières métriques du firewall
- Relancer le diagnostic
- Mettre à jour le Health Score

---

## 🆘 Troubleshooting

### Le diagnostic ne démarre pas

1. Vérifier la connexion au firewall
2. Vérifier que la session est active
3. Rafraîchir la page

### Métriques avancées non disponibles

Certaines commandes peuvent échouer si :
- Le firewall n'a pas de HA configuré
- Pas de BGP/OSPF configuré
- Pas de VPN configuré
- Pas de GlobalProtect configuré

C'est normal, le diagnostic continue avec les métriques disponibles.

### Upload TSF échoue

- Vérifier que le fichier est bien un `.tgz` ou `.tar.gz`
- Taille max : 500 Mo
- Format : Tech Support File officiel Palo Alto

---

## 📚 Documentation complète

Pour plus de détails, consulter :
- `DIAGNOSTIC_TAC_LEVEL.md` - Documentation technique complète
- `IMPLEMENTATION_SUMMARY.md` - Résumé de l'implémentation

---

## 🎓 Commandes PAN-OS utiles

### Diagnostic système
```bash
show system resources
show running resource-monitor minute
show system disk-space
```

### Diagnostic réseau
```bash
show counter global filter delta yes severity drop
show interface all
show counter interface ethernet1/1
```

### Diagnostic HA
```bash
show high-availability all
show high-availability state
request high-availability sync-to-remote running-config
```

### Diagnostic VPN
```bash
show vpn ike-sa
show vpn ipsec-sa
test vpn ike-sa gateway <name>
```

### Diagnostic routing
```bash
show routing summary
show routing protocol bgp summary
show routing protocol ospf neighbor
```

### Logs
```bash
show log system direction equal backward
show log ikemgr direction equal backward
show log routing direction equal backward
```

---

## ✅ Checklist de diagnostic

- [ ] Health Score < 60 ? → Problèmes critiques à traiter
- [ ] CPU > 90% ? → Identifier les processus consommateurs
- [ ] Mémoire > 90% ? → Risque de crash
- [ ] Disque > 90% ? → Nettoyer les logs
- [ ] Interfaces down ? → Vérifier câbles et config
- [ ] Drops > 10k ? → Analyser la cause
- [ ] HA peer down ? → Vérifier connectivité
- [ ] Tunnels VPN down ? → Vérifier proposals et connectivité
- [ ] Peers BGP down ? → Vérifier routing
- [ ] Crashes détectés ? → Contacter TAC

---

**Bon diagnostic ! 🔍**
