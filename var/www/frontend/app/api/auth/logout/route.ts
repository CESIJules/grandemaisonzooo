import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.json({ status: "success" });
}

export async function GET() {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"));
}
