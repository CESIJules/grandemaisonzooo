import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getPostById, updatePost, deletePost, getArtistProfileById } from "@/lib/data";
import { requireAuth } from "@/lib/auth";
import type { SessionData } from "@/types";
import { PATHS } from "@/lib/paths";

type Params = { params: Promise<{ id: string }> };

// Returns null if access OK, or a 401/403 Response otherwise.
function checkPostOwnership(session: SessionData, postArtist: string): Response | null {
  if (session.role === "admin") return null;
  if (session.role !== "artist" || !session.artist_id) {
    return NextResponse.json({ status: "error", message: "Accès refusé" }, { status: 403 });
  }
  const profile = getArtistProfileById(session.artist_id);
  if (!profile) {
    return NextResponse.json({ status: "error", message: "Profil artiste introuvable" }, { status: 403 });
  }
  if (profile.name.toLowerCase() !== (postArtist ?? "").toLowerCase()) {
    return NextResponse.json({ status: "error", message: "Vous ne pouvez modifier que vos propres posts" }, { status: 403 });
  }
  return null;
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

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const post = getPostById(parseInt(id, 10));
  if (!post) {
    return NextResponse.json(
      { status: "error", message: "Post introuvable" },
      { status: 404 }
    );
  }
  return NextResponse.json({ status: "success", data: post });
}

export async function PUT(req: NextRequest, { params }: Params) {
  let session;
  try {
    session = await requireAuth();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  const existing = getPostById(parseInt(id, 10));
  if (!existing) {
    return NextResponse.json({ status: "error", message: "Post introuvable" }, { status: 404 });
  }
  const denied = checkPostOwnership(session, existing.artist);
  if (denied) return denied;

  const contentType = req.headers.get("content-type") ?? "";
  let updates: Record<string, string | undefined> = {};

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const title = formData.get("title") as string | null;
    const date = formData.get("date") as string | null;
    const artist = formData.get("artist") as string | null;
    const link = formData.get("link") as string | null;
    const imageFile = formData.get("image") as File | null;
    if (title) updates.title = title;
    if (date) updates.date = date;
    if (artist) updates.artist = artist;
    if (link !== null) updates.link = link;
    if (imageFile && imageFile.size > 0) {
      updates.image = await saveUploadedImage(imageFile);
    }
  } else {
    updates = await req.json();
  }

  // Artists cannot reassign a post to a different artist
  if (session.role === "artist") {
    delete updates.artist;
  }

  const post = updatePost(parseInt(id, 10), updates);
  if (!post) {
    return NextResponse.json({ status: "error", message: "Post introuvable" }, { status: 404 });
  }
  return NextResponse.json({ status: "success", message: "Post modifié.", data: post });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  let session;
  try {
    session = await requireAuth();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  const existing = getPostById(parseInt(id, 10));
  if (!existing) {
    return NextResponse.json({ status: "error", message: "Post introuvable" }, { status: 404 });
  }
  const denied = checkPostOwnership(session, existing.artist);
  if (denied) return denied;

  const deleted = deletePost(parseInt(id, 10));
  if (!deleted) {
    return NextResponse.json({ status: "error", message: "Post introuvable" }, { status: 404 });
  }
  return NextResponse.json({ status: "success", message: "Post supprimé." });
}
