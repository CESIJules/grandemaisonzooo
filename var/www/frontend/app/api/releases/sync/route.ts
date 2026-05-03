import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { getArtistProfiles, getPosts, savePosts } from "@/lib/data";
import type { Post } from "@/types";

export const dynamic = "force-dynamic";

const LIQUIDSOAP_TOKEN = process.env.LIQUIDSOAP_TOKEN;

/**
 * POST /api/releases/sync
 * Scans all artist profiles with source IDs (soundcloudUsername, youtubeChannelId, deezerArtistId)
 * and creates Post entries for new releases.
 *
 * Auth: LIQUIDSOAP_TOKEN bearer (also called as admin-only — rate-limited in middleware).
 */
export async function POST(req: NextRequest) {
  // Auth: admin session OR internal token
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  // Import auth lazily to avoid circular deps
  let authed = false;
  if (LIQUIDSOAP_TOKEN && bearer === LIQUIDSOAP_TOKEN) {
    authed = true;
  } else {
    try {
      const { requireAdmin } = await import("@/lib/auth");
      await requireAdmin();
      authed = true;
    } catch {
      authed = false;
    }
  }

  if (!authed) {
    return NextResponse.json({ status: "error", message: "Non autorisé." }, { status: 401 });
  }

  const profiles = getArtistProfiles();
  const existingPosts = getPosts();
  const existingTitles = new Set(existingPosts.map((p) => `${p.artist}:${p.title}`));

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });

  const newPosts: Post[] = [];

  for (const profile of profiles) {
    if (!profile.soundcloudUsername && !profile.youtubeChannelId) continue;

    // SoundCloud RSS
    if (profile.soundcloudUsername) {
      try {
        const rssUrl = `https://feeds.soundcloud.com/users/soundcloud:users:${profile.soundcloudUsername}/sounds.rss`;
        const res = await fetch(rssUrl, {
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "GrandeMaisonBot/1.0" },
        });
        if (res.ok) {
          const xml = await res.text();
          const parsed = parser.parse(xml);
          const items: unknown[] = parsed?.rss?.channel?.item ?? [];
          const entries = Array.isArray(items) ? items : [items];

          for (const item of entries.slice(0, 5) as Array<Record<string, string>>) {
            const title: string = item["title"] ?? "";
            const link: string = item["link"] ?? "";
            const pubDate: string = item["pubDate"] ?? "";
            const image: string =
              (item["itunes:image"] as unknown as { "@_href": string })?.["@_href"] ??
              profile.image ??
              "";
            const date = pubDate
              ? new Date(pubDate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0];
            const key = `${profile.name}:${title}`;

            if (title && !existingTitles.has(key)) {
              const post: Post = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                title,
                subtitle: "Nouvelle sortie SoundCloud",
                date,
                artist: profile.name,
                link,
                image,
              };
              newPosts.push(post);
              existingTitles.add(key);
            }
          }
        }
      } catch (err) {
        console.error(`[releases/sync] SoundCloud fetch failed for ${profile.name}:`, err);
      }
    }

    // YouTube RSS (channel uploads)
    if (profile.youtubeChannelId) {
      try {
        const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${profile.youtubeChannelId}`;
        const res = await fetch(rssUrl, {
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "GrandeMaisonBot/1.0" },
        });
        if (res.ok) {
          const xml = await res.text();
          const parsed = parser.parse(xml);
          const entries: unknown[] = parsed?.feed?.entry ?? [];
          const list = Array.isArray(entries) ? entries : [entries];

          for (const entry of list.slice(0, 5) as Array<Record<string, unknown>>) {
            const title = String(entry["title"] ?? "");
            const link = String((entry["link"] as Record<string, string>)?.["@_href"] ?? "");
            const published = String(entry["published"] ?? "");
            const mediaGroup = entry["media:group"] as Record<string, unknown> | undefined;
            const mediaThumbnail = mediaGroup?.["media:thumbnail"] as Record<string, string> | undefined;
            const thumbnail = mediaThumbnail?.["@_url"] ?? profile.image ?? "";
            const date = published
              ? new Date(published).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0];
            const key = `${profile.name}:${title}`;

            if (title && !existingTitles.has(key)) {
              const post: Post = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                title,
                subtitle: "Nouvelle vidéo YouTube",
                date,
                artist: profile.name,
                link,
                image: thumbnail,
              };
              newPosts.push(post);
              existingTitles.add(key);
            }
          }
        }
      } catch (err) {
        console.error(`[releases/sync] YouTube fetch failed for ${profile.name}:`, err);
      }
    }
  }

  if (newPosts.length > 0) {
    const allPosts = [...newPosts, ...existingPosts];
    allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    savePosts(allPosts);
  }

  return NextResponse.json({
    status: "success",
    message: `${newPosts.length} nouvelle(s) sortie(s) synchronisée(s).`,
    count: newPosts.length,
    added: newPosts.map((p) => ({ title: p.title, artist: p.artist })),
  });
}
