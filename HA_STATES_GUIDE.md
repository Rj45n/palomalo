# Guide des États HA - Palo Alto Networks

## États du Peer HA

### États normaux (pas d'alerte)

| État | Description | Action |
|------|-------------|--------|
| `active` | Peer actif (traite le trafic) | ✅ Normal |
| `passive` | Peer passif (standby) | ✅ Normal |
| `active-primary` | Peer actif primaire | ✅ Normal |
| `active-secondary` | Peer actif secondaire | ✅ Normal |
| `connected` | Peer connecté | ✅ Normal |

### États problématiques (alerte)

| État | Sévérité | Description | Action |
|------|----------|-------------|--------|
| `disconnected` | **Critical** | Peer déconnecté | Vérifier connectivité immédiatement |
| `non-functional` | **Critical** | Peer non fonctionnel | Vérifier état du firewall peer |
| `suspended` | **Major** | Peer suspendu | Vérifier configuration HA |
| `initial` | **Major** | Peer en initialisation | Attendre ou investiguer si persiste |
| `tentative` | **Major** | Peer en état transitoire | Surveiller l'évolution |

### États ambigus (pas d'alerte)

| État | Description | Action |
|------|-------------|--------|
| `unknown` | Parsing incomplet | Ignorer (peut être un problème de parsing XML) |

---

## Status de Synchronisation

### États normaux

| Status | Description | Action |
|--------|-------------|--------|
| `synchronized` | Configs synchronisées | ✅ Normal |
| `sync-enabled` | Sync activée | ✅ Normal |

### États problématiques

| Status | Sévérité | Description | Action |
|--------|----------|-------------|--------|
| `not-synchronized` | **Major** | Configs différentes | Forcer la sync |
| `out-of-sync` | **Major** | Désynchronisé | Forcer la sync |
| `failed` | **Major** | Échec de sync | Vérifier connectivité |

### États ambigus

| Status | Description | Action |
|--------|-------------|--------|
| `unknown` | Parsing incomplet | Ignorer |

---

## Commandes de diagnostic

### Vérifier l'état HA

```bash
# Vue complète
show high-availability all

# État local uniquement
show high-availability state

# Logs HA
show log system direction equal backward | match HA
```

### Forcer la synchronisation

```bash
# Sync running-config vers le peer
request high-availability sync-to-remote running-config

# Sync candidate-config vers le peer
request high-availability sync-to-remote candidate-config
```

### Tester la connectivité HA

```bash
# Ping vers le peer via l'interface HA
ping host <peer-ha-ip>

# Vérifier les interfaces HA
show interface ha1-a
show interface ha1-b
```

---

## Structure XML typique

### HA Actif-Passif

```xml
<response status="success">
  <result>
    <enabled>yes</enabled>
    <group>
      <mode>Active-Passive</mode>
      <local-info>
        <state>active</state>
        <mgmt-ip>10.0.0.1</mgmt-ip>
      </local-info>
      <peer-info>
        <state>passive</state>
        <mgmt-ip>10.0.0.2</mgmt-ip>
        <conn-status>up</conn-status>
      </peer-info>
      <running-sync>synchronized</running-sync>
    </group>
  </result>
</response>
```

### HA Actif-Actif

```xml
<response status="success">
  <result>
    <enabled>yes</enabled>
    <group>
      <mode>Active-Active</mode>
      <local-info>
        <state>active-primary</state>
        <device-id>0</device-id>
      </local-info>
      <peer-info>
        <state>active-secondary</state>
        <device-id>1</device-id>
        <conn-status>up</conn-status>
      </peer-info>
      <running-sync>synchronized</running-sync>
    </group>
  </result>
</response>
```

### HA Peer Down

```xml
<response status="success">
  <result>
    <enabled>yes</enabled>
    <group>
      <mode>Active-Passive</mode>
      <local-info>
        <state>active</state>
      </local-info>
      <peer-info>
        <state>non-functional</state>
        <conn-status>down</conn-status>
      </peer-info>
      <running-sync>not-synchronized</running-sync>
    </group>
  </result>
</response>
```

---

## Logique de détection améliorée

### Avant (v2.0.0)

```typescript
// ❌ Alerte si unknown OU down
if (peerState === "unknown" || peerState === "down") {
  alert("Peer HA inaccessible");
}
```

**Problème** : "unknown" peut être un problème de parsing, pas un vrai problème.

### Après (v2.1.0)

```typescript
// ✅ Alerte uniquement sur états vraiment problématiques
const problematicStates = [
  "disconnected",
  "non-functional", 
  "suspended",
  "initial",
  "tentative"
];

if (problematicStates.includes(peerState)) {
  alert("Peer HA dans un état problématique");
}
```

**Avantage** : Pas de fausse alerte si le parsing est incomplet.

---

## Parsing amélioré

### Champs multiples

Le parser vérifie maintenant plusieurs champs possibles :

```typescript
const peerState = 
  peerInfo.state ||           // Champ standard
  peerInfo["ha-state"] ||     // Champ alternatif
  peerInfo.status ||          // Autre variante
  "unknown";                  // Fallback
```

### Vérification connectivité

```typescript
const conn = peerInfo.conn || peerInfo["conn-status"];
if (conn && conn.toLowerCase().includes("down")) {
  result.peerState = "disconnected";
}
```

---

## Debugging

### Activer les logs de parsing

Dans `lib/advanced-parsers.ts`, le parsing affiche maintenant :

```typescript
console.log("HA Parsing:", {
  enabled: result.enabled,
  localState: result.localState,
  peerState: result.peerState,
  syncStatus: result.syncStatus,
});
```

### Vérifier la réponse XML brute

Ajouter dans `/api/metrics-advanced/route.ts` :

```typescript
const haXml = await getHAStatus(url, apiKey);
console.log("HA XML brut:", JSON.stringify(haXml, null, 2));
```

---

## Recommandations

### Pour éviter les fausses alertes

1. **Ne pas alerter sur "unknown"** - Peut être un problème de parsing
2. **Vérifier conn-status** - Plus fiable que state
3. **Tester avec plusieurs versions PAN-OS** - Structure XML peut varier
4. **Logger les réponses XML** - Pour débugger les problèmes de parsing

### Pour améliorer la détection

1. **Ajouter un timeout** - Si peer "unknown" pendant > 5 minutes → alerte
2. **Vérifier les logs HA** - Chercher "peer unreachable" dans les logs
3. **Ping test** - Tester la connectivité avec le peer
4. **Historique** - Tracker les changements d'état

---

## Correction appliquée

### Changements

1. **Parser amélioré** (`lib/advanced-parsers.ts`)
   - Vérification de plusieurs champs XML
   - Détection du conn-status
   - Normalisation des états en lowercase

2. **Logique de détection** (`lib/diagnostic-engine.ts`)
   - Liste explicite d'états problématiques
   - Ignore "unknown" (problème de parsing)
   - Sévérité adaptée selon l'état

### Résultat

- ✅ Pas de fausse alerte si HA fonctionne
- ✅ Alerte uniquement sur états vraiment problématiques
- ✅ Messages plus précis
- ✅ Sévérité adaptée

---

**Version** : 2.1.0  
**Date** : 8 avril 2026  
**Statut** : ✅ Corrigé
