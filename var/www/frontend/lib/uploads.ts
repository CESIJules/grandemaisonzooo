// Server-only file upload helpers for the shop.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PATHS } from "./paths";

/** Save a web-served asset (cover image, audio teaser) → returns a /uploads/... URL. */
export async function savePublicAsset(file: File, prefix: string): Promise<string> {
  const dir = PATHS.UPLOADS_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(file.name) || ".bin";
  const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
  const dest = path.join(dir, filename);
  fs.writeFileSync(dest, Buffer.from(await file.arrayBuffer()));
  return `/uploads/${filename}`;
}

/**
 * Save a deliverable product file OUTSIDE the web root (never served by nginx).
 * Returns the absolute server path + the original filename for later download.
 */
export async function saveDeliverable(
  file: File,
  prefix: string
): Promise<{ filePath: string; fileName: string }> {
  const dir = PATHS.SHOP_FILES_DIR;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true, mode: 0o750 });
  const ext = path.extname(file.name) || ".bin";
  const stored = `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString("hex")}${ext}`;
  const dest = path.join(dir, stored);
  fs.writeFileSync(dest, Buffer.from(await file.arrayBuffer()));
  return { filePath: dest, fileName: file.name };
}
