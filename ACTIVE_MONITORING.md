# Surveillance Active des Interfaces - PaloMalo

## Problème résolu

### Avant (v2.0.0)
Le système détectait des "problèmes" basés sur les **compteurs cumulés** :
- Interface avec 1000 erreurs → Alerte "Erreurs détectées"
- Même si ces erreurs datent de 6 mois → Fausse alerte

**Résultat** : Beaucoup de faux positifs pour des problèmes passés déjà résolus.

### Après (v2.1.0)
Le système détecte uniquement les **problèmes ACTIFS** :
- Compare les compteurs entre deux mesures
- Calcule le delta (différence)
- Alerte uniquement si les compteurs **augmentent**

**Résultat** : Détection précise des problèmes en cours uniquement.

---

## Comment ça fonctionne

### 1. Cache des compteurs

```typescript
interface InterfaceCounters {
  rxErrors: number;
  txErrors: number;
  rxDrops: number;
  txDrops: number;
  timestamp: number;
}

const cache = new Map<string, InterfaceCounters>();
```

À chaque mesure, on stocke :
- Les valeurs actuelles des compteurs
- Le timestamp de la mesure

### 2. Calcul du delta

```typescript
const previousCounters = cache.get(interfaceName);

if (previousCounters) {
  const rxErrorsDelta = current.rxErrors - previous.rxErrors;
  const txErrorsDelta = current.txErrors - previous.txErrors;
  const totalDelta = rxErrorsDelta + txErrorsDelta;
  
  // Alerte uniquement si delta > 0
  if (totalDelta > 0) {
    const timeDiff = (now - previous.timestamp) / 1000;
    const errorsPerSec = totalDelta / timeDiff;
    
    // Problème ACTIF détecté !
  }
}
```

### 3. Taux par seconde

On calcule le **taux d'erreurs/seconde** :
- 100 nouvelles erreurs en 30 secondes = 3.3 erreurs/sec
- Permet de déterminer la sévérité du problème

---

## Exemples concrets

### Exemple 1 : Problème passé (ignoré)

**Mesure 1** (10:00:00)
```
ethernet1/1: rxErrors=1000, txErrors=500
```

**Mesure 2** (10:00:30)
```
ethernet1/1: rxErrors=1000, txErrors=500
```

**Résultat** : ✅ Aucune alerte
- Delta = 0 (compteurs stables)
- Problème passé, déjà résolu

---

### Exemple 2 : Problème actif (alerté)

**Mesure 1** (10:00:00)
```
ethernet1/1: rxErrors=1000, txErrors=500
```

**Mesure 2** (10:00:30)
```
ethernet1/1: rxErrors=1150, txErrors=550
```

**Résultat** : ⚠️ ALERTE CRITIQUE
- Delta RX = 150 erreurs
- Delta TX = 50 erreurs
- Total = 200 erreurs en 30 secondes
- Taux = 6.7 erreurs/sec
- **Problème ACTIF détecté !**

---

### Exemple 3 : Première mesure (info)

**Mesure 1** (première fois)
```
ethernet1/1: rxErrors=5000, txErrors=2000
```

