import { NextResponse } from "next/server";
import fs from "fs";
import { PATHS } from "@/lib/paths";

export async function GET() {
  if (!fs.existsSync(PATHS.MUSIC_METADATA_JSON)) {
    return NextResponse.json({});
  }
  const raw = fs.readFileSync(PATHS.MUSIC_METADATA_JSON, "utf-8");
  try {
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({});
  }
}
