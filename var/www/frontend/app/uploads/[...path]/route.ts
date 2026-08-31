import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { PATHS } from "@/lib/paths";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;

  // Security: prevent path traversal
  const uploadsDir = path.resolve(PATHS.UPLOADS_DIR);
  const resolvedPath = path.resolve(path.join(uploadsDir, ...segments));
  if (!resolvedPath.startsWith(uploadsDir + path.sep) && resolvedPath !== uploadsDir) {
    return new NextResponse(null, { status: 403 });
  }

  // Serve locally if file exists
  if (fs.existsSync(resolvedPath)) {
    const buffer = fs.readFileSync(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".zip": "application/zip",
      ".rar": "application/x-rar-compressed",
      ".pdf": "application/pdf",
      ".glb": "model/gltf-binary",
      ".gltf": "model/gltf+json",
      ".obj": "text/plain",
    };
    const contentType = contentTypes[ext] ?? "application/octet-stream";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  // Fallback: proxy from production server to prevent CORS issues in dev
  try {
    const upstreamUrl = `https://grandemaisonzoo.com/uploads/${segments.join("/")}`;
    const upstreamRes = await fetch(upstreamUrl);
    if (!upstreamRes.ok) {
      return new NextResponse(null, { status: upstreamRes.status });
    }
    const arrayBuffer = await upstreamRes.arrayBuffer();
    const ext = path.extname(segments[segments.length - 1] || "").toLowerCase();
    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".zip": "application/zip",
      ".rar": "application/x-rar-compressed",
      ".pdf": "application/pdf",
      ".glb": "model/gltf-binary",
      ".gltf": "model/gltf+json",
      ".obj": "text/plain",
    };
    const contentType = contentTypes[ext] ?? upstreamRes.headers.get("content-type") ?? "application/octet-stream";
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("Failed to proxy upload from production:", err);
    return new NextResponse(null, { status: 404 });
  }
}
