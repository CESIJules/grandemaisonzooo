<?php
// ─────────────────────────────────────────────────────────────────────────────
// _room.php — Template partagé pour toutes les salles
// Inclus par a01.php, a02.php… — jamais servi directement
// ─────────────────────────────────────────────────────────────────────────────
if (!defined('ROOM45_ENTRY')) {
    http_response_code(403);
    exit;
}

define('ROOM45_DATA_ENTRY', true);
require_once __DIR__ . '/_data.php';
require_once __DIR__ . '/_rooms_config.php';

// ── Valider l'ID de salle ────────────────────────────────────────────────────
if (!isset($ROOM_ID) || !preg_match('/^a\d{2}$/', $ROOM_ID) || !array_key_exists($ROOM_ID, $ROOMS_DATA)) {
    http_response_code(404);
    exit;
}

$room = $ROOMS_DATA[$ROOM_ID];

// Bloque l'acces direct URL aux salles desactivees.
if (!room45_is_active($ROOM_ID)) {
    http_response_code(404);
    exit;
}

function renderRoomNumber(string $label): string
{
    $out = '<span class="room-number" aria-label="Salle ' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '">';
    foreach (str_split($label) as $digit) {
        if ($digit < '0' || $digit > '9') {
            continue;
        }
        $out .= '<img src="/room45/svg/' . $digit . '.svg" alt="" draggable="false">';
    }
    $out .= '</span>';
    return $out;
}

// ── Session & CSRF ───────────────────────────────────────────────────────────
session_name('room45_sess');
session_start();

if (empty($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

// Rate-limiting : max 10 tentatives par room + par session avant soft-lock
$attempt_key = 'attempts_' . $ROOM_ID;
if (!isset($_SESSION[$attempt_key])) {
    $_SESSION[$attempt_key] = 0;
}
$locked = $_SESSION[$attempt_key] >= 100;

// ── Traitement du POST ───────────────────────────────────────────────────────
$result = null; // 'correct' | 'wrong' | 'locked'
$secret_text = null;
$secret_image = null;
$is_void = ($room['type'] ?? '') === 'void';

if (!$is_void && $_SERVER['REQUEST_METHOD'] === 'POST' && !$locked) {
    $posted_csrf = $_POST['_t'] ?? '';
    $user_answer = trim($_POST['answer'] ?? '');

    // CSRF check
    if (!hash_equals($_SESSION['csrf_token'], $posted_csrf)) {
        http_response_code(403);
        exit;
    }

    // Comparer avec le hash — normalise : minuscules, sans espaces en trop
    $normalized = strtolower($user_answer);
    $submitted_hash = hash('sha256', $normalized);

    if (hash_equals($room['answer_hash'], $submitted_hash)) {
        $result = 'correct';
        $secret_text = $room['secret'];
        $secret_image = !empty($room['secret_image']) ? (string) $room['secret_image'] : null;
    } else {
        $_SESSION[$attempt_key]++;
        $result = 'wrong';
    }

    // Regénère le CSRF après chaque POST pour éviter le replay
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));

} elseif (!$is_void && $locked) {
    $result = 'locked';
}

