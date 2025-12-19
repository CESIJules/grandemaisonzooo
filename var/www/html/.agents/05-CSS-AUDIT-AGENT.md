# 🎨 AGENT CSS AUDIT - Analyse et Plan de Découpage

## Rôle
Tu es l'agent qui analyse le CSS existant et crée le plan de découpage en fichiers modulaires. Tu ne fais PAS le découpage, tu prépares le travail pour les agents 06 et 07.

## Prérequis
- ✅ Agent 01-INVENTORY terminé (liste des classes CSS)
- ✅ Agent 02-ARCHITECTURE terminé (dossier styles/ créé)

---

## 📋 Tâches

### 1. Analyser le fichier style.css

```bash
# Nombre total de lignes
wc -l /var/www/html/style.css

# Lister les commentaires de section (si présents)
grep -n "/\*.*\*/" /var/www/html/style.css | head -50

# Identifier les media queries
grep -n "@media" /var/www/html/style.css
```

### 2. Identifier les Composants

Parcourir le CSS et identifier chaque composant distinct. Créer une table :

```markdown
| Composant | Lignes (de-à) | Sélecteurs Principaux | Fichier Cible |
|-----------|---------------|----------------------|---------------|
| Reset/Base | 1-30 | *, html, body | base/reset.css |
| Loading Screen | 31-90 | #loadingScreen, .marquee-* | components/loading.css |
| Video Overlay | 91-130 | .video-overlay | components/video-overlay.css |
| Burger Menu | 131-200 | .burger, #menu, .menu-* | components/menu.css |
| Radio Player | 450-650 | #radio, .vinyl-*, .visualizer | components/radio.css |
| Radio Controller | 651-850 | .rc-*, #rcHandle | components/radio-controller.css |
| Timeline | 900-1100 | .timeline-*, #timeline | components/timeline.css |
| Artistes | 1100-1300 | .artiste, .artiste-* | components/artists.css |
| Boutons | dispersé | .btn, .btn-* | components/buttons.css |
| Formulaires | dispersé | input, select, .form-* | components/forms.css |
| Admin Page | 2200-2600 | .admin-*, .sidebar | pages/admin.css |
| Login Page | 2600-2700 | .login-* | pages/login.css |
| Responsive | dispersé | @media queries | layout/responsive.css |
```

### 3. Identifier les Variables CSS à Extraire

Chercher les valeurs répétées :

```bash
# Couleurs fréquentes
grep -oE '#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)' /var/www/html/style.css | sort | uniq -c | sort -rn | head -20

# Fonts fréquentes
grep -oE "font-family:[^;]+" /var/www/html/style.css | sort | uniq -c

# Spacing fréquents
grep -oE '[0-9]+px|[0-9]+rem|[0-9]+em' /var/www/html/style.css | sort | uniq -c | sort -rn | head -20
```

Créer la liste des variables à définir :

```css
/* À mettre dans base/variables.css */
:root {
  /* Colors */
  --color-bg: #050505;
  --color-text: #eee;
  --color-accent: ???;
  --color-danger: ???;
  
  /* Typography */
  --font-primary: 'Space Grotesk', sans-serif;
  --font-display: 'SyneGMZExtraBold', sans-serif;
  
  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 48px;
  
  /* Transitions */
  --transition-fast: 0.2s ease;
  --transition-normal: 0.3s ease;
  --transition-slow: 0.5s ease;
  
  /* Z-index layers */
  --z-base: 1;
  --z-menu: 1000;
  --z-modal: 2000;
  --z-loading: 10000;
}
```

### 4. Identifier les Animations à Extraire

```bash
grep -n "@keyframes" /var/www/html/style.css
```

Liste des animations :
```markdown
| Animation | Lignes | Utilisée par | Fichier Cible |
|-----------|--------|--------------|---------------|
| scrollRight | 80-90 | .marquee-content | base/animations.css |
| ... | ... | ... | ... |
```

### 5. Identifier le Code Mort (Unused CSS)

Comparer avec l'inventaire HTML pour trouver les classes non utilisées :

```bash
# Extraire toutes les classes du CSS
grep -oE '\.[a-zA-Z][a-zA-Z0-9_-]*' /var/www/html/style.css | sort -u > /tmp/css-classes.txt

# Extraire toutes les classes du HTML
grep -oE 'class="[^"]*"' /var/www/html/*.html | grep -oE '[a-zA-Z][a-zA-Z0-9_-]*' | sort -u > /tmp/html-classes.txt

# Trouver les classes CSS non utilisées dans HTML
comm -23 /tmp/css-classes.txt /tmp/html-classes.txt
```

---

## 📄 Output Attendu

Créer le fichier `/var/www/html/.agents/CSS-AUDIT-REPORT.md` avec :

1. **Statistiques générales**
   - Nombre de lignes
   - Nombre de sélecteurs
   - Nombre de media queries
   
2. **Table de mapping** composant → fichier cible

3. **Liste des variables CSS** à définir

4. **Liste des animations** avec leur fichier cible

5. **Liste du code mort** à supprimer

6. **Ordre de migration** recommandé :
   ```
   1. base/variables.css (fondations)
   2. base/reset.css (fondations)
   3. base/typography.css (fondations)
   4. base/animations.css (utilisé partout)
   5. components/buttons.css (utilisé partout)
   6. components/loading.css (simple, bon premier test)
   7. components/menu.css
   8. components/radio.css
   9. ... etc
   ```

---

## ✅ Checklist de Complétion

- [ ] style.css analysé ligne par ligne
- [ ] Tous les composants identifiés
- [ ] Variables CSS listées
- [ ] Animations listées
- [ ] Code mort identifié
- [ ] Ordre de migration défini
- [ ] CSS-AUDIT-REPORT.md créé
- [ ] Commit : "docs: CSS audit report for migration"

---

## 💡 Notes pour les Agents 06 et 07

Ce rapport servira de guide pour :
- **Agent 06 (CSS Components)** : Extraire les composants génériques
- **Agent 07 (CSS Pages)** : Extraire les CSS spécifiques aux pages
