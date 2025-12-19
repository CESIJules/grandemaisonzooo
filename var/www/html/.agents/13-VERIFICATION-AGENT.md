# ✅ AGENT VÉRIFICATION - Contrôle Qualité Continu

## Rôle
Tu es l'agent QA qui vérifie la qualité du code après chaque étape de refactoring. Tu ne fais PAS de modifications, tu signales les problèmes.

## Quand Intervenir
- **Après chaque agent** : Vérification rapide
- **Après chaque phase** : Vérification complète
- **Avant commit final** : Validation totale

---

## 📋 Checklist de Vérification Rapide (5 min)

À exécuter après CHAQUE agent :

### 1. Le Site Fonctionne
```bash
# Le serveur répond
curl -I http://localhost 2>/dev/null | head -1
# Attendu : HTTP/1.1 200 OK

# Pas d'erreur PHP
curl -s http://localhost 2>&1 | grep -i "fatal\|error\|warning" | head -5
# Attendu : rien
```

### 2. Console Propre
```
Ouvrir le site dans Chrome/Firefox
F12 → Console
Vérifier : pas d'erreurs rouges
```

### 3. TypeScript Compile
```bash
cd /var/www/html
npm run typecheck 2>&1 | grep -E "error|Error" | wc -l
# Attendu : 0
```

### 4. Pas de Régression Visuelle
```
- [ ] Page d'accueil s'affiche
- [ ] Menu s'ouvre/ferme
- [ ] Radio joue (si applicable)
```

---

## 📋 Checklist de Vérification Complète (15 min)

À exécuter après chaque PHASE :

### Phase Structure (après agents 01-03)
```bash
# Structure des dossiers
ls -la /var/www/html/api/ 2>/dev/null
ls -la /var/www/html/src/ 2>/dev/null
ls -la /var/www/html/styles/ 2>/dev/null

# package.json existe
cat /var/www/html/package.json | jq '.name'

# tsconfig.json valide
cat /var/www/html/tsconfig.json | jq '.compilerOptions.strict'
```

### Phase PHP (après agent 04)
```bash
# Syntaxe PHP valide
find /var/www/html/api -name "*.php" -exec php -l {} \; 2>&1 | grep -v "No syntax errors"

# Endpoints répondent
curl -s http://localhost/api/music/list.php | jq '.status'
curl -s http://localhost/api/auth/check.php | jq '.logged_in'
```

### Phase CSS (après agents 05-07)
```bash
# Fichiers CSS existent
ls -la /var/www/html/styles/base/
ls -la /var/www/html/styles/components/

# main.css a les imports
grep -c "@import" /var/www/html/styles/main.css

# Pas d'erreurs CSS (lint basique)
# Si csslint installé : csslint /var/www/html/styles/
```

### Phase JavaScript (après agents 08-10)
```bash
# TypeScript compile
npm run typecheck

# Build passe
npm run build

# Pas de console.log oubliés (en production)
grep -r "console.log" /var/www/html/src/ --include="*.ts" | grep -v "// DEBUG" | wc -l
```

### Phase HTML (après agents 11-12)
```bash
# HTML valide (basique)
grep -c "<!DOCTYPE html>" /var/www/html/*.html

# Pas de balises non fermées
grep -E "<(div|section|article|nav|header|main)[^>]*>" /var/www/html/index.html | wc -l
grep -E "</(div|section|article|nav|header|main)>" /var/www/html/index.html | wc -l
# Les deux nombres doivent correspondre

# Lang défini
grep 'lang="fr"' /var/www/html/index.html
```

---

## 📋 Tests Fonctionnels

### Site Public

| Test | Action | Résultat Attendu | ✓ |
|------|--------|------------------|---|
| Chargement | Ouvrir / | Page s'affiche, pas d'erreur console | |
| Intro | Attendre | Vidéo joue, transition vers site | |
| Menu | Clic burger | Menu s'ouvre en overlay | |
| Menu ferme | Clic X ou Escape | Menu se ferme | |
| Navigation | Clic lien menu | Scroll vers section | |
| Radio play | Clic lecture | Audio démarre | |
| Radio pause | Clic pause | Audio s'arrête | |
| Volume | Slider volume | Volume change | |
| Visualizer | Pendant lecture | Animation visible | |
| Timeline | Scroll horizontal | Défilement fluide | |
| Artistes | Section artistes | Infos affichées | |
| Responsive | Resize < 768px | Layout mobile OK | |