// Headers anti-référencement / anti-cache
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store, no-cache');
header('X-Frame-Options: SAMEORIGIN');
?><!DOCTYPE html>
<html lang="fr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <link rel="icon" type="image/png" href="/room45/symbols/room45.png">
    <title>a0<?= htmlspecialchars($room['number']) ?></title>
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
            color: #111;
        }

        html {
            scrollbar-gutter: stable;
        }

        body {
            overflow-y: scroll;
        }

        /* ── Réouverture des portes à l'arrivée dans une room ───────────────── */
        #room-open-transition {
            position: fixed;
            inset: 0;
            z-index: 300;
            pointer-events: none;
            overflow: hidden;
            opacity: 0;
            visibility: hidden;
            transition: opacity 220ms ease-out, visibility 0s linear 220ms;
        }

        #room-open-transition .open-wing {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 50%;
            background: #111;
            transition: transform 980ms cubic-bezier(0.16, 0.86, 0.24, 1);
        }

        #room-open-transition .open-wing--left {
            left: 0;
            transform: translateX(0);
        }

        #room-open-transition .open-wing--right {
            right: 0;
            transform: translateX(0);
        }

        #room-open-transition .open-seam {
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            width: 2px;
            transform: translateX(-50%) scaleY(1);
            transform-origin: center;
            background: rgba(255, 255, 255, 0.62);
            opacity: 1;
            transition: opacity 360ms ease-out, transform 460ms ease-out;
        }

        body.is-room-opening #room-open-transition {
            opacity: 1;
            visibility: visible;
            transition: opacity 140ms linear;
        }

        body.is-room-opening.is-room-ready #room-open-transition .open-wing--left {
            transform: translateX(-104%);
        }

        body.is-room-opening.is-room-ready #room-open-transition .open-wing--right {
            transform: translateX(104%);
        }

        body.is-room-opening.is-room-ready #room-open-transition .open-seam {
            opacity: 0;
            transform: translateX(-50%) scaleY(0.18);
        }

        body.is-room-opened #room-open-transition {
            opacity: 0;
            visibility: hidden;
            transition: none;
        }

        body.is-room-opened #room-open-transition .open-wing--left {
            transform: translateX(-104%);
            transition: none;
        }

        body.is-room-opened #room-open-transition .open-wing--right {
            transform: translateX(104%);
            transition: none;
        }

        body.is-room-opened #room-open-transition .open-seam {
            opacity: 0;
            transform: translateX(-50%) scaleY(0.18);
            transition: none;
        }

        /* ── Film grain ─────────────────────────────────────────────── */
        #grain {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 100;
            opacity: 0.50;
            mix-blend-mode: multiply;
        }

        /* ── Vignette ───────────────────────────────────────────────── */
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
            --main-col-width: min(680px, calc(100vw - 3rem));
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
            transition: opacity 900ms cubic-bezier(0.2, 0.84, 0.22, 1);
        }

        .ribbon--left {
            left: var(--x);
        }

        .ribbon--right {
            right: var(--x);
        }

        @media (max-width: 900px) {
            .ribbon {
                display: none;
            }
        }

        /* ── Layout ─────────────────────────────────────────────────── */
        .page {
            position: relative;
            z-index: 10;
            max-width: 680px;
            margin: 0 auto;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 1.2rem 1.5rem 4rem;
            gap: 1.2rem;
            opacity: 0;
            transform: translateY(16px) scale(0.988);
            transition: opacity 820ms ease-out, transform 1200ms cubic-bezier(0.16, 0.84, 0.24, 1);
        }

        body.is-room-ready .page {
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        body.is-room-ready .ribbon {
            opacity: 1;
        }

        /* ── Header ─────────────────────────────────────────────────── */
        .header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: -0.8rem;
        }

        .header-audio {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 0.9rem;
            transform: translateY(40px);
        }

        .room-number {
            display: flex;
            align-items: center;
            line-height: 1;
            user-select: none;
        }

        .room-number img {
            height: clamp(4rem, 14vw, 9rem);
            width: auto;
            display: block;
            pointer-events: none;
            margin-right: -1.5em;
        }

        .room-number {
            margin-right: 0;
            margin-bottom: 0;
        }

        .room-number img:last-child {
            margin-left: -40px;
        }

        .room-number img[src$="0.svg"] {
            transform: scale(0.94);
        }

        .room-number img[src$="2.svg"] {
            transform: scale(0.93);
        }

        .room-number img[src$="4.svg"] {
            transform: scale(0.93);
        }

        .back-link {
            font-size: 0.78rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: rgba(17, 17, 17, 0.45);
            text-decoration: none;
            border-bottom: 1px solid rgba(17, 17, 17, 0.2);
            padding-bottom: 1px;
            transition: color 0.15s, border-color 0.15s;
            align-self: center;
            margin-bottom: 0;
            transform: translateY(40px);
        }

        .back-link:hover {
            color: #111;
            border-color: #111;
        }

        /* ── Diviseur ───────────────────────────────────────────────── */
        .divider {
            border: none;
            border-top: 1px solid rgba(17, 17, 17, 0.22);
            width: 100%;
            opacity: 1;
            transition: opacity 380ms ease;
        }

        .divider.is-fading-out {
            opacity: 0;
        }

        /* ── Contenu de la salle ────────────────────────────────────── */
        .room-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        .room-image {
            width: 100%;
            height: auto;
            object-fit: contain;
            filter: grayscale(1) contrast(1.1);
            image-rendering: auto;
            border: 1px solid rgba(17, 17, 17, 0.15);
            opacity: 1;
            transform: translateY(0);
            transition: opacity 1200ms ease, transform 1200ms ease;
        }

        .room-image.is-fading-out {
            opacity: 0;
            transform: translateY(-8px);
        }

        .room-media {
            position: relative;
            width: 100%;
        }

        .audio-player {
            --size: 76px;
            position: relative;
            width: var(--size);
            height: var(--size);
            border: none;
            background: transparent;
            cursor: pointer;
            padding: 0;
            z-index: 2;
            transform: translateY(-4px);
        }

        .audio-player-ring {
            width: 100%;
            height: 100%;
            display: block;
            transform: rotate(-90deg);
        }

        .audio-player-ring .ring-track {
            fill: rgba(255, 255, 255, 0.82);
            stroke: rgba(17, 17, 17, 0.22);
            stroke-width: 2;
        }

        .audio-player-ring .ring-progress {
            fill: none;
            stroke: #111;
            stroke-width: 3;
            stroke-linecap: round;
            transition: stroke-dashoffset 0.09s linear;
        }

        .audio-icon {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Courier New', Courier, monospace;
            font-size: 1rem;
            font-weight: 700;
            color: #111;
            letter-spacing: -0.02em;
            pointer-events: none;
        }

        .audio-player:focus-visible {
            outline: 2px solid #111;
            outline-offset: 2px;
            border-radius: 999px;
        }

        .audio-volume-wrap {
            display: flex;
            align-items: center;
            gap: 0.45rem;
            margin-bottom: 0;
        }

        .audio-volume-label {
            font-size: 0.68rem;
            letter-spacing: 0.12em;
            color: rgba(17, 17, 17, 0.6);
            user-select: none;
        }

        .audio-volume {
            width: 92px;
            accent-color: #111;
            cursor: pointer;
        }

        @media (max-width: 580px) {
            .header {
                align-items: center;
                gap: 0.8rem;
            }

            .header-audio {
                gap: 0.55rem;
                transform: translateY(24px);
            }

            .audio-player {
                --size: 64px;
            }

            .audio-volume {
                width: 70px;
            }
        }

        /* Texte énigme */
        .clue-text {
            font-size: clamp(0.95rem, 2.2vw, 1.15rem);
            line-height: 1.5;
            letter-spacing: 0.01em;
            color: #222;
        }

        #tw {
            white-space: pre-line;
        }

        /* ── Formulaire réponse ─────────────────────────────────────── */
        .answer-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            margin-top: 0.5rem;
            opacity: 1;
            transition: opacity 520ms ease;
        }

        .answer-form.is-fading-out {
            opacity: 0;
            pointer-events: none;
        }

        .input-row {
            display: flex;
            gap: 0;
            border: 2px solid #111;
        }

        .answer-input {
            flex: 1;
            padding: 0.75rem 1rem;
            font-family: 'Courier New', Courier, monospace;
            font-size: 1rem;
            background: #ffffff;
            color: #111;
            border: none;
            outline: none;
        }

        .answer-input::placeholder {
            color: rgba(17, 17, 17, 0.35);
        }

        .submit-btn {
            padding: 0.75rem 1.4rem;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.85rem;
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            background: #111;
            color: #ffffff;
            border: none;
            cursor: pointer;
            transition: background 0.15s, color 0.15s;
        }

        .submit-btn:hover {
            background: #ffffff;
            color: #111;
            box-shadow: inset 0 0 0 2px #111;
        }

        .submit-btn:disabled {
            opacity: 0.35;
            cursor: not-allowed;
        }

        /* ── Shake animation ──────────────────────────────────────────── */
        @keyframes shake {
            0%   { transform: translateX(0); }
            20%  { transform: translateX(-6px); }
            40%  { transform: translateX(6px); }
            60%  { transform: translateX(-4px); }
            80%  { transform: translateX(4px); }
            100% { transform: translateX(0); }
        }

        .input-row.shake {
            animation: shake 0.35s ease;
        }

        /* ── Locked ─────────────────────────────────────────────────────── */
        .msg.locked {
            font-size: 0.85rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            padding: 0.6rem 0;
            border-top: 1px solid rgba(17, 17, 17, 0.18);
            color: rgba(17, 17, 17, 0.35);
        }

        /* ── Secret ─────────────────────────────────────────────────────── */
        .secret-reveal {
            font-size: clamp(0.95rem, 2vw, 1.1rem);
            line-height: 1.75;
            letter-spacing: 0.015em;
            color: #111;
            padding: 1.2rem;
            border: 1px solid #111;
            background: rgba(17, 17, 17, 0.04);
            word-break: break-word;
        }

        .secret-image {
            width: auto;
            max-width: 160px;
            max-height: 160px;
            object-fit: contain;
            margin-top: 1.4rem;
            filter: grayscale(1) contrast(1.05);
            mix-blend-mode: multiply;
            opacity: 0;
            transform: none;
            transition: opacity 2400ms ease;
            display: none;
        }

        .secret-image.is-large {
            max-width: 480px;
            max-height: 480px;
        }

        .secret-image.is-mounted {
            display: block;
            visibility: hidden;
        }

        .secret-image.is-visible {
            display: block;
            visibility: visible;
            opacity: 1;
            transform: none;
        }

        /* ── Secret centré ──────────────────────────────────────────── */
        .room-content.is-revealed {
            justify-content: center;
            align-items: center;
            text-align: center;
            min-height: 60vh;
        }

        /* ── Room type void : contenu centré verticalement ──────── */
        .room-content.is-void {
            justify-content: center;
            flex: 1;
        }

        .room-content.is-void .room-media {
            margin-top: 1.2rem;
        }

        .room-content.is-void .clue {
            margin-top: 3rem;
            margin-bottom: auto;
        }

        /* ── Bouton de téléchargement du son ───────────────────── */
        .audio-download {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            border: 1px solid rgba(17,17,17,0.35);
            background: transparent;
            cursor: pointer;
            transition: background 0.15s, border-color 0.15s;
            flex-shrink: 0;
        }

        .audio-download svg {
            width: 12px;
            height: 12px;
            fill: #111;
            display: block;
            transition: fill 0.15s;
        }

        .audio-download:hover {
            background: #111;
            border-color: #111;
        }

        .audio-download:hover svg {
            fill: #ffffff;
        }

        .audio-download:focus-visible {
            outline: 2px solid #111;
            outline-offset: 2px;
        }
    </style>
