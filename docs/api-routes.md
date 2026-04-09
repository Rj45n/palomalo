# API Routes - PaloDiag

Documentation complète des API routes de PaloDiag.

---

## Table des matières

- [Authentification](#authentification)
- [Métriques](#métriques)
- [Diagnostic](#diagnostic)
- [Tech Support File](#tech-support-file)
- [Codes d'erreur](#codes-derreur)

---

## Authentification

### POST /api/connect

Authentification au firewall PAN-OS et génération de clé API.

**Request:**

```http
POST /api/connect
Content-Type: application/json

{
  "url": "192.168.1.1",
  "username": "admin",
  "password": "password"
}
```

**Response (Success):**

```http
HTTP/1.1 200 OK
Set-Cookie: panos_api_key=...; HttpOnly; Secure; SameSite=Strict
Set-Cookie: panos_url=...; HttpOnly; Secure; SameSite=Strict

{
  "success": true,
  "message": "Connexion réussie"
}
```

**Response (Error):**

```http
HTTP/1.1 401 Unauthorized

{
  "success": false,
  "error": "Identifiants invalides"
}
```

**Errors:**
- `400` : Champs manquants ou format invalide
- `401` : Identifiants incorrects
- `500` : Erreur serveur

---

### GET /api/connect

Vérification de session active.

**Request:**

```http
GET /api/connect
Cookie: panos_api_key=...; panos_url=...
```

**Response (Authenticated):**

```http
HTTP/1.1 200 OK

{
  "success": true,
  "authenticated": true,
  "message": "Session active"
}
```

**Response (Not Authenticated):**

```http
HTTP/1.1 401 Unauthorized

{
  "success": false,
  "authenticated": false,
  "error": "Aucune session active"
}
```

---

### DELETE /api/connect

Déconnexion et suppression des cookies.

**Request:**

```http
DELETE /api/connect
Cookie: panos_api_key=...; panos_url=...
```

**Response:**

```http
HTTP/1.1 200 OK
Set-Cookie: panos_api_key=; Max-Age=0
Set-Cookie: panos_url=; Max-Age=0

{
  "success": true,
  "message": "Déconnexion réussie"
}
```

---

## Métriques

### GET /api/metrics

Récupération des métriques en temps réel du firewall.

**Request:**

```http
GET /api/metrics
Cookie: panos_api_key=...; panos_url=...
```

**Response:**

```http
HTTP/1.1 200 OK

{
  "system": {
    "cpu": 25,
    "memory": 33,
    "disk": 45,
    "uptime": "15 days, 3:45:12"
  },
  "sessions": {
    "total": 262144,
    "active": 12543
  },
  "interfaces": [
    {
      "name": "ethernet1/1 (INTERNET)",
      "status": "up",
      "speed": "1000Mbps",
      "duplex": "full",
      "rx": 123456789,
      "tx": 987654321,
      "rxPackets": 1234567,
      "txPackets": 9876543,
      "rxErrors": 0,
      "txErrors": 0,
      "rxDrops": 0,
      "txDrops": 0,
      "utilization": 45.2,
      "lastChange": "2026-04-01 10:30:00"
    }
  ],
  "info": {
    "hostname": "FW-01",
    "model": "PA-5220",
    "serial": "013201028945",
    "version": "10.2.3",
    "uptime": "15 days, 3:45:12"
  },
  "interfaceIssues": [
    {
      "interface": "ethernet1/1",
      "severity": "warning",
      "type": "high-utilization",
      "message": "Utilisation élevée (85%)",
      "recommendation": "Surveiller l'évolution",
      "cliCommand": "show interface ethernet1/1"
    }
  ]
}
```

**Errors:**
- `401` : Non authentifié
- `500` : Erreur lors de la récupération des métriques

**Commandes PAN-OS utilisées:**
- `show system info`
- `show system resources`
- `show session info`
- `show counter interface <name>`

---

## Diagnostic

### POST /api/diagnostic

Analyse complète du firewall avec détection de problèmes.

**Request:**

```http
POST /api/diagnostic
Content-Type: application/json

{
  "liveMetrics": { /* DashboardMetrics */ },
  "tsfData": { /* TSFData (optionnel) */ }
}
```

**Response:**

```http
HTTP/1.1 200 OK

{
  "success": true,
  "issues": [
    {
      "id": "network-errors-critical-ethernet1/1-1234567890",
      "category": "network",
      "severity": "critical",
      "title": "Erreurs critiques sur ethernet1/1",
      "description": "104 erreurs détectées (RX: 104, TX: 0)",
      "impact": "Perte de paquets, dégradation des performances",
      "recommendation": "1. Vérifier la qualité du câble\n2. Vérifier les paramètres duplex/speed",
      "cliCommands": [
        "show counter interface ethernet1/1",
        "show interface ethernet1/1"
      ],
      "affectedComponents": ["ethernet1/1"],
      "detectedAt": "2026-04-06T10:30:00.000Z",
      "source": "live"
    }
  ],
  "healthScore": 45,
  "analyzedAt": "2026-04-06T10:30:00.000Z"
}
```

**Catégories de problèmes:**
- `system` : CPU, Memory, Disk
- `network` : Interfaces, Erreurs, Drops
- `performance` : Utilization, Sessions
- `ha` : High Availability
- `license` : Licenses expirées
- `security` : Problèmes de sécurité

**Sévérités:**
- `critical` : Problème critique nécessitant une action immédiate
- `major` : Problème majeur affectant le fonctionnement
- `warning` : Avertissement, surveillance recommandée
- `info` : Information, pas d'action requise

**Errors:**
- `400` : Métriques manquantes
- `500` : Erreur lors de l'analyse

---

## Tech Support File

### POST /api/tsf/upload

Upload et parsing d'un Tech Support File.

**Request:**

```http
POST /api/tsf/upload
Content-Type: multipart/form-data

file: <binary .tgz file>
```

**Response:**

```http
HTTP/1.1 200 OK

{
  "success": true,
  "data": {
    "metadata": {
      "filename": "techsupport-2026-04-06.tgz",
      "uploadedAt": "2026-04-06T10:30:00.000Z",
      "size": 52428800
    },
    "system": {
      "hostname": "FW-01",
      "model": "PA-5220",
      "serial": "013201028945",
      "version": "10.2.3",
      "uptime": "15 days, 3:45:12",
      "lastReboot": "2026-03-22 07:00:00"
    },
    "hardware": {
      "cpu": "11.6%",
      "memory": "12501 MB / 31836 MB (39.3%)",
      "disk": "45%",
      "temperature": {
        "CPU": 45,
        "Board": 42
      }
    },
    "processes": [
      {
        "pid": "1234",
        "name": "pan_task",
        "cpu": 45.2,
        "memory": 1.1
      }
    ],
    "logs": {
      "critical": ["Log entry 1", "Log entry 2"],
      "errors": ["Error 1", "Error 2"],
      "warnings": ["Warning 1"]
    },
    "ha": {
      "enabled": true,
      "state": "active",
      "peer": "192.168.1.2",
      "syncStatus": "synchronized"
    },
    "licenses": [
      {
        "feature": "Threat Prevention",
        "expires": "2027-04-06",
        "status": "active"
      }
    ],
    "interfaces": [ /* InterfaceStats[] */ ],
    "sessions": {
      "max": 262144,
      "current": 12543,
      "history": [
        { "time": "10:00", "count": 12000 },
        { "time": "10:30", "count": 12543 }
      ]
    }
  }
}
```

**Errors:**
- `400` : Fichier manquant, format invalide, ou taille > 500MB
- `500` : Erreur lors du parsing

**Formats acceptés:**
- `.tgz`
- `.tar.gz`

**Taille maximale:** 500MB

---

## Codes d'erreur

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Bad Request | Vérifier les paramètres de la requête |
| 401 | Unauthorized | Se connecter avec `/api/connect` |
| 403 | Forbidden | Vérifier les permissions |
| 404 | Not Found | Vérifier l'URL |
| 500 | Internal Server Error | Vérifier les logs serveur |
| 503 | Service Unavailable | Réessayer plus tard |

---

## Rate Limiting

**Limites actuelles:**
- Aucune limite (à implémenter en production)

**Recommandations pour la production:**
- `/api/connect` : 5 requêtes / minute
- `/api/metrics` : 60 requêtes / minute
- `/api/diagnostic` : 30 requêtes / minute
- `/api/tsf/upload` : 10 requêtes / heure

---

## Authentification

Toutes les routes sauf `/api/connect` (POST) nécessitent une authentification via cookies HTTP-only.

**Cookies requis:**
- `panos_api_key` : Clé API PAN-OS
- `panos_url` : URL du firewall

**Durée de vie:** 24 heures

---

## CORS

**Origine autorisée:** Same-origin uniquement

**Headers:**
- `Access-Control-Allow-Origin` : Non défini (same-origin)
- `Access-Control-Allow-Credentials` : `true`

---

## Exemples de code

### JavaScript (Fetch API)

```javascript
// Connexion
const response = await fetch('/api/connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: '192.168.1.1',
    username: 'admin',
    password: 'password'
  })
});

const data = await response.json();
console.log(data);

// Métriques
const metricsResponse = await fetch('/api/metrics');
const metrics = await metricsResponse.json();
console.log(metrics);

// Diagnostic
const diagnosticResponse = await fetch('/api/diagnostic', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ liveMetrics: metrics })
});

const diagnostic = await diagnosticResponse.json();
console.log(diagnostic);
```

### cURL

```bash
# Connexion
curl -X POST http://localhost:3000/api/connect \
  -H "Content-Type: application/json" \
  -d '{"url":"192.168.1.1","username":"admin","password":"password"}' \
  -c cookies.txt

# Métriques
curl http://localhost:3000/api/metrics \
  -b cookies.txt

# Upload TSF
curl -X POST http://localhost:3000/api/tsf/upload \
  -F "file=@techsupport.tgz" \
  -b cookies.txt
```

---

## Changelog API

### Version 1.0.0 (2026-04-06)

- Initial release
- `/api/connect` : Authentification
- `/api/metrics` : Métriques live
- `/api/diagnostic` : Analyse complète
- `/api/tsf/upload` : Upload TSF

---

<div align="center">
  <strong>Documentation API complète ✅</strong>
</div>
