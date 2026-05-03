import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getPosts, addPost } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { PATHS } from "@/lib/paths";
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const artist = searchParams.get("artist");
  let posts = getPosts();
  if (artist && artist !== "Tous") posts = posts.filter((p) => p.artist === artist);
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
  try {
    await requireAdmin();
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

    if (!title || !date || !artist) {
      return NextResponse.json(
        { status: "error", message: "Champs obligatoires manquants (title, date, artist)" },
        { status: 400 }
      );
    }
    const post = addPost({ title, date, artist, link, image });
    return NextResponse.json({ status: "success", message: "Post ajouté.", data: post }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return NextResponse.json({ status: "error", message: msg }, { status: 500 });
  }
}
