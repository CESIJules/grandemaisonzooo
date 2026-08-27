import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getPosts, addPost, getArtistProfileById } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import { PATHS } from "@/lib/paths";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const artist = searchParams.get("artist");
  let posts = getPosts();
  if (artist && artist !== "Tous") posts = posts.filter((p) => p.artist?.toLowerCase() === artist.toLowerCase());
  return NextResponse.json(posts);
}

async function saveUploadedImage(file: File): Promise<string> {
  const uploadDir = PATHS.UPLOADS_DIR;
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const ext = path.extname(file.name) || ".jpg";
  const filename = `post_${Date.now()}${ext}`;
  const dest = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  return `uploads/${filename}`;
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAuth();
  } catch (res) {
    return res as Response;
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let title = "", date = "", artist = "", link = "", image = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      title = (formData.get("title") as string) ?? "";
      date = (formData.get("date") as string) ?? "";
      artist = (formData.get("artist") as string) ?? "";
      link = (formData.get("link") as string) ?? "";
      const imageFile = formData.get("image") as File | null;
      if (imageFile && imageFile.size > 0) {
        image = await saveUploadedImage(imageFile);
      }
    } else {
      const body = await req.json();
      ({ title, date, artist, link, image } = body);
    }

    // Artists can only post under their own name
    if (session.role === "artist") {
      if (!session.artist_id) {
        return NextResponse.json({ status: "error", message: "Accès refusé" }, { status: 403 });
      }
      const ownProfile = getArtistProfileById(session.artist_id);
      if (!ownProfile) {
        return NextResponse.json({ status: "error", message: "Profil artiste introuvable" }, { status: 403 });
      }
      // Force the post's artist name to match the artist's profile (ignore any spoofed value)
      artist = ownProfile.name;
    }

    if (!title || !date || !artist) {
      return NextResponse.json(
        { status: "error", message: "Champs obligatoires manquants (title, date, artist)" },
        { status: 400 }
      );
    }
    const post = addPost({ title, date, artist, link, image });
    return NextResponse.json({ status: "success", message: "Post ajouté.", data: post }, { status: 201 });
  } catch (err) {
    console.error("[posts]", err);
    return NextResponse.json({ status: "error", message: "Une erreur interne est survenue." }, { status: 500 });
  }
}
