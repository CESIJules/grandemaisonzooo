import { NextResponse } from "next/server";
import fs from "fs";
import { PATHS } from "@/lib/paths";

export async function GET() {
  if (!fs.existsSync(PATHS.MUSIC_DIR)) {
    return NextResponse.json(
      { status: "error", message: "Dossier musique introuvable" },
      { status: 500 }
    );
  }

  const all = fs.readdirSync(PATHS.MUSIC_DIR);
  const files = all.filter((f) => {
    const stat = fs.statSync(`${PATHS.MUSIC_DIR}/${f}`);
    return stat.isFile();
  });

  return NextResponse.json({ status: "success", files });
}
