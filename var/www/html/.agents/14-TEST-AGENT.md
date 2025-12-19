# 🧪 AGENT TEST - Tests Fonctionnels Finaux

## Rôle
Tu es l'agent qui exécute les tests finaux complets après la migration. Tu valides que TOUT fonctionne comme avant (ou mieux).

## Prérequis
- ✅ TOUS les autres agents terminés
- ✅ Agent 13-VERIFICATION a validé le code

---

## 📋 Plan de Test

### Environnement de Test
```bash
# 1. Build production
cd /var/www/html
npm run build

# 2. Servir les fichiers buildés
npm run preview
# ou
php -S localhost:8080

# 3. Ouvrir dans navigateur
# http://localhost:4173 (Vite preview)
# http://localhost:8080 (PHP)
```

---

## 🧪 Tests Site Public

### T1 - Chargement Initial
| ID | Test | Étapes | Attendu | Status |
|----|------|--------|---------|--------|
| T1.1 | Page charge | Ouvrir http://localhost | Page s'affiche | ⬜ |
| T1.2 | Pas d'erreur console | F12 > Console | Aucune erreur rouge | ⬜ |
| T1.3 | Loading screen | Observer | Animation marquee | ⬜ |
| T1.4 | Vidéo intro | Attendre | Vidéo joue | ⬜ |
| T1.5 | Transition | Fin vidéo | Fade out, UI visible | ⬜ |

### T2 - Navigation
| ID | Test | Étapes | Attendu | Status |
|----|------|--------|---------|--------|
| T2.1 | Burger visible | Observer | Bouton ☰ visible | ⬜ |
| T2.2 | Menu ouvre | Clic burger | Overlay menu | ⬜ |
| T2.3 | Animation lignes | Hover items | Lignes bougent | ⬜ |
| T2.4 | Navigation | Clic "Radio" | Scroll vers radio | ⬜ |
| T2.5 | Menu ferme auto | Après clic lien | Menu fermé | ⬜ |
| T2.6 | Escape ferme | Ouvrir + Escape | Menu fermé | ⬜ |
| T2.7 | Scroll sections | Molette | Snap entre sections | ⬜ |
| T2.8 | Flèche scroll | Observer | Flèche visible/cachée | ⬜ |

### T3 - Radio
| ID | Test | Étapes | Attendu | Status |
|----|------|--------|---------|--------|
| T3.1 | Section radio | Naviguer | Vinyle visible | ⬜ |
| T3.2 | Bouton play | Clic play | Audio démarre | ⬜ |
| T3.3 | Vinyle tourne | Pendant lecture | Animation rotation | ⬜ |
| T3.4 | Visualizer | Pendant lecture | Barres animées | ⬜ |
| T3.5 | Titre affiché | Pendant lecture | Titre chanson | ⬜ |
| T3.6 | Pause | Clic pause | Audio s'arrête | ⬜ |
| T3.7 | Volume | Slider | Volume change | ⬜ |
| T3.8 | Mute | Clic icône | Son coupé | ⬜ |

### T4 - Radio Controller (RC)
| ID | Test | Étapes | Attendu | Status |
|----|------|--------|---------|--------|
| T4.1 | RC visible | Scroll hors radio | Controller flottant | ⬜ |
| T4.2 | RC dépliable | Clic toggle | S'ouvre/ferme | ⬜ |
| T4.3 | Play/Pause RC | Clic bouton | Contrôle audio | ⬜ |
| T4.4 | Volume RC | Contrôle circulaire | Volume change | ⬜ |
| T4.5 | Progress bar | Pendant lecture | Progression | ⬜ |
| T4.6 | Temps affiché | Observer | Elapsed/Remaining | ⬜ |
| T4.7 | PiP mode | Clic PiP | Mini lecteur | ⬜ |

### T5 - Artistes
| ID | Test | Étapes | Attendu | Status |
|----|------|--------|---------|--------|
| T5.1 | Sections artistes | Scroll | Sections chargées | ⬜ |
| T5.2 | Image artiste | Observer | Image visible | ⬜ |
| T5.3 | Info artiste | Observer | Nom, lieu, liens | ⬜ |
| T5.4 | Boutons action | Observer | Écouter, Regarder, Timeline | ⬜ |
| T5.5 | Liens sociaux | Observer | Instagram, etc. | ⬜ |
| T5.6 | Alternance layout | Observer | Image gauche/droite | ⬜ |
| T5.7 | Glitch effect | Hover titre | Effet glitch | ⬜ |

