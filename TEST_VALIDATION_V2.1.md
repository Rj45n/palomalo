# Plan de Test - Validation v2.1.0

## 🎯 Objectif

Valider que toutes les corrections de la v2.1.0 fonctionnent correctement et qu'il n'y a plus de fausses alertes.

---

## ✅ Tests à effectuer

### Test 1 : CPU précise (19% → 50%)

**Objectif** : Vérifier que le CPU affiché correspond au firewall

**Étapes** :
1. Sur le firewall, exécuter : `show system resources`
2. Noter la valeur CPU (ex: 50%)
3. Dans PaloMalo, aller sur **Dashboard** ou **Diagnostics → Analyse CPU**
4. Comparer la valeur affichée

**Résultat attendu** :
- ✅ La valeur dans PaloMalo doit correspondre au firewall (±2%)
- ✅ Si le firewall affiche 50%, PaloMalo doit afficher ~50%

**Logs de debug** :
```
🔍 CPU Parsing: us=12.3 sy=8.5 ni=2.1 wa=0.8 hi=0.6 si=0.5 → Total=25%
```

**Statut** : [ ] Validé

---

### Test 2 : Throughput réaliste (26 TB/s → MB/s)

**Objectif** : Vérifier que le throughput est en MB/s ou GB/s, pas en TB/s

**Étapes** :
1. Aller sur **Dashboard → Performance**
2. Observer la valeur "Throughput"
3. Attendre 30 secondes
4. Vérifier que la valeur évolue de manière cohérente

**Résultat attendu** :
- ✅ Valeur en MB/s ou GB/s (ex: 125 MB/s, 2.5 GB/s)
- ✅ PAS de valeur en TB/s (ex: 26 TB/s)
- ✅ Valeur cohérente avec le trafic réel

**Statut** : [ ] Validé

---

### Test 3 : Pas d'alerte sur erreurs passées

**Objectif** : Vérifier qu'on n'alerte que sur les erreurs **actives**

**Étapes** :
1. Identifier une interface avec des erreurs passées (compteur > 0 mais stable)
2. Sur le firewall : `show interface all` et noter les compteurs d'erreurs
3. Attendre 1 minute
4. Re-vérifier : `show interface all`
5. Si les compteurs n'ont **pas augmenté**, c'est un problème passé

**Dans PaloMalo** :
1. Aller sur **Diagnostics → Diagnostic TAC-Level**
2. Vérifier les issues

