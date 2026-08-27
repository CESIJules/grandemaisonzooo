<?php
header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: SAMEORIGIN');
header('Cache-Control: no-store, no-cache');

if (!defined('ROOM45_ENTRY')) {
    define('ROOM45_ENTRY', true);
}

require_once __DIR__ . '/_rooms_config.php';
$rooms = $ROOMS_INDEX;

// Rend un label numérique en une suite de <img> SVG (un par chiffre)
function renderLabel(string $label): string
{
    $out = '<span class="cell-number">';
    foreach (str_split($label) as $digit) {
        $out .= '<img src="/room45/svg/' . $digit . '.svg" alt="' . $digit . '" draggable="false">';
    }
    $out .= '</span>';
    return $out;
}
?><!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <link rel="icon" type="image/png" href="/room45/symbols/room45.png">
    <title>room45</title>
    <style>
        *,
        *::before,
        *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html,
        body {
            width: 100%;
            min-height: 100%;
            background: #ffffff;
            font-family: 'Courier New', Courier, monospace;
        }

        /* ── Intro overlay ── */
        #intro-overlay {
            position: fixed;
            inset: 0;
            z-index: 200;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            cursor: pointer;
        }

        #intro-overlay.is-hidden {
            display: none;
        }

        #intro-img {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
            opacity: 0;
            transform: scale(1.06);
            transition: none;
            filter: grayscale(1) contrast(1.08);
            pointer-events: none;
            user-select: none;
        }

        #intro-img.is-visible {
            opacity: 1;
            transform: scale(1);
            transition: opacity 1400ms ease, transform 6000ms ease;
        }

        #intro-img.is-leaving {
            opacity: 0;
            transform: scale(0.97);
            transition: opacity 1000ms ease, transform 1000ms ease;
        }

        #intro-overlay::after {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at center,
                transparent 30%,
                rgba(20, 14, 5, 0.45) 100%);
            pointer-events: none;
        }

        /* Film grain canvas */
        #grain {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 100;
            opacity: var(--grain-opacity, 0.50);
            /* ← intensité globale (0 = invisible, 1 = max) */
            mix-blend-mode: var(--grain-blend, multiply);
            /* ← multiply | screen | overlay … */
        }

        /* Vignette */
        body::after {
            content: '';
            position: fixed;
            inset: 0;
            background: radial-gradient(ellipse at center,
                    transparent 30%,
                    rgba(20, 14, 5, 0.38) 100%);
            pointer-events: none;
            z-index: 50;
        }

        /* Banderoles latérales (style ruban) */
        .ribbon {
            --ribbon-w: 16px;
            --main-col-width: min(900px, 94vw);
            --gutter: max(0px, calc((100vw - var(--main-col-width)) / 2));
            --x: calc(var(--gutter) / 2 - var(--ribbon-w) / 2);

            position: fixed;
            top: 0;
            bottom: 0;
            width: var(--ribbon-w);
            z-index: 20;
            pointer-events: none;
            border-radius: 0;
            border: 1px solid #0a0a0a;
            background: #111;
            clip-path: polygon(
                12% 0%, 88% 0%,
                95% 12%, 78% 25%, 92% 38%, 70% 50%, 92% 62%, 78% 75%, 95% 88%, 88% 100%,
                12% 100%, 5% 88%, 22% 75%, 8% 62%, 30% 50%, 8% 38%, 22% 25%, 5% 12%
            );
            box-shadow:
                inset 0 0 0 1px rgba(255, 255, 255, 0.04),
                0 10px 20px rgba(0, 0, 0, 0.22);
            opacity: 0;
            transition: opacity 1600ms ease;
        }

        .ribbon.is-visible {
            opacity: 1;
        }

        /* ── Transition d'entree dans une room ───────────────────────────── */
        #room-enter-transition {
            position: fixed;
            inset: 0;
            z-index: 300;
            pointer-events: none;
            opacity: 0;
            transition: opacity 260ms ease-out;
            overflow: hidden;
        }

        #room-enter-transition .enter-wing {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 50%;
            background: #111;
            transition: transform 820ms cubic-bezier(0.18, 0.9, 0.22, 1);
        }

        #room-enter-transition .enter-wing--left {
            left: 0;
            transform: translateX(-104%);
        }

        #room-enter-transition .enter-wing--right {
            right: 0;
            transform: translateX(104%);
        }

        #room-enter-transition .enter-seam {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 2px;
            transform: translateX(-50%) scaleY(0.08);
            transform-origin: center;
            background: rgba(255, 255, 255, 0.6);
            opacity: 0;
            transition: opacity 320ms ease-out 420ms, transform 420ms ease-out 420ms;
        }

        #room-enter-transition.is-active {
            opacity: 1;
        }

        #room-enter-transition.is-active .enter-wing--left,
        #room-enter-transition.is-active .enter-wing--right {
            transform: translateX(0);
        }

        #room-enter-transition.is-active .enter-seam {
            opacity: 1;
            transform: translateX(-50%) scaleY(1);
        }

        body.is-room-entering .cell {
            pointer-events: none;
        }

        body.is-room-entering .page,
        body.is-room-entering .ribbon {
            filter: blur(1.2px);
            opacity: 0.55;
            transition: opacity 520ms cubic-bezier(0.2, 0.8, 0.2, 1), filter 520ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .cell.is-entering {
            background: #111;
            transition: background 360ms ease-out;
        }

        .cell.is-entering .cell-number img {
            filter: invert(1);
        }

        /* Ne pas inverter les chiffres des portes vignettes (fond blanc) */
        .cell.is-entering .cell-vignette .cell-number img {
            filter: none;
        }

        .ribbon--left {
            left: var(--x);
        }

        .ribbon--right {
            right: var(--x);
        }

        @media (max-width: 1024px) {
            .ribbon {
                display: none;
            }
        }

        /* ── LAYOUT ── */
        .page {
            position: relative;
            z-index: 10;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem 1.5rem;
            gap: 3rem;
            opacity: 0;
            transition: opacity 1600ms ease;
        }

        .page.is-visible {
            opacity: 1;
        }

        /* Grand numéro du haut */
        .hero-number {
            font-size: clamp(6rem, 18vw, 16rem);
            font-weight: 900;
            color: #111;
            line-height: 1;
            letter-spacing: -0.05em;
            user-select: none;
            text-shadow:
                1px 1px 0 rgba(0, 0, 0, 0.14),
                2px 1px 0 rgba(0, 0, 0, 0.07),
                -1px 0 0 rgba(0, 0, 0, 0.04);
        }

        /* ── GRILLE 4 colonnes ── */
        .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 0;
            width: min(900px, 94vw);
            border: 2px solid #111;
        }

        .cell {
            aspect-ratio: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #111;
            cursor: pointer;
            text-decoration: none;
            position: relative;
            overflow: hidden;
            transition: background 0.15s;
            background: #ffffff;
        }

        /* ── SVG digits ── */
        .cell-number {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 18%;
        }

        .cell-number img {
            height: clamp(1.4rem, 5vw, 3.2rem);
            width: auto;
            display: block;
            pointer-events: none;
            user-select: none;
            transition: filter 0.15s;
            margin-right: -1.5em;
        }

        .cell-number img:last-child {
            margin-right: 0;
        }

        /* Le glyphe "2" occupe plus d'espace dans son viewBox que les autres */

        .cell-number img[src$="0.svg"] {
            transform: scale(0.94);
        }

        .cell-number img[src$="2.svg"] {
            transform: scale(0.93);
        }

        .cell-number img[src$="4.svg"] {
            transform: scale(0.93);
        }

        .cell::before {
            content: '';
            position: absolute;
            inset: 0;
            background: repeating-linear-gradient(0deg,
                    transparent,
                    transparent 3px,
                    rgba(0, 0, 0, 0.018) 3px,
                    rgba(0, 0, 0, 0.018) 4px);
            pointer-events: none;
        }

        .cell:hover {
            background: #111;
        }

        .cell:hover .cell-number img {
            filter: invert(1);
        }

        .cell:hover::before {
            opacity: 0;
        }

        /* Encoche de depart: interruption de la bordure exterieure gauche en bas de la case 1 */
        .cell-start-notch {
            overflow: visible;
            border-left: 1px solid #111;
        }

        .cell-start-notch::after {
            content: '';
            position: absolute;
            left: -3px;
            bottom: 12%;
            width: 3px;
            height: 42px;
            background: #ffffff;
            pointer-events: none;
            z-index: 30;
        }

        /* Case inactive (contenu pas encore dispo) */
        .cell.inactive {
            cursor: default;
            pointer-events: none;
        }

        .cell.inactive .cell-number img {
            opacity: 0.2;
        }

        /* Case 45 isolée, centrée sous la grille */
        .cell-solo {
            width: calc(min(900px, 94vw) / 4);
            border: 2px solid #111;
            margin-top: -2px;
        }

        /* ── Vignettes de choix (case a01) ─────────────────── */
        .cell-vignette {
            position: absolute;
            width: 16%;
            aspect-ratio: 3 / 5;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            cursor: pointer;
            z-index: 5;
            user-select: none;
            transition: transform 0.12s, opacity 0.12s;
        }

        .cell-vignette:hover {
            transform: scale(1.08);
        }

        .cell-vignette svg {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
        }

        /* Couleurs de la porte SVG */
        .cell-vignette .door-outline { fill: #111; }
        .cell-vignette .door-body { fill: #f5f5f5; }
        .cell-vignette .door-detail-frame { fill: #111; }
        .cell-vignette .door-detail-panel { fill: #f5f5f5; }
        .cell-vignette .door-knob  { fill: #111; }

        .cell-vignette.is-selected .door-outline { fill: #f5f5f5; }
        .cell-vignette.is-selected .door-body { fill: #111; }
        .cell-vignette.is-selected .door-detail-frame { fill: #f5f5f5; }
        .cell-vignette.is-selected .door-detail-panel { fill: #111; }
        .cell-vignette.is-selected .door-knob  { fill: #f5f5f5; }

        .cell-vignette.is-hidden {
            opacity: 0;
            pointer-events: none;
            transform: scale(0.92);
        }

        .cell-vignette.is-undiscovered {
            opacity: 0;
            pointer-events: none;
            transform: scale(0.92);
        }

        /* Numéro affiché en bas de la porte */
        .cell-vignette .vignette-label {
            position: absolute;
            top: 9%;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0;
            z-index: 2;
        }

        .cell-vignette .vignette-label img {
            height: clamp(0.45rem, 1.5vw, 0.9rem);
            width: auto;
            display: block;
            pointer-events: none;
            margin-right: -0.5em;
        }

        .cell-vignette .vignette-label img:last-child {
            margin-right: 0;
        }

        .cell-vignette.is-selected .vignette-label img {
            filter: invert(1);
        }

        /* Empêche le hover de la cell parent d'interférer */
        .cell:hover .cell-vignette .door-body { fill: #f5f5f5; }
        .cell:hover .cell-vignette.is-selected .door-body { fill: #111; }
            .cell:hover .cell-vignette .vignette-label img { filter: none; }
            .cell:hover .cell-vignette.is-selected .vignette-label img { filter: invert(1); }



        .cell-vignette--tl { top: 5px; left: 5px; }
        .cell-vignette--tr { top: 5px; right: 5px; }
        .cell-vignette--bl { bottom: 5px; left: 5px; }
        .cell-vignette--br { bottom: 5px; right: 5px; }

        /* Porte secrete - invisible jusqu'a deverrouillage */
        .cell-vignette.is-door-secret {
            display: none;
            pointer-events: none;
        }

        /* Porte 17 retournee pour etre a l'endroit ecran inverse */
        .cell-vignette[data-cell="a02"][data-door="17"] {
            transform: rotate(180deg);
        }

        .cell-vignette[data-cell="a02"][data-door="17"]:hover {
            transform: rotate(180deg) scale(1.08);
        }

    </style>
</head>

<body>
    <div id="intro-overlay" role="button" aria-label="Passer l'intro" tabindex="0">
        <img id="intro-img" src="/room45/symbols/room45open.png" alt="" draggable="false">
    </div>

    <div id="room-enter-transition" aria-hidden="true">
        <div class="enter-wing enter-wing--left"></div>
        <div class="enter-wing enter-wing--right"></div>
        <div class="enter-seam"></div>
    </div>

    <div class="ribbon ribbon--left" aria-hidden="true"></div>
    <div class="ribbon ribbon--right" aria-hidden="true"></div>
    <canvas id="grain"></canvas>

    <div class="page">
        <nav class="grid" aria-label="Salles">
            <?php foreach ($rooms as $room): if ($room['id'] === 'a45') continue; ?>
                <?php if ($room['active']): ?>
                    <?php if ($room['id'] === 'a01'): ?>
                        <?php
                        $doorSvg = '<svg viewBox="0 0 30 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'.
                            '<rect class="door-outline" x="0" y="0" width="30" height="50" rx="1"/>'.
                            '<rect class="door-body" x="2" y="2" width="26" height="46" rx="1"/>'.
                            '<rect class="door-detail-frame" x="6" y="7" width="18" height="14" rx="0.5"/>'.
                            '<rect class="door-detail-panel" x="7" y="8" width="16" height="12" rx="0.5"/>'.
                            '<rect class="door-detail-frame" x="6" y="26" width="18" height="16" rx="0.5"/>'.
                            '<rect class="door-detail-panel" x="7" y="27" width="16" height="14" rx="0.5"/>'.
                                '<circle class="door-knob" cx="25" cy="25" r="1.8"/>'.
                            '</svg>';
                        ?>
                        <a class="cell cell-start-notch" href="/room45/a01" aria-label="Salle 1">
                            <?= renderLabel($room['label']) ?>
                            <span class="cell-vignette cell-vignette--tl" data-cell="a01" data-door="20" role="button" tabindex="0" aria-label="Porte 20"><?= $doorSvg ?><span class="vignette-label"><?= renderLabel('20') ?></span></span>
                            <span class="cell-vignette cell-vignette--tr" data-cell="a01" data-door="26" role="button" tabindex="0" aria-label="Porte 26"><?= $doorSvg ?><span class="vignette-label"><?= renderLabel('26') ?></span></span>
                            <span class="cell-vignette cell-vignette--br" data-cell="a01" data-door="41" role="button" tabindex="0" aria-label="Porte 41"><?= $doorSvg ?><span class="vignette-label"><?= renderLabel('41') ?></span></span>
                        </a>
                    <?php elseif ($room['id'] === 'a02'): ?>
                        <a class="cell" href="/room45/a02" aria-label="Salle 2">
                            <?= renderLabel($room['label']) ?>
                            <span class="cell-vignette cell-vignette--tl" data-cell="a02" data-door="40" role="button" tabindex="0" aria-label="Porte 40"><?= $doorSvg ?><span class="vignette-label"><?= renderLabel('40') ?></span></span>
                            <span class="cell-vignette cell-vignette--tr" data-cell="a02" data-door="35" role="button" tabindex="0" aria-label="Porte 35"><?= $doorSvg ?><span class="vignette-label"><?= renderLabel('35') ?></span></span>
                            <span class="cell-vignette cell-vignette--br" data-cell="a02" data-door="2" role="button" tabindex="0" aria-label="Porte 2"><?= $doorSvg ?><span class="vignette-label"><?= renderLabel('2') ?></span></span>
                            <span class="cell-vignette cell-vignette--bl is-door-secret" data-cell="a02" data-door="17" role="button" tabindex="0" aria-label="Porte 17"><?= $doorSvg ?><span class="vignette-label"><?= renderLabel('17') ?></span></span>
                        </a>
                    <?php else: ?>
                        <a class="cell" href="/room45/<?= htmlspecialchars($room['id']) ?>"
                            aria-label="Salle <?= htmlspecialchars($room['label']) ?>">
                            <?= renderLabel($room['label']) ?>
                        </a>
                    <?php endif; ?>
                <?php else: ?>
                    <span class="cell inactive" aria-hidden="true">
                        <?= renderLabel($room['label']) ?>
                    </span>
                <?php endif; ?>
            <?php endforeach; ?>
        </nav>
        <?php
        $last = null;
        foreach ($rooms as $r) { if ($r['id'] === 'a45') { $last = $r; break; } }
        if ($last): ?>
            <?php if ($last['active']): ?>
                <a class="cell cell-solo" href="/room45/<?= htmlspecialchars($last['id']) ?>"
                    aria-label="Salle <?= htmlspecialchars($last['label']) ?>">
                    <?= renderLabel($last['label']) ?>
                </a>
            <?php else: ?>
                <span class="cell cell-solo inactive" aria-hidden="true">
                    <?= renderLabel($last['label']) ?>
                </span>
            <?php endif; ?>
        <?php endif; ?>
    </div>

    <script>
        // ── INTRO ANIMATION ────────────────────────────────────────────────────────
        (function () {
            var overlay = document.getElementById('intro-overlay');
            var img     = document.getElementById('intro-img');
            if (!overlay || !img) return;

            var page    = document.querySelector('.page');
            var ribbons = document.querySelectorAll('.ribbon');

            function revealPage() {
                if (page) page.classList.add('is-visible');
                ribbons.forEach(function (r) { r.classList.add('is-visible'); });
            }

            function dismiss() {
                img.classList.remove('is-visible');
                img.classList.add('is-leaving');
                setTimeout(function () {
                    overlay.classList.add('is-hidden');
                    sessionStorage.setItem('room45_intro_seen', '1');
                    revealPage();
                }, 1050);
            }

            // Skip si déjà vu cette session
            if (sessionStorage.getItem('room45_intro_seen')) {
                overlay.classList.add('is-hidden');
                if (page) { page.style.transition = 'none'; page.classList.add('is-visible'); }
                ribbons.forEach(function (r) { r.style.transition = 'none'; r.classList.add('is-visible'); });
                return;
            }

            // Fade-in de l'image au premier frame
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    img.classList.add('is-visible');
                });
            });

            // Dismiss automatique après 4s
            var autoTimer = setTimeout(dismiss, 4000);

            // Dismiss au clic ou touche
            overlay.addEventListener('click', function () {
                clearTimeout(autoTimer);
                dismiss();
            });
            overlay.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
                    clearTimeout(autoTimer);
                    dismiss();
                }
            });
        })();

        // ── PARAMÈTRES DU GRAIN ─────────────────────────────────────────────────────
        var GRAIN = {
            alpha: 50,    // opacité de chaque pixel de bruit  [0–255]  (+ = + dense)
            animated: true,  // true = grain animé frame par frame | false = grain figé
            fps: 6,    // frames par seconde quand animated = true  (ex: 12, 24, 30, 60)
        };
        // ── CSS : intensité + blend-mode ────────────────────────────────────────────
        //    opacity  → --grain-opacity dans le <style> ci-dessus  (ex: 0.30 à 0.70)
        //    blend    → --grain-blend   dans le <style> ci-dessus  (multiply | screen | overlay)
        // ────────────────────────────────────────────────────────────────────────────
        (function () {
            var canvas = document.getElementById('grain');
            var ctx = canvas.getContext('2d');
            var raf, lastTime = 0;
            var interval = 1000 / GRAIN.fps;

            function resize() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }

            function drawGrain() {
                var w = canvas.width;
                var h = canvas.height;
                var img = ctx.createImageData(w, h);
                var buf = img.data;
                for (var i = 0; i < buf.length; i += 4) {
                    var v = (Math.random() * 255) | 0;
                    buf[i] = v;
                    buf[i + 1] = v;
                    buf[i + 2] = v;
                    buf[i + 3] = GRAIN.alpha;
                }
                ctx.putImageData(img, 0, 0);
            }

            function loop(ts) {
                if (!GRAIN.animated) return;
                if (ts - lastTime >= interval) {
                    lastTime = ts;
                    drawGrain();
                }
                raf = requestAnimationFrame(loop);
            }

            resize();
            drawGrain();
            if (GRAIN.animated) raf = requestAnimationFrame(loop);

            window.addEventListener('resize', function () {
                cancelAnimationFrame(raf);
                resize();
                drawGrain();
                if (GRAIN.animated) raf = requestAnimationFrame(loop);
            });
        })();

        (function () {
            var el = document.querySelector('[data-cell="a02"][data-door="17"]');
            if (!el) return;
            var UNLOCK_KEY = 'room45_secret_a02_17';
            function unlock() {
                el.classList.remove('is-door-secret');
                localStorage.setItem(UNLOCK_KEY, '1');
            }
            if (localStorage.getItem(UNLOCK_KEY)) { unlock(); return; }
            function getAngle() {
                if (screen.orientation && typeof screen.orientation.angle === 'number') {
                    return screen.orientation.angle;
                }
                if (typeof window.orientation === 'number') { return window.orientation; }
                return 0;
            }
            function check() { if (Math.abs(getAngle()) === 180) { unlock(); } }
            check();
            if (screen.orientation) { screen.orientation.addEventListener('change', check); }
            window.addEventListener('orientationchange', check);
        })();

        // ── Transition de navigation vers une room ───────────────────────────
        (function () {
            var transition = document.getElementById('room-enter-transition');
            if (!transition) return;

            var isNavigating = false;

            function shouldAnimate(e, link) {
                if (!link || !link.href) return false;
                if (isNavigating) return false;
                if (e.defaultPrevented || e.button !== 0) return false;
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
                if (link.target && link.target !== '_self') return false;

                var url;
                try {
                    url = new URL(link.href, window.location.href);
                } catch (err) {
                    return false;
                }

                if (url.origin !== window.location.origin) return false;
                return /^\/room45\/a\d{2}\/?$/.test(url.pathname);
            }

            document.addEventListener('click', function (e) {
                var link = e.target.closest('a.cell[href]');
                if (link && isNavigating) { e.preventDefault(); return; }
                if (!shouldAnimate(e, link)) return;

                e.preventDefault();
                isNavigating = true;

                link.classList.add('is-entering');
                document.body.classList.add('is-room-entering');
                transition.classList.add('is-active');

                try {
                    sessionStorage.setItem('room45_room_enter_anim', '1');
                } catch (err) {}

                setTimeout(function () {
                    window.location.assign(link.href);
                }, 760);
            });

            // Réinitialise l'overlay si la page est restaurée depuis le bfcache
            // (retour navigateur après navigation vers une room)
            window.addEventListener('pageshow', function (e) {
                if (!e.persisted) return;
                isNavigating = false;
                transition.classList.remove('is-active');
                document.body.classList.remove('is-room-entering');
                document.querySelectorAll('.cell.is-entering').forEach(function (c) {
                    c.classList.remove('is-entering');
                });
            });
        })();

        // ── Vignettes de porte (cases avec portes) ─────────────────────────────
        (function () {
            // Regroupe les vignettes par data-cell
            var allVignettes = document.querySelectorAll('.cell-vignette[data-cell]');
            if (!allVignettes.length) return;

            var cells = {};
            allVignettes.forEach(function (v) {
                var cell = v.dataset.cell;
                if (!cells[cell]) cells[cell] = [];
                cells[cell].push(v);

                if (!localStorage.getItem('room45_visited_' + cell)) {
                    v.classList.add('is-undiscovered');
                }
            });

            var DOOR_KEY_PREFIX = 'room45_door_sel_';

            function applyVisibility(cellId, selectedDoor, save) {
                if (save !== false) {
                    try {
                        if (selectedDoor) {
                            localStorage.setItem(DOOR_KEY_PREFIX + cellId, selectedDoor);
                        } else {
                            localStorage.removeItem(DOOR_KEY_PREFIX + cellId);
                        }
                    } catch (e) {}
                }
                (cells[cellId] || []).forEach(function (item) {
                    if (item.classList.contains('is-undiscovered')) {
                        item.classList.remove('is-selected', 'is-hidden');
                        return;
                    }
                    var isSelected = item.dataset.door === selectedDoor;
                    item.classList.toggle('is-selected', !!selectedDoor && isSelected);
                    item.classList.toggle('is-hidden', !!selectedDoor && !isSelected);
                });
            }

            // Restaurer la sélection sauvegardée pour chaque cellule
            Object.keys(cells).forEach(function (cellId) {
                try {
                    var saved = localStorage.getItem(DOOR_KEY_PREFIX + cellId);
                    if (saved) applyVisibility(cellId, saved, false);
                } catch (e) {}
            });

            Object.keys(cells).forEach(function (cellId) {
                cells[cellId].forEach(function (v) {
                    v.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (v.classList.contains('is-selected')) {
                            applyVisibility(cellId, '');
                        } else {
                            applyVisibility(cellId, v.dataset.door);
                        }
                    });
                    v.addEventListener('keydown', function (e) {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            v.click();
                        }
                    });
                });
            });
        })();
    </script>
</body>

</html>