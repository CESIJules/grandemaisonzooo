import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { requireAdmin } from "@/lib/auth";
import { PATHS } from "@/lib/paths";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { filename, force } = await req.json();

  if (!filename || typeof filename !== "string") {
    return NextResponse.json(
      { status: "error", message: "Nom de fichier requis" },
      { status: 400 }
    );
  }

  const safe = path.basename(filename);

  // 1. Check cache first
  if (!force && fs.existsSync(PATHS.MUSIC_METADATA_JSON)) {
    const cache = JSON.parse(fs.readFileSync(PATHS.MUSIC_METADATA_JSON, "utf-8")) as Record<string, unknown>;
    if (cache[safe]) {
      return NextResponse.json({ status: "success", data: cache[safe] });
    }
  }

  // 2. Run Python analysis
  const filePath = path.join(PATHS.MUSIC_DIR, safe);
  if (!filePath.startsWith(PATHS.MUSIC_DIR)) {
    return NextResponse.json({ status: "error", message: "Chemin invalide" }, { status: 400 });
  }
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ status: "error", message: "Fichier introuvable" }, { status: 404 });
  }

  const scriptPath = path.join(path.dirname(PATHS.MUSIC_DIR), "analyze_librosa.py");
  const pythonBin = fs.existsSync("/home/radio/venv/bin/python")
    ? "/home/radio/venv/bin/python"
    : "python3";

  try {
    const { stdout } = await execFileAsync(pythonBin, [scriptPath, filePath], { timeout: 60000 });
    const pyData = JSON.parse(stdout) as Record<string, unknown>;

    // Cache result
    let cache: Record<string, unknown> = {};
    if (fs.existsSync(PATHS.MUSIC_METADATA_JSON)) {
      cache = JSON.parse(fs.readFileSync(PATHS.MUSIC_METADATA_JSON, "utf-8"));
    }
    cache[safe] = pyData;
    fs.writeFileSync(PATHS.MUSIC_METADATA_JSON, JSON.stringify(cache, null, 2));

    return NextResponse.json({ status: "success", data: pyData });
  } catch (err) {
    console.error("[music/analyze-metadata]", err);
    return NextResponse.json(
      { status: "error", message: "Erreur lors de l'analyse des métadonnées." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file");
  if (!file) return NextResponse.json({});

  if (fs.existsSync(PATHS.MUSIC_METADATA_JSON)) {
    const cache = JSON.parse(fs.readFileSync(PATHS.MUSIC_METADATA_JSON, "utf-8")) as Record<string, unknown>;
    const safe = path.basename(file);
    if (cache[safe]) return NextResponse.json({ status: "success", data: cache[safe] });
  }
  return NextResponse.json({ status: "error", message: "Non trouvé" }, { status: 404 });
}
