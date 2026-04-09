# Guide de Contribution à PaloDiag

Merci de votre intérêt pour contribuer à PaloDiag ! Ce document vous guidera à travers le processus de contribution.

---

## 📋 Table des matières

- [Code de conduite](#code-de-conduite)
- [Comment contribuer](#comment-contribuer)
- [Processus de développement](#processus-de-développement)
- [Standards de code](#standards-de-code)
- [Tests](#tests)
- [Documentation](#documentation)
- [Pull Requests](#pull-requests)

---

## Code de conduite

En participant à ce projet, vous acceptez de respecter notre code de conduite :

- Soyez respectueux et inclusif
- Acceptez les critiques constructives
- Concentrez-vous sur ce qui est le mieux pour la communauté
- Montrez de l'empathie envers les autres membres

---

## Comment contribuer

### Signaler un bug

1. Vérifiez que le bug n'a pas déjà été signalé dans les [Issues](https://github.com/votre-username/palodiag/issues)
2. Créez une nouvelle issue avec le template "Bug Report"
3. Incluez :
   - Description claire du problème
   - Étapes pour reproduire
   - Comportement attendu vs actuel
   - Captures d'écran si applicable
   - Environnement (OS, navigateur, version PAN-OS)

### Proposer une fonctionnalité

1. Créez une issue avec le template "Feature Request"
2. Décrivez :
   - Le problème que cette fonctionnalité résout
   - La solution proposée
   - Les alternatives considérées
   - Impact sur l'existant

### Contribuer au code

1. **Fork** le repository
2. **Clone** votre fork :
   ```bash
   git clone https://github.com/votre-username/palodiag.git
   cd palodiag
   ```
3. **Créez une branche** :
   ```bash
   git checkout -b feature/ma-nouvelle-fonctionnalite
   ```
4. **Installez les dépendances** :
   ```bash
   npm install
   ```
5. **Développez** votre fonctionnalité
6. **Testez** vos changements
7. **Committez** :
   ```bash
   git commit -m "feat: ajout de ma nouvelle fonctionnalité"
   ```
8. **Push** :
   ```bash
   git push origin feature/ma-nouvelle-fonctionnalite
   ```
9. **Ouvrez une Pull Request**

---

## Processus de développement

### Setup de l'environnement

```bash
# Cloner le repo
git clone https://github.com/votre-username/palodiag.git
cd palodiag

# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Lancer les tests
npm test

# Build de production
npm run build
```

### Structure des branches

- `main` : Branche principale (production)
- `develop` : Branche de développement
- `feature/*` : Nouvelles fonctionnalités
- `fix/*` : Corrections de bugs
- `docs/*` : Documentation
- `refactor/*` : Refactoring
- `test/*` : Tests

### Workflow Git

```
main (stable)
  ↓
develop (dev)
  ↓
feature/ma-feature (votre travail)
```

1. Créez votre branche depuis `develop`
2. Développez votre fonctionnalité
3. Ouvrez une PR vers `develop`
4. Après review et merge, `develop` est mergée dans `main`

---

## Standards de code

### TypeScript

- **Strict mode** activé
- **Types explicites** pour les paramètres et retours de fonction
- **Interfaces** pour les objets complexes
- **Enums** pour les valeurs constantes

```typescript
// ✅ Bon
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  // ...
}

// ❌ Mauvais
function getUser(id) {
  // ...
}
```

### React

- **Functional components** avec hooks
- **Props typées** avec interfaces
- **Naming** : PascalCase pour les composants
- **Exports** : Export nommé par défaut

```typescript
// ✅ Bon
interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
}

export default function MetricCard({ title, value, unit }: MetricCardProps) {
  return <div>{title}: {value}{unit}</div>;
}

// ❌ Mauvais
export default function MetricCard(props) {
  return <div>{props.title}: {props.value}{props.unit}</div>;
}
```

### Styling

- **Tailwind CSS** pour tous les styles
- **Classes utilitaires** au lieu de CSS custom
- **Responsive** : mobile-first
- **Dark mode** : par défaut

```tsx
// ✅ Bon
<div className="glass rounded-lg p-6 border border-white/10">
  <h2 className="text-lg font-semibold mb-4">Titre</h2>
</div>

// ❌ Mauvais
<div style={{ padding: '24px', borderRadius: '8px' }}>
  <h2 style={{ fontSize: '18px' }}>Titre</h2>
</div>
```

### Naming Conventions

| Type | Convention | Exemple |
|------|------------|---------|
| Fichiers | kebab-case | `diagnostic-engine.ts` |
| Composants | PascalCase | `MetricCard.tsx` |
| Fonctions | camelCase | `analyzeFirewall()` |
| Variables | camelCase | `apiKey`, `userName` |
| Constantes | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |
| Interfaces | PascalCase | `DiagnosticIssue` |
| Types | PascalCase | `ConnectRequest` |

### Commentaires

- **JSDoc** pour les fonctions publiques
- **Commentaires inline** pour la logique complexe uniquement
- **Pas de commentaires évidents**

```typescript
// ✅ Bon
/**
 * Analyse complète du firewall (live + TSF)
 * @param liveMetrics - Métriques en temps réel
 * @param tsfData - Données du Tech Support File (optionnel)
 * @returns Liste des problèmes détectés
 */
export function analyzeFirewall(
  liveMetrics: DashboardMetrics,
  tsfData?: TSFData
): DiagnosticIssue[] {
  // ...
}

// ❌ Mauvais
// Cette fonction analyse le firewall
function analyze(data) {
  // Boucle sur les données
  for (let i = 0; i < data.length; i++) {
    // ...
  }
}
```

---

## Tests

### Types de tests

1. **Tests E2E** : Tests end-to-end complets
2. **Tests unitaires** : Tests des fonctions individuelles
3. **Tests d'intégration** : Tests des API routes

### Écrire des tests

```typescript
// test-my-feature.js
async function testMyFeature() {
  console.log("TEST: Ma fonctionnalité...");
  
  try {
    const result = await myFunction();
    
    if (result === expected) {
      console.log("✅ TEST RÉUSSI");
      return true;
    } else {
      throw new Error("Résultat inattendu");
    }
  } catch (error) {
    console.log("❌ TEST ÉCHOUÉ:", error.message);
    return false;
  }
}
```

### Lancer les tests

```bash
# Tests E2E complets
node test-complete-e2e.js

# Test spécifique
node test-diagnostic-engine.js
```

### Coverage

- **Minimum requis** : 80%
- **Objectif** : 95%
- **Critique** : 100% pour les fonctions de sécurité

---

## Documentation

### Code

- **JSDoc** pour toutes les fonctions publiques
- **README** à jour
- **CHANGELOG** pour chaque version
- **Commentaires inline** pour la logique complexe

### Documentation utilisateur

- **README.md** : Installation, utilisation, FAQ
- **docs/** : Documentation technique détaillée
- **CHANGELOG.md** : Historique des versions

### Mise à jour de la documentation

Lors de l'ajout d'une fonctionnalité :

1. Mettez à jour le README si nécessaire
2. Ajoutez une entrée dans CHANGELOG.md
3. Créez/mettez à jour la documentation technique dans `docs/`
4. Ajoutez des commentaires JSDoc

---

## Pull Requests

### Checklist avant PR

- [ ] Le code compile sans erreur
- [ ] Les tests passent
- [ ] Le code suit les standards
- [ ] La documentation est à jour
- [ ] Les commits sont clairs
- [ ] La PR est liée à une issue

### Format du titre

Utilisez les [Conventional Commits](https://www.conventionalcommits.org/) :

- `feat:` Nouvelle fonctionnalité
- `fix:` Correction de bug
- `docs:` Documentation
- `style:` Formatting, pas de changement de code
- `refactor:` Refactoring
- `test:` Ajout de tests
- `chore:` Maintenance

**Exemples :**
- `feat: ajout du support multi-firewall`
- `fix: correction du parsing TSF pour PAN-OS 11.0`
- `docs: mise à jour du guide d'installation`

### Description de la PR

```markdown
## Description
Brève description de ce que fait cette PR.

## Motivation et contexte
Pourquoi ce changement est nécessaire ? Quel problème résout-il ?

## Type de changement
- [ ] Bug fix
- [ ] Nouvelle fonctionnalité
- [ ] Breaking change
- [ ] Documentation

## Comment tester
1. Étape 1
2. Étape 2
3. Résultat attendu

## Checklist
- [ ] Code testé
- [ ] Documentation mise à jour
- [ ] Tests passent
- [ ] Pas de régression
```

### Review Process

1. **Automatic checks** : Linting, tests
2. **Code review** : Au moins 1 approbation requise
3. **Testing** : Vérification manuelle si nécessaire
4. **Merge** : Squash and merge vers `develop`

---

## Bonnes pratiques

### Commits

- **Atomiques** : 1 commit = 1 changement logique
- **Messages clairs** : Décrivez le "quoi" et le "pourquoi"
- **Fréquents** : Committez souvent

```bash
# ✅ Bon
git commit -m "feat: ajout du calcul d'utilisation des interfaces"
git commit -m "fix: correction du parsing des erreurs d'interface"

# ❌ Mauvais
git commit -m "updates"
git commit -m "fix stuff"
```

### Code Review

#### En tant que reviewer

- Soyez constructif et respectueux
- Expliquez le "pourquoi" de vos suggestions
- Approuvez rapidement les petites PRs
- Testez les changements critiques

#### En tant qu'auteur

- Répondez à tous les commentaires
- Expliquez vos choix si nécessaire
- Soyez ouvert aux suggestions
- Mettez à jour la PR rapidement

---

## Questions ?

- 💬 **Discord** : [Rejoindre le serveur](https://discord.gg/palodiag)
- 📧 **Email** : dev@palodiag.com
- 🐛 **Issues** : [GitHub Issues](https://github.com/votre-username/palodiag/issues)

---

## Remerciements

Merci de contribuer à PaloDiag ! Chaque contribution, petite ou grande, est appréciée. 🙏

---

<div align="center">
  <strong>Happy Coding! 🚀</strong>
</div>
