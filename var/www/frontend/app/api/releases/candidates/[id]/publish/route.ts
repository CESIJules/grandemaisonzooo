import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCandidateById, publishCandidate } from "@/lib/data";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/releases/candidates/[id]/publish
 * Converts a candidate to a Post and removes it from the candidates list.
 */
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ status: "error", message: "Non autorisé." }, { status: 401 });
  }

  const { id } = await params;
  const candidate = getCandidateById(id);
  if (!candidate) {
    return NextResponse.json({ status: "error", message: "Candidate introuvable." }, { status: 404 });
  }

  const post = publishCandidate(id);
  if (!post) {
    return NextResponse.json({ status: "error", message: "Échec de la publication." }, { status: 500 });
  }

  return NextResponse.json({ status: "success", post });
}
