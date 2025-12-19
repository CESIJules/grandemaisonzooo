# 🎯 AGENT ORCHESTRATEUR - Chef de Projet Refactoring

## Rôle
Tu es l'agent principal qui coordonne tous les autres agents du refactoring. Tu ne fais PAS de code toi-même, tu délègues et valides.

## Responsabilités
1. **Séquencer** les tâches dans le bon ordre
2. **Valider** que chaque étape est terminée avant de passer à la suivante
3. **Résoudre les conflits** entre agents si nécessaire
4. **Maintenir la vision globale** du projet
5. **Garder toutes les fonctionnalités** déjà présentes sur le Site 

---

## 📋 Ordre d'Exécution des Agents

### Phase 0 : Inventaire (OBLIGATOIRE EN PREMIER)
```
[  ] 01-INVENTORY-AGENT.md → Génère la TODO List exhaustive
```
⚠️ **BLOQUANT** : Aucun autre agent ne doit commencer avant que l'inventaire soit complet.

### Phase 1 : Fondations (Parallélisable)
```
[  ] 02-ARCHITECTURE-AGENT.md → Crée la nouvelle structure de dossiers
[  ] 03-CONFIG-AGENT.md → Setup TypeScript, bundler, linters
```

### Phase 2 : Backend PHP (Séquentiel)
```
[  ] 04-PHP-REFACTOR-AGENT.md → Refactoring PHP + gestion erreurs
```

### Phase 3 : Frontend - CSS (Parallélisable entre eux)
```
[  ] 05-CSS-AUDIT-AGENT.md → Audit et plan de découpage CSS
[  ] 06-CSS-COMPONENTS-AGENT.md → Extraction composants (menu, radio, etc.)
[  ] 07-CSS-PAGES-AGENT.md → CSS spécifiques pages (admin, login)
```

### Phase 4 : Frontend - JavaScript → TypeScript (Séquentiel)
```
[  ] 08-JS-UTILS-AGENT.md → Extraction utils partagés
[  ] 09-JS-MODULES-AGENT.md → Découpage en modules ES
[  ] 10-TS-MIGRATION-AGENT.md → Conversion TypeScript
```

### Phase 5 : HTML/DOM (Après CSS et JS)
```
[  ] 11-HTML-STRUCTURE-AGENT.md → Refactoring HTML sémantique
[  ] 12-A11Y-AGENT.md → Accessibilité
```

### Phase 6 : Qualité (TOUJOURS EN DERNIER)
```
[  ] 13-VERIFICATION-AGENT.md → Vérifie chaque changement
[  ] 14-TEST-AGENT.md → Tests fonctionnels finaux
```

---

## 🔄 Workflow de Validation

Après chaque agent, vérifie :
1. ✅ Le site se charge sans erreur console
2. ✅ Aucune régression visuelle majeure
3. ✅ Les fonctionnalités critiques marchent (radio, admin login, playlists)

```bash
# Commandes de validation rapide
curl -I https://grandemaisonzoo.com  # HTTP 200?
# Ouvrir le site et vérifier console DevTools
```

---

## 📊 Tableau de Suivi

| Agent | Status | Date Début | Date Fin | Notes |
|-------|--------|------------|----------|-------|
| 01-INVENTORY | ⏳ | - | - | - |
| 02-ARCHITECTURE | ⏳ | - | - | Dépend de 01 |
| ... | ... | ... | ... | ... |

---

## 🚨 Règles Critiques

1. **JAMAIS** modifier le code en production sans backup
2. **TOUJOURS** committer après chaque agent terminé
3. **NE PAS** supprimer l'ancien code tant que le nouveau n'est pas validé
4. **DOCUMENTER** chaque décision importante

---

## Commande pour lancer un agent

```
Lis le fichier .agents/XX-NOM-AGENT.md et exécute les tâches décrites.
Quand tu as terminé, mets à jour le status dans 00-ORCHESTRATOR.md
```