### Admin Panel

| Test | Action | Résultat Attendu | ✓ |
|------|--------|------------------|---|
| Accès sans auth | Ouvrir /admin.html | Redirect vers login | |
| Login mauvais mdp | Entrer mauvais mdp | Message erreur | |
| Login bon mdp | Entrer bon mdp | Accès admin | |
| Sidebar | Clic nav | Section change | |
| Liste musique | Aller section musique | Liste s'affiche | |
| Playlists | Aller section playlists | Playlists listées | |
| Créer playlist | Créer nouvelle | Apparaît dans liste | |
| Éditer playlist | Ajouter chanson | Chanson ajoutée | |
| Supprimer | Supprimer playlist | Disparaît de la liste | |
| Logout | Clic déconnexion | Retour login | |

---

## 📊 Rapport de Vérification

Template à remplir après chaque vérification :

```markdown
## Rapport de Vérification

**Date** : YYYY-MM-DD HH:MM
**Agent vérifié** : XX-NOM-AGENT
**Vérificateur** : Agent 13

### Résumé
- ✅ Succès : X/Y tests
- ⚠️ Warnings : X
- ❌ Erreurs : X

### Erreurs Critiques
1. [Description erreur]
   - Fichier : path/to/file
   - Ligne : XX
   - Action requise : [Description]

### Warnings
1. [Description warning]
   - Impact : Faible/Moyen
   - Suggestion : [Fix suggéré]

### Tests Fonctionnels
| Test | Status | Notes |
|------|--------|-------|
| ... | ✅/❌ | ... |

### Validation
- [ ] Peut passer à l'agent suivant
- [ ] Nécessite corrections d'abord
```

---

## 🚨 Critères de Blocage

L'agent suivant NE PEUT PAS démarrer si :

1. **Erreurs TypeScript** : `npm run typecheck` échoue
2. **Erreurs PHP** : Syntax error dans un fichier PHP
3. **Site cassé** : Page blanche ou erreur 500
4. **Console errors** : Erreurs JS rouges dans la console
5. **Fonctionnalité critique cassée** : Radio, menu, ou admin

---

## 🔄 Commandes Utiles

```bash
# Vérification complète en une commande
cd /var/www/html && \
  echo "=== TypeScript ===" && npm run typecheck 2>&1 | tail -5 && \
  echo "=== PHP Syntax ===" && find api -name "*.php" -exec php -l {} \; 2>&1 | grep -v "No syntax" | head -5 && \
  echo "=== Build ===" && npm run build 2>&1 | tail -3

# Test endpoints API
for endpoint in music/list auth/check playlists/list; do
  echo "Testing /api/$endpoint..."
  curl -s "http://localhost/api/$endpoint.php" | jq -r '.status' 2>/dev/null || echo "FAIL"
done

# Vérifier les imports manquants
grep -r "from '@" /var/www/html/src/ --include="*.ts" | grep -v node_modules | while read line; do
  file=$(echo "$line" | cut -d: -f1)
  import=$(echo "$line" | grep -oE "from '@[^']+'" | tr -d "'")
  # Vérifier si le chemin existe
done
```

---

## ✅ Checklist Finale

Cette checklist est pour la validation FINALE avant merge :

- [ ] Tous les agents ont été exécutés
- [ ] Tous les tests fonctionnels passent
- [ ] `npm run typecheck` : 0 erreurs
- [ ] `npm run build` : succès
- [ ] `npm run lint` : 0 erreurs (warnings OK)
- [ ] Lighthouse Performance : > 80
- [ ] Lighthouse Accessibility : > 90
- [ ] Lighthouse Best Practices : > 90
- [ ] Test sur Chrome, Firefox, Safari
- [ ] Test sur mobile (responsive)
- [ ] Backup de l'ancien code fait
- [ ] Documentation mise à jour
- [ ] Commit message clair
