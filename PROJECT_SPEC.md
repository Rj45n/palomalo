
**Fonctionnalités clés (à implémenter dans l’ordre)** :

1. **Connexion Firewall**
   - Formulaire : URL/IP, Username, Password
   - Bouton → appelle /api/connect → fait `?type=keygen` → stocke la clé dans un cookie HTTP-only
   - Affichage statut + erreur claire

2. **Dashboard principal**
   - Sidebar fixe (Overview, Performance, Security, Hardware, Diagnostics)
   - Header avec nom du firewall + refresh
   - Cartes métriques (CPU, Memory, Sessions, Throughput, etc.)

3. **Métriques live**
   - Appels PAN-OS via clé :
     - show system resources
     - show counter global
     - show session info
     - show interface all
     - show system info
   - Graphiques : CPU/Mem line + gauge, throughput area, sessions bar, etc.
   - Refresh auto toutes les 20-30s

4. **Tech Support File Upload**
   - Drag & drop stylé
   - Parse côté serveur le .tgz (utilise adm-zip ou tar-stream + xml2js)
   - Extrait : version, serial, uptime, top processes, erreurs logs, HA status, etc.
   - Génère graphiques supplémentaires à partir des données du TSF

5. **Diagnostic IA / Support Mode**
   - Analyse combinée (live + TSF)
   - Liste de problèmes détectés avec sévérité (Critical / Major / Warning)
   - Explications en français + commandes CLI recommandées (copier-coller)
   - Suggestions de fix

**Design** : Très premium, dark, couleurs Palo Alto (bleu #0072B8 + orange accents), glassmorphism, animations subtiles, responsive.

**Contraintes importantes pour économiser les tokens** :
- Code propre, bien commenté, typé
- Pas de bla-bla dans les réponses : génère directement les fichiers nécessaires
- Utilise shadcn/ui pour les composants UI (n’invente pas tes propres)
- Gestion d’erreur robuste + loading states
- Sécurité : credentials jamais côté client

Commence par créer la structure de base + connexion + API keygen. Une fois validé, je te dirai la suite.

Génère tout le projet de manière progressive et modulaire.