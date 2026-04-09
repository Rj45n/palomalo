# 📊 Dashboard - Configuration API

## APIs Disponibles

Le dashboard peut utiliser deux APIs pour récupérer les métriques :

### 1. API Mock (Par défaut) ✅ Recommandé pour le développement

**Endpoint** : `/api/metrics-mock`

**Avantages** :
- ✅ Données aléatoires réalistes
- ✅ Pas d'appel au firewall
- ✅ Rapide et fiable
- ✅ Pas de risque d'erreur réseau

**Utilisation** : Activée par défaut dans `app/dashboard/page.tsx`

```typescript
const response = await fetch("/api/metrics-mock");
```

### 2. API Réelle 🔥 Pour le firewall réel

**Endpoint** : `/api/metrics`

**Avantages** :
- ✅ Données réelles du firewall
- ✅ Métriques en temps réel

**Inconvénients** :
- ⚠️ Nécessite un firewall accessible
- ⚠️ Peut échouer si commandes PAN-OS incorrectes
- ⚠️ Plus lent (appels réseau)

**Utilisation** : À activer manuellement

```typescript
const response = await fetch("/api/metrics");
```

---

## Basculer entre Mock et Réel

### Option 1 : Modification du code (actuel)

Dans `app/dashboard/page.tsx`, ligne ~50 :

```typescript
// API Mock (par défaut)
const response = await fetch("/api/metrics-mock");

// Pour utiliser l'API réelle, remplacer par :
// const response = await fetch("/api/metrics");
```

### Option 2 : Variable d'environnement (recommandé)

Créer `.env.local` :

```env
# API Mock pour développement
NEXT_PUBLIC_USE_MOCK_API=true

# API Réelle pour production
# NEXT_PUBLIC_USE_MOCK_API=false
```

Puis dans `app/dashboard/page.tsx` :

```typescript
const apiEndpoint = process.env.NEXT_PUBLIC_USE_MOCK_API === "true" 
  ? "/api/metrics-mock" 
  : "/api/metrics";

const response = await fetch(apiEndpoint);
```

---

## Commandes PAN-OS Utilisées

L'API `/api/metrics` exécute ces commandes sur le firewall :

| Commande | XML Généré | Données Récupérées |
|----------|------------|-------------------|
| `show system resources` | `<show><system><resources></resources></system></show>` | CPU, Memory, Disk, Uptime |
| `show session info` | `<show><session><info></info></session></show>` | Sessions actives, TCP, UDP, ICMP |
| `show interface all` | `<show><interface><all></all></interface></show>` | Interfaces réseau, status, RX/TX |
| `show system info` | `<show><system><info></info></system></show>` | Hostname, Model, Serial, Version |

---

## Dépannage

### Erreur HTTP 400

**Cause** : Commande XML mal formatée

**Solution** : Vérifier que la fonction `executeCommand` dans `lib/panos.ts` génère le bon format XML.

**Test** : Essayer manuellement dans le navigateur :
```
https://172.18.111.201/api/?type=op&cmd=<show><system><resources></resources></system></show>&key=VOTRE_CLE
```

### Erreur HTTP 500

**Cause** : Parsing XML échoué ou commande non supportée

**Solution** : 
1. Vérifier les logs du serveur Next.js
2. Tester la commande directement sur le firewall
3. Ajuster le parsing dans `app/api/metrics/route.ts`

### Données manquantes

**Cause** : Structure XML différente de celle attendue

**Solution** : 
1. Logger la réponse XML brute
2. Ajuster les fonctions de parsing dans `app/api/metrics/route.ts`

---

## Exemple de Test Manuel

### 1. Tester l'API Mock

```bash
curl http://localhost:3000/api/metrics-mock \
  -H "Cookie: panos_api_key=xxx; panos_url=172.18.111.201"
```

### 2. Tester l'API Réelle

```bash
curl http://localhost:3000/api/metrics \
  -H "Cookie: panos_api_key=xxx; panos_url=172.18.111.201"
```

### 3. Tester une commande PAN-OS directement

```bash
curl -k "https://172.18.111.201/api/?type=op&cmd=<show><system><resources></resources></system></show>&key=VOTRE_CLE"
```

---

## Recommandations

### Développement
- ✅ Utiliser `/api/metrics-mock`
- ✅ Développer et tester l'UI sans dépendre du firewall
- ✅ Itérer rapidement

### Tests
- 🧪 Tester `/api/metrics` avec le firewall réel
- 🧪 Vérifier que les commandes PAN-OS fonctionnent
- 🧪 Ajuster le parsing si nécessaire

### Production
- 🚀 Basculer vers `/api/metrics`
- 🚀 Monitorer les erreurs
- 🚀 Avoir un fallback vers mock en cas d'erreur

---

## Configuration Actuelle

**Status** : ✅ API Mock activée par défaut

Le dashboard utilise actuellement `/api/metrics-mock` pour garantir une expérience stable pendant le développement.

Pour tester avec le firewall réel :
1. Ouvrir `app/dashboard/page.tsx`
2. Ligne ~50, changer `/api/metrics-mock` en `/api/metrics`
3. Recharger le dashboard
4. Observer les logs du serveur pour détecter d'éventuelles erreurs

---

**Dernière mise à jour** : 6 avril 2026, 22:15