**Résultat attendu** :
- ✅ Si compteur stable (pas d'augmentation) → Pas d'alerte OU alerte "info" seulement
- ✅ Si compteur augmente → Alerte "critical" ou "major"
- ✅ Message doit indiquer le taux (ex: "5 errors/sec")

**Statut** : [ ] Validé

---

### Test 4 : Pas de fausse alerte HA

**Objectif** : Vérifier qu'on n'alerte pas si HA fonctionne

**Prérequis** : Firewall avec HA configuré et fonctionnel

**Étapes** :
1. Sur le firewall : `show high-availability all`
2. Vérifier que le peer est "passive" ou "active" et "connected"
3. Dans PaloMalo : **Diagnostics → Diagnostic TAC-Level**
4. Chercher des issues liées à HA

**Résultat attendu** :
- ✅ Si HA fonctionne (peer connected/passive/active) → Pas d'alerte
- ✅ Si HA down (peer disconnected/non-functional) → Alerte "critical"
- ✅ Pas d'alerte si `peerState === "unknown"` (problème de parsing)

**Logs de debug** :
```
📊 HA enabled: true
   Local state: active
   Peer conn-status: up
   Peer state: passive
   Sync status: synchronized
```

**Statut** : [ ] Validé

---

### Test 5 : Pas de fausse alerte VPN

**Objectif** : Vérifier qu'on n'alerte pas si les tunnels VPN fonctionnent

**Prérequis** : Firewall avec tunnels VPN configurés

**Étapes** :
1. Sur le firewall : `show vpn ike-sa`
2. Vérifier que les tunnels sont "established"
3. Dans PaloMalo : **Diagnostics → Diagnostic TAC-Level**
4. Chercher des issues liées à VPN

**Résultat attendu** :
- ✅ Si tunnels "established" ou "up" → Pas d'alerte
- ✅ Si tunnels down → Alerte "major"
- ✅ Pas d'alerte si `state === "unknown"` (problème de parsing)

**Statut** : [ ] Validé

---

### Test 6 : Onglet "Analyse CPU"

**Objectif** : Vérifier que le nouvel onglet fonctionne

**Étapes** :
1. Aller sur **Diagnostics → Analyse CPU**
2. Vérifier l'affichage

**Résultat attendu** :
- ✅ CPU Management Plane affiché (valeur précise)
- ✅ Code couleur selon niveau (vert < 60%, jaune 60-75%, orange 75-90%, rouge > 90%)
- ✅ Si `advancedMetrics` disponible : graphique CPU par core
- ✅ Si TSF uploadé : Top 10 processus
- ✅ Métriques additionnelles (packet descriptors, sessions, buffers)
- ✅ Recommandations adaptées au niveau CPU
- ✅ 6 commandes CLI affichées
- ✅ Guide d'interprétation

**Statut** : [ ] Validé

---

### Test 7 : Onglet "Drops Paquets"

**Objectif** : Vérifier que le nouvel onglet fonctionne

**Étapes** :
1. Aller sur **Diagnostics → Drops Paquets**
2. Vérifier l'affichage

**Résultat attendu** :
- ✅ Graphique horizontal des top 10 raisons
- ✅ Total de paquets droppés
- ✅ Détail par raison avec recommandation
- ✅ 4 commandes CLI affichées
- ✅ Guide d'interprétation des types de drops

**Statut** : [ ] Validé

---

### Test 8 : Logs de debug

**Objectif** : Vérifier que les logs de debug sont présents

**Étapes** :
1. Ouvrir la console du navigateur (F12)
2. Aller sur **Dashboard** ou **Diagnostics**
3. Vérifier les logs dans la console du serveur (terminal où `npm run dev` tourne)

**Résultat attendu** :
- ✅ Logs CPU : `🔍 CPU Parsing: us=X sy=Y ... → Total=Z%`
- ✅ Logs HA : `📊 HA enabled: true` + détails peer state

**Statut** : [ ] Validé

---

## 🧪 Tests de régression

### Test 9 : Fonctionnalités existantes

**Objectif** : Vérifier qu'on n'a rien cassé

**Étapes** :
1. **Dashboard** : Vérifier que toutes les cartes s'affichent
2. **Performance** : Vérifier les graphiques
3. **Security** : Vérifier les règles
4. **Network** : Vérifier les interfaces
5. **TSF Upload** : Uploader un TSF et vérifier l'analyse

**Résultat attendu** :
- ✅ Toutes les pages fonctionnent
- ✅ Pas d'erreur dans la console
- ✅ TSF parsing fonctionne

**Statut** : [ ] Validé

---

## 📊 Checklist de validation finale

| Test | Description | Statut |
|------|-------------|--------|
| 1 | CPU précise (50% = 50%) | [ ] |
| 2 | Throughput réaliste (MB/s) | [ ] |
| 3 | Pas d'alerte erreurs passées | [ ] |
| 4 | Pas de fausse alerte HA | [ ] |
| 5 | Pas de fausse alerte VPN | [ ] |
| 6 | Onglet Analyse CPU | [ ] |
| 7 | Onglet Drops Paquets | [ ] |
| 8 | Logs de debug | [ ] |
| 9 | Pas de régression | [ ] |

---

## 🐛 Bugs trouvés pendant les tests

### Bug 1 : [Titre]

**Description** :

**Étapes pour reproduire** :
1. 
2. 
3. 

**Résultat attendu** :

**Résultat obtenu** :

**Priorité** : [ ] Critique [ ] Majeure [ ] Mineure

---

## 📝 Notes

### Environnement de test

- **Firewall** : PA-XXX
- **PAN-OS** : X.X.X
- **PaloMalo** : v2.1.0
- **Navigateur** : Chrome/Firefox/Safari
- **Date** : 

### Observations

- 
- 
- 

---

## ✅ Validation finale

**Tous les tests passent** : [ ] OUI [ ] NON

**Bugs critiques** : [ ] OUI [ ] NON

**Prêt pour la production** : [ ] OUI [ ] NON

**Validé par** : ________________

**Date** : ________________

---

## 🚀 Déploiement

Une fois tous les tests validés :

```bash
# 1. Arrêter le serveur de dev
Ctrl+C

# 2. Relancer
npm run dev

# 3. Tester en production
# (ou déployer sur serveur de prod)
```

---

## 📚 Documentation de référence

- `CORRECTIONS_V2.1.md` - Détails des corrections
- `CHANGELOG_V2.md` - Historique des versions
- `HA_STATES_GUIDE.md` - Guide des états HA
- `ACTIVE_MONITORING.md` - Surveillance active
- `test-ha-parsing.js` - Script de test HA

---

**Version** : 2.1.0  
**Date création** : 8 avril 2026  
**Statut** : 🧪 En test