**Résultat** : ℹ️ INFO
- Pas de mesure précédente pour comparer
- Message : "Compteurs non-nuls détectés. Surveillance en cours..."
- Sévérité : `info` (pas d'alerte)

**Mesure 2** (30 secondes plus tard)
```
ethernet1/1: rxErrors=5000, txErrors=2000
```

**Résultat** : ✅ Aucune alerte
- Delta = 0
- Problème passé confirmé

---

## Sévérité dynamique

### Erreurs

| Taux | Sévérité | Action |
|------|----------|--------|
| > 1 erreur/sec | **Critical** | Intervention immédiate |
| 0.1 - 1 erreur/sec | **Major** | Investigation rapide |
| < 0.1 erreur/sec | **Warning** | Surveillance |

### Drops

| Taux | Sévérité | Action |
|------|----------|--------|
| > 100 drops/sec | **Critical** | Intervention immédiate |
| 10 - 100 drops/sec | **Major** | Investigation rapide |
| < 10 drops/sec | **Warning** | Surveillance |

---

## Messages d'alerte

### Problème actif

```
⚠️ Erreurs ACTIVES sur ethernet1/1

Description: 150 nouvelles erreurs (5.0/s) - RX: 120, TX: 30

Impact: Perte de paquets ACTIVE, dégradation des performances

Recommandation:
⚠️ PROBLÈME ACTIF DÉTECTÉ
1. Vérifier IMMÉDIATEMENT la qualité du câble
2. Vérifier les paramètres duplex/speed
3. Vérifier les CRC errors
4. Remplacer le câble si nécessaire

Commandes CLI:
- show counter interface ethernet1/1
- show interface ethernet1/1
```

### Surveillance initiale

```
ℹ️ Compteurs historiques sur ethernet1/1

Description: 5000 erreurs historiques (RX: 3000, TX: 2000) - Surveillance en cours...

Recommandation:
Compteurs non-nuls détectés. Surveillance active pour détecter si le problème persiste.

Commandes CLI:
- show counter interface ethernet1/1
```

---

## Avantages

### 1. Précision
- ✅ Détecte uniquement les problèmes **en cours**
- ✅ Ignore les problèmes **passés** déjà résolus
- ✅ Pas de faux positifs

### 2. Réactivité
- ✅ Calcul du taux par seconde
- ✅ Sévérité adaptée à l'urgence
- ✅ Détection en temps réel

### 3. Contexte
- ✅ Affiche le delta (nouvelles erreurs)
- ✅ Affiche le taux (/s)
- ✅ Compare RX vs TX

### 4. Fiabilité
- ✅ Cache persistant en mémoire
- ✅ Gestion des redémarrages
- ✅ Pas de stockage externe requis

---

## Limitations

### 1. Première mesure
- Pas de comparaison possible
- Message informatif uniquement
- Faux négatif possible (mais résolu à la 2ème mesure)

### 2. Redémarrage application
- Cache perdu
- Retour à la "première mesure"
- Résolu après 30 secondes

### 3. Compteurs qui reset
- Si le firewall redémarre, compteurs à 0
- Peut causer un faux négatif temporaire
- Résolu automatiquement

---

## Implémentation

### Fichiers modifiés

1. **lib/interface-analyzer.ts**
   - Ajout du cache `interfaceCountersCache`
   - Calcul des deltas
   - Détection problèmes actifs uniquement

2. **lib/diagnostic-engine.ts**
   - Ajout du cache `diagnosticInterfaceCache`
   - Fonction `analyzeNetworkInterfaces()` refactorée
   - Messages d'alerte améliorés

### Code ajouté

```typescript
// Cache pour stocker les valeurs précédentes
const cache = new Map<string, InterfaceCounters>();

// Récupérer les valeurs précédentes
const previous = cache.get(interfaceName);

if (previous) {
  // Calculer le delta
  const delta = current - previous;
  
  if (delta > 0) {
    // Problème actif !
    const rate = delta / timeDiff;
    // Créer l'alerte...
  }
}

// Mettre à jour le cache
cache.set(interfaceName, {
  rxErrors: current.rxErrors,
  txErrors: current.txErrors,
  rxDrops: current.rxDrops,
  txDrops: current.txDrops,
  timestamp: Date.now(),
});
```

---

## Tests

### Scénario 1 : Problème résolu
```bash
# Mesure 1
ethernet1/1: rxErrors=1000

# Mesure 2 (30s plus tard)
ethernet1/1: rxErrors=1000

# Résultat attendu
✅ Aucune alerte (delta = 0)
```

### Scénario 2 : Problème actif
```bash
# Mesure 1
ethernet1/1: rxErrors=1000

# Mesure 2 (30s plus tard)
ethernet1/1: rxErrors=1100

# Résultat attendu
⚠️ ALERTE: 100 nouvelles erreurs (3.3/s)
```

### Scénario 3 : Première mesure
```bash
# Mesure 1 (première fois)
ethernet1/1: rxErrors=5000

# Résultat attendu
ℹ️ INFO: Compteurs historiques - Surveillance en cours

# Mesure 2 (30s plus tard)
ethernet1/1: rxErrors=5000

# Résultat attendu
✅ Aucune alerte (delta = 0, problème confirmé comme passé)
```

---

## Commandes de debug

### Vérifier les compteurs manuellement

```bash
# Afficher les compteurs actuels
show counter interface ethernet1/1

# Afficher uniquement les deltas (nouveaux compteurs)
show counter interface ethernet1/1 delta yes

# Afficher tous les compteurs globaux avec delta
show counter global filter delta yes
```

### Réinitialiser les compteurs (si nécessaire)

```bash
# ⚠️ ATTENTION : Efface l'historique !
clear counter interface ethernet1/1

# Réinitialiser tous les compteurs globaux
clear counter global
```

---

## Conclusion

Cette amélioration transforme PaloMalo en un outil de **surveillance active** :
- ✅ Détection précise des problèmes en cours
- ✅ Élimination des faux positifs
- ✅ Taux par seconde pour évaluer la sévérité
- ✅ Messages d'alerte contextuels

**Résultat** : Diagnostic fiable et actionnable, comme un vrai TAC engineer ! 🎯

---

**Version** : 2.1.0  
**Date** : 8 avril 2026  
**Auteur** : PaloMalo Team