### T6 - Timeline
| ID | Test | Étapes | Attendu | Status |
|----|------|--------|---------|--------|
| T6.1 | Section timeline | Naviguer | Timeline visible | ⬜ |
| T6.2 | Posts chargés | Observer | Cards posts | ⬜ |
| T6.3 | Scroll horizontal | Drag ou molette | Défilement | ⬜ |
| T6.4 | Filtre artiste | Depuis artiste | Posts filtrés | ⬜ |
| T6.5 | Animation hover | Hover card | Effet hover | ⬜ |

### T7 - Responsive
| ID | Test | Étapes | Attendu | Status |
|----|------|--------|---------|--------|
| T7.1 | Mobile 375px | Resize | Layout adapté | ⬜ |
| T7.2 | Tablet 768px | Resize | Layout adapté | ⬜ |
| T7.3 | Desktop 1920px | Resize | Layout adapté | ⬜ |
| T7.4 | Menu mobile | Mobile + burger | Menu fullscreen | ⬜ |
| T7.5 | Radio mobile | Mobile | Contrôles adaptés | ⬜ |
| T7.6 | Touch events | Mobile | Swipe fonctionne | ⬜ |

---

## 🧪 Tests Admin Panel

### A1 - Authentification
| ID | Test | Étapes | Attendu | Status |
|----|------|--------|---------|--------|
| A1.1 | Accès protégé | /admin.html non connecté | Redirect login | ⬜ |
| A1.2 | Page login | Observer | Formulaire | ⬜ |
| A1.3 | Mauvais mdp | Soumettre | Message erreur | ⬜ |
| A1.4 | Bon mdp | Soumettre | Accès admin | ⬜ |
| A1.5 | Session persist | Refresh | Reste connecté | ⬜ |
| A1.6 | Logout | Clic déconnexion | Retour login | ⬜ |

### A2 - Navigation Admin
| ID | Test | Étapes | Attendu | Status |
|----|------|--------|---------|--------|
| A2.1 | Sidebar visible | Observer | Navigation gauche | ⬜ |
| A2.2 | Section par défaut | Observer | Première section | ⬜ |
| A2.3 | Changement section | Clic nav | Section change | ⬜ |
| A2.4 | Active state | Observer | Item actif highlight | ⬜ |

### A3 - Gestion Musique
| ID | Test | Étapes | Attendu | Status |
|----|------|--------|---------|--------|
| A3.1 | Liste musique | Section musique | Fichiers listés | ⬜ |
| A3.2 | Recherche | Taper dans search | Filtrage | ⬜ |
| A3.3 | Métadonnées | Expandre item | BPM, Key, etc. | ⬜ |
| A3.4 | Download YT | URL + submit | Téléchargement | ⬜ |
| A3.5 | Renommer | Action renommer | Nouveau nom | ⬜ |
| A3.6 | Supprimer | Action supprimer | Fichier supprimé | ⬜ |
| A3.7 | Skip song | Bouton skip | Chanson suivante | ⬜ |

### A4 - Gestion Playlists
| ID | Test | Étapes | Attendu | Status |
|----|------|--------|---------|--------|
| A4.1 | Liste playlists | Section playlists | Playlists listées | ⬜ |
| A4.2 | Créer playlist | Nom + créer | Nouvelle playlist | ⬜ |
| A4.3 | Éditer playlist | Clic éditer | Modal édition | ⬜ |
| A4.4 | Ajouter chanson | Drag ou clic | Chanson ajoutée | ⬜ |
| A4.5 | Suggestions | Observer | Suggestions harmoniques | ⬜ |
| A4.6 | Réordonner | Drag & drop | Ordre changé | ⬜ |
| A4.7 | Retirer chanson | Clic X | Chanson retirée | ⬜ |
| A4.8 | Activer playlist | Clic activer | Playlist active | ⬜ |
| A4.9 | Supprimer playlist | Action supprimer | Playlist supprimée | ⬜ |

