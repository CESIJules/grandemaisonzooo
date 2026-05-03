import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getVsts, addVst } from "@/lib/data";
import { requireAdmin } from "@/lib/auth";
import { PATHS } from "@/lib/paths";

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── GET /api/vsts — public ────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json(getVsts());
}

// ─── POST /api/vsts — admin only ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let name = "", description = "", releaseDate = "", version = "", downloadUrl = "";
    let screenshotUrls: string[] = [];
    let screenshotPositions: string[] = [];
    let downloadFilename: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      name         = (formData.get("name") as string) ?? "";
      description  = (formData.get("description") as string) ?? "";
      releaseDate  = (formData.get("releaseDate") as string) ?? "";
      version      = (formData.get("version") as string) ?? "";
      downloadUrl  = (formData.get("downloadUrl") as string) ?? "";

      // Screenshot positions (JSON-encoded string[])
      const posRaw = formData.get("screenshotPositions") as string | null;
      if (posRaw) {
        try { screenshotPositions = JSON.parse(posRaw); } catch { /* ignore */ }
      }

      // Screenshots: multiple files named "screenshots"
      const screenshotFiles = formData.getAll("screenshots") as File[];
      for (const file of screenshotFiles) {
        if (file && file.size > 0) {
          const url = await saveUploadedFile(file, "vst_screen");
          screenshotUrls.push(url);
        }
      }

      // Optional pre-uploaded download file
      const downloadFile = formData.get("downloadFile") as File | null;
      if (downloadFile && downloadFile.size > 0 && !downloadUrl) {
        downloadFilename = downloadFile.name;
        downloadUrl = await saveUploadedFile(downloadFile, "vst_dl");
      }
    } else {
      const body = await req.json();
      ({ name, description, releaseDate, version = "", downloadUrl = "", screenshots: screenshotUrls = [] } = body);
    }

    if (!name || !description || !releaseDate) {
      return NextResponse.json(
        { status: "error", message: "Champs obligatoires manquants (name, description, releaseDate)" },
        { status: 400 }
      );
    }

    const vst = addVst({
      name, description, screenshots: screenshotUrls,
      screenshotPositions: screenshotPositions.length ? screenshotPositions : undefined,
      downloadUrl, releaseDate, version: version || undefined, downloadFilename,
    });
    return NextResponse.json({ status: "success", message: "VST ajouté.", data: vst }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/vsts]", err);
    return NextResponse.json({ status: "error", message: "Erreur serveur" }, { status: 500 });
  }
}
