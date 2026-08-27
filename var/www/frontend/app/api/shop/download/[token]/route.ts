import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { Readable } from "stream";
import {
  getDownloadToken,
  isTokenValid,
  incrementTokenDownload,
  getOrderItem,
  getOrder,
  getTier,
} from "@/lib/shop";
import { PATHS } from "@/lib/paths";

// ─── GET /api/shop/download/[token] — gated by a valid, paid, non-expired token ──
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const tok = getDownloadToken(token);
  if (!tok) {
    return NextResponse.json({ status: "error", message: "Lien invalide." }, { status: 404 });
  }
  if (!isTokenValid(tok)) {
    return NextResponse.json({ status: "error", message: "Lien expiré ou quota atteint." }, { status: 410 });
  }

  const item = getOrderItem(tok.order_item_id);
  if (!item) {
    return NextResponse.json({ status: "error", message: "Commande introuvable." }, { status: 404 });
  }
  const order = getOrder(item.order_id);
  if (!order || order.status !== "paid") {
    return NextResponse.json({ status: "error", message: "Paiement non confirmé." }, { status: 402 });
  }

  const tier = item.tier_id ? getTier(item.tier_id) : null;
  if (!tier?.file_path) {
    return NextResponse.json({ status: "error", message: "Fichier indisponible." }, { status: 404 });
  }

  // Defence-in-depth: only ever serve files from inside SHOP_FILES_DIR.
  if (!tier.file_path.startsWith(PATHS.SHOP_FILES_DIR) || !fs.existsSync(tier.file_path)) {
    return NextResponse.json({ status: "error", message: "Fichier introuvable." }, { status: 404 });
  }

  incrementTokenDownload(token);

  const stat = fs.statSync(tier.file_path);
  const safeName = (tier.file_name || `${item.product_title}-${item.tier_name}`)
    .replace(/[\r\n"]/g, "")
    .trim();
  const webStream = Readable.toWeb(fs.createReadStream(tier.file_path)) as ReadableStream;

  return new Response(webStream, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(stat.size),
      "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "Cache-Control": "no-store",
    },
  });
}
