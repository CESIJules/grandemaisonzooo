<?php
// ─────────────────────────────────────────────────────────────────────────────
// _data.php — Contenu & réponses de toutes les salles
// NE JAMAIS servir directement. Protégé par le guard ci-dessous.
// ─────────────────────────────────────────────────────────────────────────────
if (!defined('ROOM45_ENTRY')) {
    http_response_code(403);
    exit;
}

// ── COMMENT GÉNÉRER UN HASH ───────────────────────────────────────────────────
// Pour chaque réponse : hash('sha256', strtolower(trim('ta réponse')))
// Exemple : hash('sha256', 'labyrinthe') → colle le résultat dans 'answer_hash'
// ─────────────────────────────────────────────────────────────────────────────

$ROOMS_DATA = [

    'a01' => [
        'number'      => '1',
        'active'      => true,
        // Contenu affiché dans la salle — HTML autorisé, images, texte, etc.
        // ⬇ TODO : remplace ce placeholder par le contenu réel de l'énigme
        'content'     => '<p class="clue-text">Three doors stand before you, each whispering a different truth.</p>
    <div class="clue-group"><br /><br />
    <p class="clue-text">One tells of what was, but not of what must be understood.<br />One speaks plainly, yet says nothing of what matters.<br />And one… one breathes life into silence.</p>
    </div><br /><br />
    <p class="clue-text">Only one will make sense, when the rest are soundless.</p>',
        // ⬇ TODO : optionnel — chemin vers une image (relative à /var/www/html/)
        'image'       => '/room45/cover/a01.png',
        // ⬇ optionnel — son associé à la salle
        'sound'       => '/room45/sounds/a01.mp3',
        // sha256(strtolower(trim(réponse)))
        // ⬇ TODO : remplace par le vrai hash
        'answer_hash' => hash('sha256', 'suffocation'),
        // Texte révélé après bonne réponse — JAMAIS dans le HTML client
        // ⬇ TODO : remplace par le vrai secret
        'secret'      => "If the air grows thin and your chest feels tight, do not seek what is merely said, nor what is only told.\n\nInstead, listen for the voice that teaches through illusion — a story not meant to be believed, but to be understood.\n\nOnly there will you find breath again.",
        // ⬇ optionnel — image affichée après une bonne réponse
        'secret_image' => '/room45/symbols/fable.png',
        // ⬇ optionnel — true pour afficher le secret en grand (ex: illustration), false/absent = petite icône
        'secret_image_large' => true,
        // 'text' ou 'number'
        'answer_type' => 'text',
        // Placeholder du champ input affiché à l'utilisateur
        'placeholder' => '………………………………………',
    ],

    'a02' => [
        'number'      => '2',
        'active'      => true,
        'content'     => '<p class="clue-text">Something about that room was wrong.<br /> <br />

At its center stood an hourglass, “What does it mean?” you whispered.

A soft laugh echoed.

The dancing fool.

Upside down, he’s watching, and keep talking about a door marked with a key.

A suggestion… or a trap.

Unlikely.

It knows the truth.

And keeps it.<br /> <br />

Yet another question lingers within you.

“Will it leave me alone?”

You looked at the hourglass.

“Maybe.”
<br />
Because it isn’t measuring the time remaining.
<br />
It’s measuring us.</p>',

        'sound'       => '/room45/sounds/a02.mp3',
        'image'       => '/room45/cover/a02.jpg',
        'answer_hash' => hash('sha256', 'up is down'),
        'answer_type' => 'text',
        'placeholder' => '………………………………………',
        'secret'      => 'Nothing here is truly lost,
only turned beyond recognition.
Like the hourglass,
a simple turn restores the flow
and reveals what the dancing fool is hiding from you.',
        'secret_image' => '/room45/symbols/flip.png',
    ],

    'a03' => [
        'number'      => '3',
        'content'     => '<p class="clue-text">TODO — contenu de la salle 3</p>',
        'image'       => null,
        'answer_hash' => hash('sha256', 'exemple'),
        'secret'      => 'Secret de la salle 3.',
        'secret_image' => null,
        'answer_type' => 'text',
        'placeholder' => 'Ton réponse…',
    ],

    'a04' => [
        'number'      => '4',
        'active'      => true,
        'type'        => 'void',
        'content'     => '<p class="clue-text">You walked through a door. The door is gone.</p>
    <br />
    <p class="clue-text">No walls. No echo. Every direction leads back here.<br />
    To this. To nothing.</p>
    <br />
    <p class="clue-text">This place has a name.<br />
    The one you whisper when all other words have failed you.</p>',
        'image'       => '/room45/cover/deadend.jpg',
        'answer_hash' => hash('sha256', 'void'),
        'answer_type' => 'text',
        'placeholder' => '………………………………………',
        'secret'      => "You already knew.

The moment you stepped in, some part of you recognized it — not the darkness, not the silence, but the quality of the stillness.

This is what remains when everything else has been subtracted.

Not an end. Not a beginning.

Just the void, watching you back.

And yet — there is a faint outline ahead.
Something that was not here before.
A threshold, barely visible.

Perhaps it opened because you finally named what you were standing in.",
        'secret_image' => null,
    ],

    'a05' => [
        'number'      => '5',
        'content'     => '<p class="clue-text">TODO — contenu de la salle 5</p>',
        'image'       => null,
        'answer_hash' => hash('sha256', 'exemple'),
        'secret'      => 'Secret de la salle 5.',
        'secret_image' => null,
        'answer_type' => 'text',
        'placeholder' => 'Ton réponse…',
    ],

    'a06' => [
        'number'      => '6',
        'content'     => '<p class="clue-text">TODO — contenu de la salle 6</p>',
        'image'       => null,
        'answer_hash' => hash('sha256', 'exemple'),
        'secret'      => 'Secret de la salle 6.',
        'secret_image' => null,
        'answer_type' => 'text',
        'placeholder' => 'Ton réponse…',
    ],

    'a07' => [
        'number'      => '7',
        'content'     => '<p class="clue-text">TODO — contenu de la salle 7</p>',
        'image'       => null,
        'answer_hash' => hash('sha256', 'exemple'),
        'secret'      => 'Secret de la salle 7.',
        'secret_image' => null,
        'answer_type' => 'text',
        'placeholder' => 'Ton réponse…',
    ],

    'a08' => [
        'number'      => '8',
        'content'     => '<p class="clue-text">TODO — contenu de la salle 8</p>',
        'image'       => null,
        'answer_hash' => hash('sha256', 'exemple'),
        'secret'      => 'Secret de la salle 8.',
        'secret_image' => null,
        'answer_type' => 'text',
        'placeholder' => 'Ton réponse…',
    ],

    'a09' => [
        'number'      => '9',
        'content'     => '<p class="clue-text">TODO — contenu de la salle 9</p>',
        'image'       => null,
        'answer_hash' => hash('sha256', 'exemple'),
        'secret'      => 'Secret de la salle 9.',
        'secret_image' => null,
        'answer_type' => 'text',
        'placeholder' => 'Ton réponse…',
    ],

    'a10' => [
        'number'      => '10',
        'content'     => '<p class="clue-text">TODO — contenu de la salle 10</p>',
        'image'       => null,
        'answer_hash' => hash('sha256', 'exemple'),
        'secret'      => 'Secret de la salle 10.',
        'secret_image' => null,
        'answer_type' => 'text',
        'placeholder' => 'Ton réponse…',
    ],

    'a11' => [
        'number'      => '11',
        'content'     => '<p class="clue-text">TODO — contenu de la salle 11</p>',
        'image'       => null,
        'answer_hash' => hash('sha256', 'exemple'),
        'secret'      => 'Secret de la salle 11.',
        'secret_image' => null,
        'answer_type' => 'text',
        'placeholder' => 'Ton réponse…',
    ],

    'a12' => [
        'number'      => '12',
        'content'     => '<p class="clue-text">TODO — contenu de la salle 12</p>',
        'image'       => null,
        'answer_hash' => hash('sha256', 'exemple'),
        'secret'      => 'Secret de la salle 12.',
        'secret_image' => null,
        'answer_type' => 'text',
        'placeholder' => 'Ton réponse…',
    ],

    'a13' => [
        'number'      => '13',
        'content'     => '<p class="clue-text">TODO — contenu de la salle 13</p>',
        'image'       => null,
        'answer_hash' => hash('sha256', 'exemple'),
        'secret'      => 'Secret de la salle 13.',
        'secret_image' => null,
        'answer_type' => 'text',
        'placeholder' => 'Ton réponse…',
    ],

    'a14' => [
        'number'      => '14',
        'content'     => '<p class="clue-text">TODO — contenu de la salle 14</p>',
        'image'       => null,
        'answer_hash' => hash('sha256', 'exemple'),
        'secret'      => 'Secret de la salle 14.',
        'secret_image' => null,
        'answer_type' => 'text',
        'placeholder' => 'Ton réponse…',
    ],

    'a15' => [
        'number'      => '15',
        'content'     => '<p class="clue-text">TODO — contenu de la salle 15</p>',
        'image'       => null,
        'answer_hash' => hash('sha256', 'exemple'),
        'secret'      => 'Secret de la salle 15.',
        'secret_image' => null,
        'answer_type' => 'text',
        'placeholder' => 'Ton réponse…',
    ],

    'a16' => [
        'number'      => '16',
        'content'     => '<p class="clue-text">TODO — contenu de la salle 16</p>',
        'image'       => null,
        'answer_hash' => hash('sha256', 'exemple'),
        'secret'      => 'Secret de la salle 16.',
        'secret_image' => null,
        'answer_type' => 'text',
        'placeholder' => 'Ton réponse…',
    ],

];
