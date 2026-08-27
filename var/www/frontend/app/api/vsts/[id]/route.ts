import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getVsts, updateVst, deleteVst } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { PATHS } from "@/lib/paths";

async function saveUploadedFile(file: File, prefix: string): Promise<string> {
  const uploadDir = PATHS.UPLOADS_DIR;
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const ext = path.extname(file.name) || ".bin";
  const filename = `${prefix}_${Date.now()}${ext}`;
  const dest = path.join(uploadDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(dest, buffer);
  return `/uploads/${filename}`;
}

// ─── GET /api/vsts/[id] — public ──────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vst = getVsts().find((v) => v.id === Number(id));
  if (!vst) return NextResponse.json({ status: "error", message: "Introuvable" }, { status: 404 });
  return NextResponse.json(vst);
}

// ─── PUT /api/vsts/[id] — admin only ──────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  try {
    const contentType = req.headers.get("content-type") ?? "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updates: Record<string, any>;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      updates = {};
      const name = formData.get("name") as string | null;
      const description = formData.get("description") as string | null;
      const releaseDate = formData.get("releaseDate") as string | null;
      const version = formData.get("version") as string | null;
      const downloadUrl = formData.get("downloadUrl") as string | null;
      if (name !== null) updates.name = name;
      if (description !== null) updates.description = description;
      if (releaseDate !== null) updates.releaseDate = releaseDate;
      if (version !== null) updates.version = version || undefined;
      if (downloadUrl !== null) updates.downloadUrl = downloadUrl || undefined;

      // Kept existing screenshot URLs (JSON-encoded string[])
      const keptRaw = formData.get("screenshots") as string | null;
      let keptScreenshots: string[] = [];
      if (keptRaw) { try { keptScreenshots = JSON.parse(keptRaw); } catch { /* ignore */ } }

      // New screenshot files
      const newFiles = formData.getAll("newScreenshots") as File[];
      const newUrls: string[] = [];
      for (const file of newFiles) {
        if (file && file.size > 0) newUrls.push(await saveUploadedFile(file, "vst_screen"));
      }
      updates.screenshots = [...keptScreenshots, ...newUrls];

      // Positions
      const posRaw = formData.get("screenshotPositions") as string | null;
      if (posRaw) { try { updates.screenshotPositions = JSON.parse(posRaw); } catch { /* ignore */ } }
    } else {
      updates = await req.json();
    }

    const updated = updateVst(Number(id), updates);
    if (!updated) return NextResponse.json({ status: "error", message: "Introuvable" }, { status: 404 });
    return NextResponse.json({ status: "success", message: "VST mis à jour.", data: updated });
  } catch (err) {
    console.error("[PUT /api/vsts/[id]]", err);
    return NextResponse.json({ status: "error", message: "Erreur serveur" }, { status: 500 });
  }
}

// ─── DELETE /api/vsts/[id] — admin only ───────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { id } = await params;
  const ok = deleteVst(Number(id));
  if (!ok) return NextResponse.json({ status: "error", message: "Introuvable" }, { status: 404 });
  return NextResponse.json({ status: "success", message: "VST supprimé." });
}
