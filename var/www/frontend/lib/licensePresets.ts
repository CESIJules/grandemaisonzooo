// Shared licence presets — referenced by both the admin form (autofills)
// and the public product page (renders structured usage rights).
//
// A tier whose `name` (case-insensitive) matches one of these presets
// will display the corresponding rights matrix. Custom names still work
// (fall back to a generic 3-line summary on the public page).

export interface RightsMatrix {
  formats: string;            // "MP3" | "MP3 and WAV" | "MP3, WAV and STEMS"
  copies: string;             // "5 000 copies" | "Unlimited"
  streams: string;            // "100 000" | "Unlimited"
  music_videos: string;       // "1 video" | "Unlimited"
  paid_performances: string;  // "Unlimited"
  radio_broadcasting: string; // "No" | "2 stations" | "Unlimited"
  delivery: string;           // "Files immediately after purchase"
}

export interface LicensePreset {
  key: string;                // canonical key
  name: string;               // display name (also used to auto-fill the tier name)
  license_type: string;       // short tagline shown next to the name
  is_exclusive: boolean;
  rights: RightsMatrix;
}

export const LICENSE_PRESETS: LicensePreset[] = [
  {
    key: "mp3",
    name: "MP3",
    license_type: "Licence non-exclusive · MP3",
    is_exclusive: false,
    rights: {
      formats: "MP3",
      copies: "5 000 copies",
      streams: "100 000",
      music_videos: "1 clip vidéo",
      paid_performances: "Illimitées",
      radio_broadcasting: "Non autorisée",
      delivery: "Fichiers livrés immédiatement après l'achat",
    },
  },
  {
    key: "wav",
    name: "WAV",
    license_type: "Licence non-exclusive · MP3 + WAV",
    is_exclusive: false,
    rights: {
      formats: "MP3 et WAV",
      copies: "10 000 copies",
      streams: "500 000",
      music_videos: "1 clip vidéo",
      paid_performances: "Illimitées",
      radio_broadcasting: "Autorisée (2 stations)",
      delivery: "Fichiers livrés immédiatement après l'achat",
    },
  },
  {
    key: "track_stems",
    name: "TRACK STEMS",
    license_type: "Licence non-exclusive · MP3 + WAV + STEMS",
    is_exclusive: false,
    rights: {
      formats: "MP3, WAV et STEMS",
      copies: "50 000 copies",
      streams: "1 000 000",
      music_videos: "2 clips vidéo",
      paid_performances: "Illimitées",
      radio_broadcasting: "Autorisée (illimitée)",
      delivery: "Fichiers livrés immédiatement après l'achat",
    },
  },
  {
    key: "wav_unlimited",
    name: "WAV UNLIMITED",
    license_type: "Licence non-exclusive · MP3 + WAV illimitée",
    is_exclusive: false,
    rights: {
      formats: "MP3 et WAV",
      copies: "Illimitées",
      streams: "Illimités",
      music_videos: "Illimités",
      paid_performances: "Illimitées",
      radio_broadcasting: "Autorisée (illimitée)",
      delivery: "Fichiers livrés immédiatement après l'achat",
    },
  },
  {
    key: "full_monetization",
    name: "FULL MONETIZATION",
    license_type: "Licence non-exclusive · MP3 + WAV + STEMS illimitée",
    is_exclusive: false,
    rights: {
      formats: "MP3, WAV et STEMS",
      copies: "Illimitées",
      streams: "Illimités",
      music_videos: "Illimités",
      paid_performances: "Illimitées",
      radio_broadcasting: "Autorisée (illimitée)",
      delivery: "Fichiers livrés immédiatement après l'achat",
    },
  },
  {
    key: "exclusive",
    name: "EXCLUSIVE",
    license_type: "Licence exclusive · MP3 + WAV + STEMS",
    is_exclusive: true,
    rights: {
      formats: "MP3, WAV et STEMS",
      copies: "Illimitées",
      streams: "Illimités",
      music_videos: "Illimités",
      paid_performances: "Illimitées",
      radio_broadcasting: "Autorisée (illimitée)",
      delivery: "Fichiers livrés immédiatement après l'achat",
    },
  },
];

/** Look up a preset by tier name (case- and space-insensitive). */
export function findPresetByName(name: string | undefined | null): LicensePreset | null {
  if (!name) return null;
  const norm = name.trim().toUpperCase().replace(/\s+/g, " ");
  return (
    LICENSE_PRESETS.find(
      (p) => p.name.toUpperCase() === norm || p.key.toUpperCase().replace(/_/g, " ") === norm
    ) ?? null
  );
}

/** Derive a generic rights summary for a custom (non-preset) tier. */
export function fallbackRightsFor(opts: {
  name: string;
  is_exclusive: boolean;
}): RightsMatrix {
  const n = opts.name.toUpperCase();
  const hasStems = n.includes("STEM");
  const hasWav = n.includes("WAV");
  const exclusive = opts.is_exclusive;
  const formats = hasStems
    ? "MP3, WAV et STEMS"
    : hasWav
      ? "MP3 et WAV"
      : "MP3";
  if (exclusive) {
    return {
      formats,
      copies: "Illimitées",
      streams: "Illimités",
      music_videos: "Illimités",
      paid_performances: "Illimitées",
      radio_broadcasting: "Autorisée (illimitée)",
      delivery: "Fichiers livrés immédiatement après l'achat",
    };
  }
  return {
    formats,
    copies: hasStems ? "50 000 copies" : hasWav ? "10 000 copies" : "5 000 copies",
    streams: hasStems ? "1 000 000" : hasWav ? "500 000" : "100 000",
    music_videos: hasStems ? "2 clips vidéo" : "1 clip vidéo",
    paid_performances: "Illimitées",
    radio_broadcasting: hasStems ? "Autorisée (illimitée)" : hasWav ? "Autorisée (2 stations)" : "Non autorisée",
    delivery: "Fichiers livrés immédiatement après l'achat",
  };
}
