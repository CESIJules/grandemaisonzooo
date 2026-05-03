import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Run ffprobe to get the duration of an audio file.
 * Returns duration in seconds, or null on failure.
 */
export async function getAudioDuration(
  filePath: string
): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const val = parseFloat(stdout.trim());
    return isNaN(val) ? null : val;
  } catch {
    return null;
  }
}

/**
 * Run ffprobe to extract audio metadata (title, artist, album, year).
 */
export async function getAudioMetadata(
  filePath: string
): Promise<Record<string, string>> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_format",
      filePath,
    ]);
    const parsed = JSON.parse(stdout);
    return (parsed?.format?.tags ?? {}) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Download a YouTube URL to the music directory via yt-dlp.
 * All arguments are properly escaped via execFile (no shell injection).
 */
export async function downloadYoutube(
  url: string,
  outputDir: string,
  filenameTemplate = "%(artist)s - %(title)s.%(ext)s"
): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await execFileAsync("yt-dlp", [
    "--extract-audio",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "0",
    "-o",
    `${outputDir}/${filenameTemplate}`,
    "--no-playlist",
    url,
  ]);
  return { stdout, stderr };
}

/**
 * Get Icecast listener count by parsing the XML status page.
 */
export async function getIcecastListeners(
  icecastUrl = "http://localhost:8000/status-json.xsl"
): Promise<number> {
  try {
    const res = await fetch(icecastUrl);
    const json = (await res.json()) as {
      icestats?: { source?: { listeners?: number } | Array<{ listeners?: number }> };
    };
    const src = json?.icestats?.source;
    if (!src) return 0;
    if (Array.isArray(src)) return src[0]?.listeners ?? 0;
    return (src as { listeners?: number }).listeners ?? 0;
  } catch {
    return 0;
  }
}
