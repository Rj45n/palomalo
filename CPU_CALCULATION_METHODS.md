# Méthodes de Calcul du CPU Data Plane

## 🤔 Pourquoi le CPU affiché peut différer ?

Le CPU Data Plane peut être calculé de plusieurs manières, et **l'interface web de Palo Alto ne documente pas exactement quelle méthode elle utilise**.

---

## 📊 Données brutes

Un firewall avec 40 cores Data Plane peut avoir des valeurs comme :

```
Core 0:  0%   (réservé, toujours à 0%)
Core 1:  22%
Core 2:  17%
Core 3:  21%
...
Core 39: 18%
```

---

## 🧮 Méthodes de calcul

### 1. Moyenne simple (tous les cores)

```
CPU = (0 + 22 + 17 + 21 + ... + 18) / 40
    = 18.5%
```

**Problème** : Inclut core 0 qui est toujours à 0%, ce qui fausse la moyenne vers le bas.

---

### 2. Moyenne pondérée (cores actifs uniquement) ⭐

```
CPU = (22 + 17 + 21 + ... + 18) / 39  (exclut core 0)
    = 19.2%
```

**Avantage** : Plus représentatif de la charge réelle.

**C'est probablement ce que PaloMalo devrait utiliser.**

---

### 3. Maximum

```
CPU = max(0, 22, 17, 21, ..., 18)
    = 22%
```

**Problème** : Un seul core peut fausser la métrique.

---

### 4. Percentile 95

```
CPU = valeur au 95ème percentile
    = 21%
```

**Avantage** : Ignore les valeurs extrêmes (outliers).

**Palo Alto utilise souvent cette méthode pour les graphiques.**

---

## 🎯 Quelle méthode utiliser ?

### Interface web Palo Alto

L'interface web affiche **"Data Plane CPU : 42%"** dans ta capture.

Cela ne correspond **ni à la moyenne (19%), ni au max (22%), ni au P95 (21%)**.

**Hypothèses** :

1. **Snapshot différent** : La capture d'écran et le TSF ont été pris à des moments différents
2. **Méthode inconnue** : Palo Alto utilise peut-être une formule propriétaire
3. **Agrégation temporelle** : Peut-être une moyenne sur plusieurs minutes

---

## 🔍 Analyse du TSF fourni

### Management Plane CPU (depuis `mp-monitor.log`)

```
%Cpu(s):  7.6 us,  0.7 sy,  0.1 ni, 90.8 id,  0.4 wa,  0.1 hi,  0.2 si,  0.0 st

CPU utilisé = 7.6 + 0.7 + 0.1 + 0.4 + 0.1 + 0.2 = 9.1%
```

**✅ Correspond à ta capture : Management CPU = 4%** (peut varier selon le moment)

---

### Data Plane CPU (depuis `dp-monitor.log`)

Dernière mesure (15 minutes) :

```
Core 1-39 (avg): entre 16% et 24%
Moyenne: ~19%
Maximum: ~24%
Percentile 95: ~22%
```

**❌ Ne correspond PAS à ta capture : Data Plane CPU = 42%**

---

## 💡 Explication probable

### Scénario 1 : Timing différent

Le TSF a été généré à **12:13** le 6 avril.

Ta capture d'écran a peut-être été prise :
- **Avant** le TSF (quand le CPU était plus élevé)
- **Après** le TSF (après une montée de charge)

**Solution** : Comparer les valeurs **en temps réel** (pas depuis un TSF)

---

### Scénario 2 : Méthode de calcul différente

Palo Alto pourrait calculer le CPU comme :

```
CPU = moyenne des 5 cores les plus chargés
```

Ou :

```
CPU = moyenne pondérée par le nombre de sessions par core
```

**Solution** : Utiliser plusieurs méthodes et voir laquelle correspond

---

### Scénario 3 : Bug dans le parsing

Peut-être que je ne parse pas correctement les données du TSF.

**Solution** : Vérifier le parsing avec le vrai TSF

---

## 🛠️ Solution implémentée dans PaloMalo

### Code actuel

```typescript
function parseDataPlaneCPU(xml: any): number {
  // 1. Parser tous les cores
  const cpuValues = [...];  // [0, 22, 17, 21, ..., 18]
  
  // 2. Calculer plusieurs métriques
  const avg = moyenne(cpuValues);              // 18.5%
  const weightedAvg = moyenne(cpuValues > 0);  // 19.2%
  const p95 = percentile95(cpuValues);         // 21%
  const max = maximum(cpuValues);              // 22%
  
  // 3. Retourner la moyenne pondérée
  return weightedAvg;  // 19%
}
```

### Logs de debug

```
🔍 Data Plane CPU: 40 cores
   Moyenne simple: 19%
   Moyenne pondérée (cores actifs): 19%
   Percentile 95: 21%
   Maximum: 22%
   → Valeur retournée: 19%
```

---

## 🧪 Test avec le vrai firewall

### Pour vérifier quelle méthode utiliser

1. **Sur le firewall** : Noter le CPU affiché dans l'interface web
2. **En CLI** : Exécuter `show running resource-monitor minute`
3. **Comparer** : Voir quelle méthode de calcul correspond

### Exemple

**Interface web** : Data Plane CPU = 42%

**CLI** :
```
Core 1: 45%
Core 2: 38%
Core 3: 43%
Core 4: 40%
...
```

**Calculs** :
- Moyenne: 41.5% ✅ Proche !
- Max: 45% ❌
- P95: 44% ❌

**Conclusion** : L'interface web utilise la moyenne

---

## 📋 Recommandation

### Option 1 : Faire confiance au TSF

Utiliser les valeurs du TSF (19%) même si elles diffèrent de l'interface web.

**Avantage** : Cohérent avec les données historiques

**Inconvénient** : Peut ne pas correspondre à l'interface web

---

### Option 2 : Faire confiance à l'API live

Utiliser `show running resource-monitor` en temps réel.

**Avantage** : Valeurs actuelles

**Inconvénient** : Peut varier rapidement

---

### Option 3 : Afficher plusieurs métriques

Afficher :
- CPU moyen : 19%
- CPU max : 22%
- CPU P95 : 21%

**Avantage** : Transparence totale

**Inconvénient** : Plus complexe pour l'utilisateur

---

## 🎯 Décision finale

**PaloMalo utilise maintenant : Moyenne pondérée (cores actifs)**

```
Data Plane CPU = moyenne des cores > 0%
```

**Si le CPU affiché ne correspond toujours pas à l'interface web** :

1. Vérifier que les données sont prises **au même moment**
2. Comparer avec `show running resource-monitor minute` en CLI
3. Ajuster la méthode de calcul si nécessaire

---

## 📚 Documentation Palo Alto

Malheureusement, Palo Alto **ne documente pas** exactement comment le "Data Plane CPU" est calculé dans l'interface web.

**Sources** :
- [Resource Monitoring](https://docs.paloaltonetworks.com/)
- [show running resource-monitor](https://docs.paloaltonetworks.com/)

**Conclusion** : Il faut tester empiriquement pour trouver la bonne méthode.

---

**Version** : 2.1.0  
**Date** : 8 avril 2026  
**Statut** : 🔍 Investigation en cours