</head>

<body>
    <div id="room-open-transition" aria-hidden="true">
        <div class="open-wing open-wing--left"></div>
        <div class="open-wing open-wing--right"></div>
        <div class="open-seam"></div>
    </div>

    <div class="ribbon ribbon--left" aria-hidden="true"></div>
    <div class="ribbon ribbon--right" aria-hidden="true"></div>
    <canvas id="grain"></canvas>

    <div class="page">

        <div class="header">
            <?= renderRoomNumber($room['number']) ?>
            <a class="back-link" href="/room45/">&larr; retour</a>
            <div class="header-audio">
                <?php if (!empty($room['sound'])): ?>
                    <button class="audio-player" type="button" aria-label="Lire ou mettre en pause l'audio" data-audio-toggle>
                        <svg class="audio-player-ring" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
                            <circle class="ring-track" cx="28" cy="28" r="22"></circle>
                            <circle class="ring-progress" data-audio-progress cx="28" cy="28" r="22"></circle>
                        </svg>
                        <span class="audio-icon" data-audio-icon>&gt;</span>
                    </button>
                    <div class="audio-volume-wrap">
                        <label class="audio-volume-label" for="room-audio-volume">VOL</label>
                        <input class="audio-volume" id="room-audio-volume" type="range" min="0" max="1" step="0.01" value="0.1" data-audio-volume>
                    </div>
                    <audio preload="metadata" data-room-audio src="<?= htmlspecialchars($room['sound']) ?>"></audio>
                    <a class="audio-download" href="<?= htmlspecialchars($room['sound']) ?>" download aria-label="Télécharger le son">
                        <svg viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <rect x="4" y="0" width="2" height="5.5"/>
                            <polygon points="2,5 8,5 5,8.5"/>
                            <rect x="1" y="9" width="8" height="1"/>
                        </svg>
                    </a>
                <?php endif; ?>
            </div>
        </div>

        <hr class="divider">

        <div class="room-content<?= $is_void ? ' is-void' : '' ?>">

            <?php if ($room['image']): ?>
                <div class="room-media">
                    <img class="room-image" src="<?= htmlspecialchars($room['image']) ?>" alt="" draggable="false">
                </div>
            <?php endif; ?>

            <div class="clue">
                <?= $room['content'] /* HTML de confiance, défini côté serveur */ ?>
            </div>

            <?php if (!$is_void): ?>
            <hr class="divider">

            <?php if ($result === 'correct'): ?>
                <script>var ROOM_SECRET = <?= json_encode($secret_text, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
                <script>var ROOM_SECRET_IMAGE = <?= json_encode($secret_image, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;</script>
            <?php elseif ($result === 'locked'): ?>

                <p class="msg locked">Trop de tentatives. Actualise la page pour réessayer.</p>

            <?php endif; ?>

            <?php if ($result !== 'locked'): ?>

                <form class="answer-form" method="POST" action="" autocomplete="off">
                    <input type="hidden" name="_t" value="<?= htmlspecialchars($_SESSION['csrf_token']) ?>">

                    <div class="input-row"<?= $result === 'wrong' ? ' data-wrong="1"' : '' ?>>
                        <input class="answer-input" type="text"
                            name="answer" placeholder="<?= htmlspecialchars($room['placeholder']) ?>"
                            inputmode="<?= $room['answer_type'] === 'number' ? 'numeric' : 'text' ?>" maxlength="120"<?= $result === 'correct' ? ' value="' . htmlspecialchars($_POST['answer'] ?? '', ENT_QUOTES, 'UTF-8') . '" readonly aria-readonly="true"' : ' required autofocus' ?>>
                        <button class="submit-btn" type="submit"<?= $result === 'correct' ? ' disabled' : '' ?>>→</button>
                    </div>

                </form>

            <?php endif; ?>

            <?php if ($result === 'correct' && !empty($secret_image)): ?>
                <img class="secret-image<?= !empty($room['secret_image_large']) ? ' is-large' : '' ?>" src="<?= htmlspecialchars($secret_image) ?>" alt="" draggable="false">
            <?php endif; ?>
            <?php endif; // !$is_void ?>

        </div><!-- /room-content -->

    </div><!-- /page -->

    <script>
        try {
            localStorage.setItem('room45_visited_<?= htmlspecialchars($ROOM_ID, ENT_QUOTES, 'UTF-8') ?>', '1');
        } catch (e) {}

        (function () {
            var fromGrid = false;
            var body = document.body;
            try {
                fromGrid = sessionStorage.getItem('room45_room_enter_anim') === '1';
                if (fromGrid) {
                    sessionStorage.removeItem('room45_room_enter_anim');
                }
            } catch (e) {}

            if (fromGrid) {
                body.classList.add('is-room-opening');
            }

            var delay = fromGrid ? 180 : 40;
            setTimeout(function () {
                requestAnimationFrame(function () {
                    body.classList.add('is-room-ready');
                    if (fromGrid) {
                        setTimeout(function () {
                            body.classList.add('is-room-opened');
                            body.classList.remove('is-room-opening');
                        }, 1280);
                    }
                });
            }, delay);
        })();

        var GRAIN = {
            alpha: 50,
            animated: true,
            fps: 6,
        };

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

        // Shake on wrong answer
        (function () {
            var row = document.querySelector('.input-row[data-wrong]');
            if (!row) return;
            row.classList.add('shake');
            row.addEventListener('animationend', function () {
                row.classList.remove('shake');
            }, { once: true });
        })();

        // Audio player with circular progress
        (function () {
            var audio = document.querySelector('[data-room-audio]');
            var toggle = document.querySelector('[data-audio-toggle]');
            var progress = document.querySelector('[data-audio-progress]');
            var icon = document.querySelector('[data-audio-icon]');
            var volume = document.querySelector('[data-audio-volume]');
            if (!audio || !toggle || !progress || !icon) return;

            var audioContext = null;
            var gainNode = null;
            var sourceNode = null;

            var radius = Number(progress.getAttribute('r')) || 22;
            var circumference = 2 * Math.PI * radius;
            progress.style.strokeDasharray = String(circumference);
            progress.style.strokeDashoffset = String(circumference);

            function getVolumeValue() {
                var value = volume ? Number(volume.value) : 0.1;
                return value >= 0 && value <= 1 ? value : 0.1;
            }

            function ensureAudioGraph() {
                if (gainNode || !window.AudioContext && !window.webkitAudioContext) {
                    return;
                }

                var Context = window.AudioContext || window.webkitAudioContext;
                audioContext = new Context();
                sourceNode = audioContext.createMediaElementSource(audio);
                gainNode = audioContext.createGain();
                gainNode.gain.value = getVolumeValue();
                sourceNode.connect(gainNode);
                gainNode.connect(audioContext.destination);
                audio.volume = 1;
            }

            function setPlaybackVolume(nextVolume) {
                if (nextVolume < 0 || nextVolume > 1) {
                    return;
                }

                ensureAudioGraph();

                if (gainNode && audioContext) {
                    var now = audioContext.currentTime;
                    gainNode.gain.cancelScheduledValues(now);
                    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
                    gainNode.gain.linearRampToValueAtTime(nextVolume, now + 0.045);
                    return;
                }

                audio.volume = nextVolume;
            }

            function updateProgress() {
                var duration = audio.duration;
                var current = audio.currentTime;
                var ratio = duration > 0 ? current / duration : 0;
                var offset = circumference * (1 - ratio);
                progress.style.strokeDashoffset = String(offset);
            }

            function updateIcon() {
                icon.textContent = audio.paused ? '>' : '||';
            }

            toggle.addEventListener('click', function () {
                ensureAudioGraph();
                if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                if (audio.paused) {
                    var playPromise = audio.play();
                    if (playPromise && typeof playPromise.catch === 'function') {
                        playPromise.catch(function () {});
                    }
                } else {
                    audio.pause();
                }
            });

            if (volume) {
                setPlaybackVolume(getVolumeValue());
                volume.addEventListener('input', function () {
                    var nextVolume = Number(volume.value);
                    setPlaybackVolume(nextVolume);
                });
            }

            audio.addEventListener('timeupdate', updateProgress);
            audio.addEventListener('loadedmetadata', updateProgress);
            audio.addEventListener('play', updateIcon);
            audio.addEventListener('pause', updateIcon);
            audio.addEventListener('ended', function () {
                audio.currentTime = 0;
                updateProgress();
                updateIcon();
            });

            updateProgress();
            updateIcon();
        })();

        // Typewriter reveal on correct answer
        (function () {
            if (typeof ROOM_SECRET === 'undefined') return;

            // Redirige le bouton retour vers la room elle-meme plutot que l'index
            var backLink = document.querySelector('.back-link');
            if (backLink) {
                backLink.href = window.location.pathname;
            }

            var SEEN_KEY = 'room45_secret_seen_' + window.location.pathname.replace(/\//g, '_');

            var clue    = document.querySelector('.clue');
            var image   = document.querySelector('.room-image');
            var answerForm = document.querySelector('.answer-form');
            var secretImage = document.querySelector('.secret-image');

            function revealInstant() {
                if (image) image.style.display = 'none';
                if (answerForm) answerForm.style.display = 'none';
                document.querySelectorAll('.room-content .divider').forEach(function (d) { d.style.display = 'none'; });
                var content = document.querySelector('.room-content');
                if (content) content.classList.add('is-revealed');
                if (clue) {
                    clue.innerHTML = '<p class="clue-text"><span id="tw"></span></p>';
                    document.getElementById('tw').textContent = ROOM_SECRET;
                }
                if (secretImage && ROOM_SECRET_IMAGE) {
                    secretImage.classList.add('is-mounted', 'is-visible');
                }
            }

            // Si déjà vu, affichage immédiat sans animations
            if (localStorage.getItem(SEEN_KEY)) {
                revealInstant();
                return;
            }

            // Extract exactly what is visually rendered (handles <br> consistently)
            function getClueTextPreservingBreaks(node) {
                if (!node) return '';
                var rendered = typeof node.innerText === 'string' ? node.innerText : (node.textContent || '');
                return rendered
                    .replace(/\r\n/g, '\n')
                    .replace(/\u00a0/g, ' ')
                    .replace(/[ \t]+/g, ' ')      // collapse horizontal whitespace
                    .replace(/\n{3,}/g, '\n\n')   // max une ligne vide (block + <br> cumulés)
                    .trim();
            }

            // Extract plain text then collapse clue to a single span
            var fullText = getClueTextPreservingBreaks(clue);
            if (clue) {
                clue.innerHTML = '<p class="clue-text"><span id="tw"></span></p>';
                document.getElementById('tw').textContent = fullText;
            }

            var ERASE_SPEED = 18;  // ms between each char erased
            var TYPE_SPEED  = 28;  // ms between each char typed
            var PAUSE       = 320; // ms pause between erase and type
            var DIVIDER_FADE_OUT = 380;
            var IMAGE_FADE_OUT = 1200;
            var FORM_FADE_OUT = 520;
            var SECRET_IMAGE_DELAY = 1100;

            function fadeOutAnswerDivider(cb) {
                var divider = document.querySelector('.room-content .divider');
                if (!divider) {
                    cb();
                    return;
                }
                divider.classList.add('is-fading-out');
                setTimeout(function () {
                    divider.style.display = 'none';
                    cb();
                }, DIVIDER_FADE_OUT + 40);
            }

            function fadeOutBaseImage(cb) {
                if (!image) {
                    cb();
                    return;
                }
                image.classList.add('is-fading-out');
                setTimeout(function () {
                    image.style.display = 'none';
                    cb();
                }, IMAGE_FADE_OUT + 40);
            }

            function fadeOutAnswerForm(cb) {
                if (!answerForm) {
                    cb();
                    return;
                }
                answerForm.classList.add('is-fading-out');
                setTimeout(function () {
                    answerForm.style.display = 'none';
                    cb();
                }, FORM_FADE_OUT + 40);
            }

            function erase(text, cb) {
                var tw = document.getElementById('tw');
                if (!tw) return cb();
                if (text.length === 0) return cb();
                setTimeout(function () {
                    text = text.slice(0, -1);
                    tw.textContent = text;
                    erase(text, cb);
                }, ERASE_SPEED);
            }

            function type(text, i, cb) {
                var tw = document.getElementById('tw');
                if (!tw) return cb && cb();
                if (i > text.length) return cb && cb();
                tw.textContent = text.slice(0, i);
                setTimeout(function () { type(text, i + 1, cb); }, TYPE_SPEED);
            }

            fadeOutAnswerForm(function () {
                fadeOutAnswerDivider(function () {
                    erase(fullText, function () {
                        fadeOutBaseImage(function () {
                            // Hide dividers, center the content area, then reveal secret
                            document.querySelectorAll('.room-content .divider').forEach(function (d) { d.style.display = 'none'; });
                            var content = document.querySelector('.room-content');
                            if (content) content.classList.add('is-revealed');

                            // Mount invisible secret image early to reserve layout space
                            if (secretImage && ROOM_SECRET_IMAGE) {
                                secretImage.classList.add('is-mounted');
                            }

                            setTimeout(function () {
                                type(ROOM_SECRET, 0, function () {
                                    localStorage.setItem(SEEN_KEY, '1');
                                    if (secretImage && ROOM_SECRET_IMAGE) {
                                        void secretImage.offsetWidth;
                                        setTimeout(function () {
                                            secretImage.classList.add('is-visible');
                                        }, SECRET_IMAGE_DELAY);
                                    }
                                });
                            }, PAUSE);
                        });
                    });
                });
            });
        })();
    </script>
</body>

</html>