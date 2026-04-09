#!/bin/bash

# PaloDiag - Script d'installation rapide
# Ce script configure l'environnement de développement en quelques secondes

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              🔥 PaloDiag - Installation 🔥                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Vérifier Node.js
echo "📦 Vérification de Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    echo "   Installez Node.js 20+ depuis https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version $NODE_VERSION détectée"
    echo "   Version 20+ requise"
    exit 1
fi

echo "✅ Node.js $(node -v) détecté"
echo ""

# Vérifier npm
echo "📦 Vérification de npm..."
if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé"
    exit 1
fi

echo "✅ npm $(npm -v) détecté"
echo ""

# Installation des dépendances
echo "📦 Installation des dépendances..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dépendances installées avec succès"
else
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

echo ""

# Créer .env.local si nécessaire
if [ ! -f ".env.local" ]; then
    echo "📝 Création du fichier .env.local..."
    cat > .env.local << EOF
# Mode développement (accepte les certificats auto-signés)
NODE_ENV=development

# Port (optionnel, par défaut 3000)
# PORT=3001
EOF
    echo "✅ Fichier .env.local créé"
else
    echo "ℹ️  Fichier .env.local existe déjà"
fi

echo ""

# Résumé
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ INSTALLATION TERMINÉE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Pour lancer PaloDiag en développement :"
echo "   npm run dev"
echo ""
echo "🏗️  Pour build en production :"
echo "   npm run build"
echo "   npm start"
echo ""
echo "🧪 Pour lancer les tests :"
echo "   node test-complete-e2e.js"
echo ""
echo "📖 Documentation :"
echo "   README.md"
echo "   docs/architecture.md"
echo "   docs/contributing.md"
echo ""
echo "🌐 L'application sera accessible sur :"
echo "   http://localhost:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Astuce : Connectez-vous à votre firewall Palo Alto Networks"
echo "   et commencez à diagnostiquer !"
echo ""
echo "🙏 Merci d'utiliser PaloDiag !"
echo ""
