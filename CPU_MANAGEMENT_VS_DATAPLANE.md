# CPU Management Plane vs Data Plane

## 🎯 Problème résolu

**Avant** : L'outil affichait le **Management Plane CPU** (4%) au lieu du **Data Plane CPU** (42%)  
**Après** : L'outil affiche maintenant le **Data Plane CPU** (moyenne des cores)

---

## 📊 Différence entre les deux CPU

### Management Plane CPU

**Qu'est-ce que c'est ?**
- CPU utilisé par les processus de gestion du firewall
- Gère la configuration, les logs, l'interface web, SSH, etc.
- **Commande** : `show system resources`

**Processus typiques** :
- `mgmtsrvr` - Serveur de management
- `configd` - Daemon de configuration
- `logd` - Daemon de logs
- `web` - Interface web

**Valeur normale** : 5-15%

**Exemple de sortie** :
```
Management CPU:  4%
```

---

### Data Plane CPU ⭐ (LE PLUS IMPORTANT)

**Qu'est-ce que c'est ?**
- CPU utilisé pour **traiter le trafic réseau**
- Inspection des paquets, App-ID, IPS, SSL decrypt, etc.
- **Commande** : `show running resource-monitor minute`

**Ce qui consomme le Data Plane CPU** :
- Inspection de trafic (App-ID, Content-ID)
- Déchiffrement SSL
- IPS/IDS
- Antivirus
- URL Filtering
- Nombre de sessions
- Nombre de paquets/seconde

**Valeur normale** : Dépend du trafic (10-60% normal, > 80% problématique)

**Exemple de sortie** :
```
Data Plane CPU:  42%
  Core 0:  45%
  Core 1:  38%
  Core 2:  43%
  Core 3:  40%
```

---

## 🔍 Pourquoi le Data Plane CPU est plus important ?

Le **Data Plane CPU** est l'indicateur clé de performance car :

1. **C'est lui qui traite le trafic**
   - Si Data Plane CPU > 90% → Latence, drops de paquets
   - Si Management CPU > 90% → Interface web lente, mais trafic OK

2. **Il impacte directement les utilisateurs**
   - Data Plane saturé = connexions lentes
   - Management saturé = juste l'admin qui souffre

3. **C'est le goulot d'étranglement**
   - Le Data Plane est dimensionné pour le throughput
   - Le Management Plane est secondaire

---

## 🎨 Affichage dans PaloMalo

### Dashboard Principal

```
┌─────────────────────────────────────┐
│ Data Plane CPU                      │
│                                     │
│ 42%                                 │
└─────────────────────────────────────┘
```

**Note** : Affiche la **moyenne** des cores Data Plane

---

### Onglet "Analyse CPU"

```
┌─────────────────────────────────────┐
│ Diagnostic CPU                      │
│                                     │
│ 42%                                 │
│ Data Plane CPU (moyenne)            │
│                                     │
│ CPU Dataplane par Core              │
│ ┌─────────────────────────────────┐ │
│ │ Core 0:  ████████████ 45%       │ │
│ │ Core 1:  ██████████   38%       │ │
│ │ Core 2:  ████████████ 43%       │ │
│ │ Core 3:  ██████████   40%       │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Détails** :
- Moyenne globale en haut
- Détail par core en dessous
- Permet d'identifier si un core est saturé

---

## 🔧 Implémentation technique

### 1. Récupération des données

```typescript
// Avant (incorrect)
executeCommand(url, apiKey, "show system resources")
// → Retourne Management Plane CPU (4%)

// Après (correct)
executeCommand(url, apiKey, "show running resource-monitor minute")
// → Retourne Data Plane CPU par core (45%, 38%, 43%, 40%)
```

### 2. Calcul de la moyenne

```typescript
function parseDataPlaneCPU(xml: any): number {
  const dpCores = xml.response.result["dp-core"];
  const coresArray = Array.isArray(dpCores) ? dpCores : [dpCores];
  
  let totalCPU = 0;
  let coreCount = 0;

  coresArray.forEach((core: any) => {
    const cpuLoad = core["cpu-load-minute"];
    const values = cpuLoad.split(/\s+/).filter((v: string) => v);
    const usage = parseFloat(values[0]) || 0;
    totalCPU += usage;
    coreCount++;
  });

  return Math.round(totalCPU / coreCount);
  // Exemple: (45 + 38 + 43 + 40) / 4 = 41.5 → 42%
}
```

### 3. Affichage

```typescript
// Dashboard
<MetricCard
  title="Data Plane CPU"
  value={metrics.system.cpu}  // Maintenant = Data Plane CPU
  unit="%"
