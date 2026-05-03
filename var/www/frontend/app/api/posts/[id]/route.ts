import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getPostById, updatePost, deletePost } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { PATHS } from "@/lib/paths";

type Params = { params: Promise<{ id: string }> };

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
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
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

  const post = updatePost(parseInt(id, 10), updates);
  if (!post) {
    return NextResponse.json(
      { status: "error", message: "Post introuvable" },
      { status: 404 }
    );
  }
  return NextResponse.json({ status: "success", message: "Post modifié.", data: post });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  const deleted = deletePost(parseInt(id, 10));
  if (!deleted) {
    return NextResponse.json(
      { status: "error", message: "Post introuvable" },
      { status: 404 }
    );
  }
  return NextResponse.json({ status: "success", message: "Post supprimé." });
}