### A5 - Gestion Artistes
| ID | Test | Étapes | Attendu | Status |
|----|------|--------|---------|--------|
| A5.1 | Liste artistes | Section artistes | Artistes listés | ⬜ |
| A5.2 | Éditer artiste | Clic éditer | Formulaire | ⬜ |
| A5.3 | Modifier info | Changer + save | Info mise à jour | ⬜ |
| A5.4 | Upload image | Sélectionner fichier | Image uploadée | ⬜ |
| A5.5 | Nouvel artiste | Ajouter | Artiste créé | ⬜ |

### A6 - Gestion Timeline
| ID | Test | Étapes | Attendu | Status |
|----|------|--------|---------|--------|
| A6.1 | Liste posts | Section timeline | Posts listés | ⬜ |
| A6.2 | Filtrer par artiste | Select artiste | Posts filtrés | ⬜ |
| A6.3 | Nouveau post | Formulaire + submit | Post créé | ⬜ |
| A6.4 | Éditer post | Clic éditer | Formulaire pré-rempli | ⬜ |
| A6.5 | Supprimer post | Action supprimer | Post supprimé | ⬜ |
| A6.6 | Upload média | Ajouter image | Image uploadée | ⬜ |

---

## 🧪 Tests Performance

```bash
# Lighthouse CLI
npx lighthouse http://localhost --output=json --output-path=./lighthouse-report.json

# Extraire scores
cat lighthouse-report.json | jq '.categories | to_entries[] | "\(.key): \(.value.score * 100)%"'
```

| Métrique | Objectif | Résultat | Status |
|----------|----------|----------|--------|
| Performance | > 80 | | ⬜ |
| Accessibility | > 90 | | ⬜ |
| Best Practices | > 90 | | ⬜ |
| SEO | > 80 | | ⬜ |
| First Contentful Paint | < 2s | | ⬜ |
| Largest Contentful Paint | < 3s | | ⬜ |
| Time to Interactive | < 4s | | ⬜ |
| Total Bundle Size | < 500KB | | ⬜ |

---

## 🧪 Tests Cross-Browser

| Navigateur | Version | Site Public | Admin | Status |
|------------|---------|-------------|-------|--------|
| Chrome | Latest | ⬜ | ⬜ | |
| Firefox | Latest | ⬜ | ⬜ | |
| Safari | Latest | ⬜ | ⬜ | |
| Edge | Latest | ⬜ | ⬜ | |
| Chrome Mobile | Latest | ⬜ | ⬜ | |
| Safari iOS | Latest | ⬜ | ⬜ | |

---

## 📊 Rapport de Test Final

```markdown
# Rapport de Test Final

**Date** : YYYY-MM-DD
**Version** : 2.0.0
**Testeur** : Agent 14

## Résumé Exécutif
- Tests exécutés : XX
- Succès : XX (XX%)
- Échecs : XX
- Bloquants : XX

## Tests Site Public
- T1 Chargement : X/5 ✅
- T2 Navigation : X/8 ✅
- T3 Radio : X/8 ✅
- T4 Radio Controller : X/7 ✅
- T5 Artistes : X/7 ✅
- T6 Timeline : X/5 ✅
- T7 Responsive : X/6 ✅

## Tests Admin
- A1 Auth : X/6 ✅
- A2 Navigation : X/4 ✅
- A3 Musique : X/7 ✅
- A4 Playlists : X/9 ✅
- A5 Artistes : X/5 ✅
- A6 Timeline : X/6 ✅

## Performance
- Lighthouse Performance : XX%
- Lighthouse A11Y : XX%
- Bundle Size : XXX KB

## Bugs Trouvés
1. [BUG-001] Description
   - Sévérité : Critique/Majeur/Mineur
   - Étapes de reproduction
   - Screenshot si applicable

## Recommandations
1. ...

## Conclusion
[ ] ✅ Prêt pour production
[ ] ⚠️ Corrections mineures nécessaires
[ ] ❌ Corrections majeures nécessaires
```

---

## ✅ Checklist de Validation Finale

- [ ] TOUS les tests T1-T7 passent
- [ ] TOUS les tests A1-A6 passent
- [ ] Performance Lighthouse > 80%
- [ ] Accessibility Lighthouse > 90%
- [ ] Testé sur Chrome, Firefox, Safari
- [ ] Testé sur mobile
- [ ] Aucun bug bloquant
- [ ] Rapport de test complété
- [ ] **PRÊT POUR PRODUCTION** ✅
