import { NextRequest, NextResponse } from "next/server";
import { getArtistProfiles, saveArtistProfiles } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import type { ArtistProfile } from "@/types";

export async function GET() {
  const profiles = getArtistProfiles();
  return NextResponse.json(profiles);
}

// Fields an artist may edit on their own profile.
// Excluded: id, stripeAccountId/ChargesEnabled/DetailsSubmitted, latestRelease
const ARTIST_EDITABLE_FIELDS: (keyof ArtistProfile)[] = [
  "name", "glitchName", "location", "image",
  "listenLink", "watchLink", "instagramLink",
  "soundcloudUserId", "youtubeChannelId", "deezerArtistId",
];

export async function PUT(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch (res) {
    return res as Response;
  }

  try {
    const incoming = (await req.json()) as ArtistProfile[];
    if (!Array.isArray(incoming)) {
      return NextResponse.json(
        { status: "error", message: "Format invalide." },
        { status: 400 }
      );
    }

    if (session.role === "admin") {
      saveArtistProfiles(incoming);
    } else if (session.role === "artist") {
      // Artist: only patch their own profile, whitelist editable fields, ignore everything else
      const ownId = session.artist_id;
      if (!ownId) {
        return NextResponse.json(
          { status: "error", message: "Accès refusé" },
          { status: 403 }
        );
      }
      const patchSource = incoming.find((p) => p.id === ownId);
      if (!patchSource) {
        return NextResponse.json(
          { status: "error", message: "Profil introuvable dans la requête." },
          { status: 400 }
        );
      }
      const existing = getArtistProfiles();
      const idx = existing.findIndex((p) => p.id === ownId);
      if (idx === -1) {
        return NextResponse.json(
          { status: "error", message: "Profil inexistant." },
          { status: 404 }
        );
      }
      const patch: Partial<ArtistProfile> = {};
      for (const key of ARTIST_EDITABLE_FIELDS) {
        if (key in patchSource) {
          (patch as Record<string, unknown>)[key as string] = patchSource[key];
        }
      }
      existing[idx] = { ...existing[idx], ...patch };
      saveArtistProfiles(existing);
    } else {
      return NextResponse.json(
        { status: "error", message: "Accès refusé" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Profils artistes sauvegardés.",
    });
  } catch (err) {
    console.error("[artists/profiles]", err);
    return NextResponse.json(
      { status: "error", message: "Une erreur interne est survenue." },
      { status: 500 }
    );
  }
}
