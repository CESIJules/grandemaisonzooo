import { NextResponse } from "next/server";
import { getPosts } from "@/lib/data";

export const dynamic = "force-dynamic";

const BASE_URL = "https://grandemaisonzoo.com";

export async function GET() {
  const posts = getPosts();

  const items = posts
    .slice(0, 50)
    .map(
      (post) => `
  <item>
    <title><![CDATA[${post.title}]]></title>
    <description><![CDATA[${post.subtitle ?? ""}]]></description>
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <link>${BASE_URL}/#timeline</link>
    <guid isPermaLink="false">post-${post.id}</guid>
    <author>${post.artist}</author>
  </item>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>GRANDE MAISON — Actualités</title>
    <link>${BASE_URL}</link>
    <description>Les dernières actualités du collectif GRANDE MAISON — sorties, concerts, annonces.</description>
    <language>fr-FR</language>
    <copyright>GRANDE MAISON</copyright>
    <atom:link href="${BASE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${BASE_URL}/images/og-image.jpg</url>
      <title>GRANDE MAISON</title>
      <link>${BASE_URL}</link>
    </image>
    ${items}
  </channel>
</rss>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=7200",
    },
  });
}
