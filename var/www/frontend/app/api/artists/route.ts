import { NextResponse } from "next/server";
import { getArtistNames } from "@/lib/data";

export async function GET() {
  const artists = getArtistNames();
  return NextResponse.json(artists);
}