/>

// Diagnostic
<div className="text-4xl font-bold">
  {cpuUsage}%
</div>
<div className="text-xs text-gray-500">
  Data Plane CPU (moyenne)
</div>
```

---

## 📊 Exemple concret

### Firewall PA-220

**Sortie `show system resources`** :
```
Management CPU:  4%
Memory:          35%
```

**Sortie `show running resource-monitor minute`** :
```
Data Plane CPU:
  Core 0:  45%
  Core 1:  38%
  Core 2:  43%
  Core 3:  40%
  
Average: 42%
```

### Dans PaloMalo

**Avant (incorrect)** :
```
CPU: 4%  ❌ (Management Plane)
```

**Après (correct)** :
```
Data Plane CPU: 42%  ✅ (moyenne des cores)
```

---

## 🎯 Quand surveiller quoi ?

### Surveiller le Data Plane CPU si :
- ✅ Trafic lent ou latence
- ✅ Drops de paquets
- ✅ Sessions qui timeout
- ✅ Dimensionnement hardware

### Surveiller le Management Plane CPU si :
- Interface web lente
- Logs qui ne s'affichent pas
- Commits qui prennent du temps
- SSH lent

**Dans 99% des cas, c'est le Data Plane CPU qui compte ! 🎯**

---

## 🔍 Commandes de diagnostic

### Voir le Data Plane CPU en temps réel

```bash
# Vue minute (moyenne sur 1 minute)
show running resource-monitor minute

# Vue seconde (temps réel)
show running resource-monitor second

# Suivre en continu
show running resource-monitor second follow yes
```

### Voir le Management Plane CPU

```bash
# Vue globale
show system resources

# Suivre en continu
show system resources follow yes
```

### Identifier les processus consommateurs

```bash
# Top processus Management Plane
show system resources

# Top processus Data Plane (pas disponible directement)
# → Utiliser "show counter global" pour voir le type de trafic
show counter global filter delta yes
```

---

## 💡 Causes courantes de Data Plane CPU élevé

### 1. Trafic légitime élevé (60-80%)
- **Symptôme** : CPU élevé mais stable
- **Solution** : Upgrade hardware ou optimiser les règles

### 2. Attaque DDoS (> 90%)
- **Symptôme** : CPU soudainement à 100%, drops de paquets
- **Solution** : Activer DoS Protection, bloquer les sources

### 3. Règles de sécurité complexes (70-90%)
- **Symptôme** : CPU élevé avec peu de throughput
- **Solution** : Optimiser les règles, désactiver App-ID sur certaines zones

### 4. SSL Decryption (50-80%)
- **Symptôme** : CPU élevé sur trafic HTTPS
- **Solution** : Exclure certains sites, upgrade hardware

### 5. Bug logiciel (variable)
- **Symptôme** : CPU élevé sans raison apparente
- **Solution** : Vérifier les hotfixes disponibles

---

## 📚 Documentation Palo Alto

### Commandes officielles

- `show running resource-monitor` - Data Plane CPU
- `show system resources` - Management Plane CPU
- `show counter global` - Compteurs de paquets
- `debug dataplane pow performance` - Debug Data Plane

### Liens utiles

- [Resource Monitoring](https://docs.paloaltonetworks.com/)
- [Performance Tuning](https://docs.paloaltonetworks.com/)
- [Troubleshooting High CPU](https://knowledgebase.paloaltonetworks.com/)

---

## ✅ Résumé

| Aspect | Management Plane | Data Plane |
|--------|------------------|------------|
| **Rôle** | Gestion du firewall | Traitement du trafic |
| **Commande** | `show system resources` | `show running resource-monitor` |
| **Valeur normale** | 5-15% | 10-60% (dépend du trafic) |
| **Impact si saturé** | Interface web lente | Latence, drops de paquets |
| **Importance** | Secondaire | **CRITIQUE** ⭐ |
| **Affiché dans PaloMalo** | Non (remplacé) | **OUI** ✅ |

**PaloMalo affiche maintenant le bon CPU ! 🎯**

---

**Version** : 2.1.0  
**Date** : 8 avril 2026  
**Statut** : ✅ Corrigé
