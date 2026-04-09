# Guide de Déploiement PaloDiag

Ce guide couvre le déploiement de PaloDiag en production.

---

## 📋 Prérequis

- Node.js 20+
- npm ou yarn
- Serveur avec HTTPS (certificat valide)
- Accès réseau au(x) firewall(s) Palo Alto

---

## 🚀 Déploiement sur serveur Linux

### 1. Préparation du serveur

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérification
node -v  # v20.x.x
npm -v   # 10.x.x
```

### 2. Installation de PaloDiag

```bash
# Créer un utilisateur dédié
sudo useradd -m -s /bin/bash palodiag
sudo su - palodiag

# Cloner le repository
git clone https://github.com/votre-username/palodiag.git
cd palodiag

# Installation
./setup.sh
```

### 3. Configuration

```bash
# Créer le fichier .env.local
cat > .env.local << EOF
NODE_ENV=production
PORT=3000
EOF
```

### 4. Build de production

```bash
npm run build
```

### 5. Configuration du service systemd

```bash
# Créer le fichier service
sudo nano /etc/systemd/system/palodiag.service
```

Contenu :

```ini
[Unit]
Description=PaloDiag - Palo Alto Networks Diagnostic Tool
After=network.target

[Service]
Type=simple
User=palodiag
WorkingDirectory=/home/palodiag/palodiag
ExecStart=/usr/bin/npm start
Restart=on-failure
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=palodiag

Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

```bash
# Activer et démarrer le service
sudo systemctl daemon-reload
sudo systemctl enable palodiag
sudo systemctl start palodiag

# Vérifier le statut
sudo systemctl status palodiag
```

### 6. Configuration Nginx (Reverse Proxy + HTTPS)

```bash
# Installer Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Créer la configuration
sudo nano /etc/nginx/sites-available/palodiag
```

Contenu :

```nginx
server {
    listen 80;
    server_name palodiag.example.com;

    # Redirection HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name palodiag.example.com;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/palodiag.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/palodiag.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Logs
    access_log /var/log/nginx/palodiag_access.log;
    error_log /var/log/nginx/palodiag_error.log;
}
```

```bash
# Activer la configuration
sudo ln -s /etc/nginx/sites-available/palodiag /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d palodiag.example.com
```

### 7. Firewall

```bash
# Autoriser HTTP/HTTPS
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 🐳 Déploiement avec Docker

### 1. Créer le Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci --production

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
```

### 2. Créer docker-compose.yml

```yaml
version: '3.8'

services:
  palodiag:
    build: .
    container_name: palodiag
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    volumes:
      - ./logs:/app/logs
    networks:
      - palodiag-network

networks:
  palodiag-network:
    driver: bridge
```

### 3. Build et lancement

```bash
# Build
docker-compose build

# Lancer
docker-compose up -d

# Vérifier les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

---

## ☁️ Déploiement sur Vercel

### 1. Prérequis

- Compte Vercel
- Repository GitHub

### 2. Déploiement

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Déployer
vercel
```

Ou via l'interface web :

1. Connectez-vous à [vercel.com](https://vercel.com)
2. Importez votre repository GitHub
3. Configurez les variables d'environnement
4. Déployez

### 3. Configuration

Variables d'environnement sur Vercel :

```
NODE_ENV=production
```

---

## 🔧 Maintenance

### Mise à jour

```bash
# Arrêter le service
sudo systemctl stop palodiag

# Mettre à jour le code
cd /home/palodiag/palodiag
git pull origin main

# Installer les nouvelles dépendances
npm install

# Rebuild
npm run build

# Redémarrer
sudo systemctl start palodiag
```

### Logs

```bash
# Logs systemd
sudo journalctl -u palodiag -f

# Logs Nginx
sudo tail -f /var/log/nginx/palodiag_access.log
sudo tail -f /var/log/nginx/palodiag_error.log

# Logs Docker
docker-compose logs -f
```

### Backup

```bash
# Backup du code
tar -czf palodiag-backup-$(date +%Y%m%d).tar.gz /home/palodiag/palodiag

# Pas de base de données à sauvegarder (stateless)
```

### Monitoring

Recommandations :

- **Uptime monitoring** : UptimeRobot, Pingdom
- **Application monitoring** : Sentry, LogRocket
- **Server monitoring** : Prometheus + Grafana

---

## 🔒 Sécurité en Production

### Checklist

- [ ] HTTPS activé (certificat valide)
- [ ] Firewall configuré
- [ ] Variables d'environnement sécurisées
- [ ] Logs activés
- [ ] Mises à jour régulières
- [ ] Backup automatique
- [ ] Monitoring actif

### Bonnes pratiques

1. **Ne jamais exposer les credentials** dans le code ou les logs
2. **Utiliser HTTPS uniquement** (pas de HTTP)
3. **Limiter l'accès réseau** aux firewalls autorisés
4. **Mettre à jour régulièrement** les dépendances
5. **Surveiller les logs** pour détecter les anomalies

---

## 📊 Performance

### Optimisations

1. **CDN** : Utiliser un CDN pour les assets statiques
2. **Caching** : Activer le cache Nginx
3. **Compression** : Activer gzip/brotli
4. **HTTP/2** : Activer HTTP/2 dans Nginx

### Configuration Nginx optimisée

```nginx
# Compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

# Cache
location /_next/static {
    alias /home/palodiag/palodiag/.next/static;
    expires 365d;
    access_log off;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=one:10m rate=10r/s;
limit_req zone=one burst=20 nodelay;
```

---

## 🐛 Troubleshooting

### Problème : Service ne démarre pas

```bash
# Vérifier les logs
sudo journalctl -u palodiag -n 50

# Vérifier le port
sudo netstat -tlnp | grep 3000

# Vérifier les permissions
ls -la /home/palodiag/palodiag
```

### Problème : Erreur 502 Bad Gateway

```bash
# Vérifier que Next.js tourne
sudo systemctl status palodiag

# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/palodiag_error.log
```

### Problème : Certificat SSL invalide

```bash
# Renouveler le certificat
sudo certbot renew

# Vérifier l'expiration
sudo certbot certificates
```

---

## 📞 Support

Pour toute question sur le déploiement :

- 📧 Email : support@palodiag.com
- 💬 Discord : [Rejoindre le serveur](https://discord.gg/palodiag)
- 🐛 Issues : [GitHub Issues](https://github.com/votre-username/palodiag/issues)

---

<div align="center">
  <strong>Bon déploiement ! 🚀</strong>
</div>
