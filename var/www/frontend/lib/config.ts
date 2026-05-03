// Centralised environment configuration — single source of truth for all env vars.
// Throws at startup if required variables are missing.

function required(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`[GMZ] Variable d'environnement requise manquante : ${name}`);
  }
  return val;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const config = {
  // Auth
  sessionSecret: required("SESSION_SECRET"),
  cronSecret: optional("CRON_SECRET", ""),
  liquidsoapToken: optional("LIQUIDSOAP_TOKEN", ""),

  // Icecast
  icecastUrl: optional("ICECAST_URL", "http://localhost:8000/status-json.xsl"),

  // Liquidsoap telnet
  liquidsoapHost: optional("LIQUIDSOAP_HOST", "127.0.0.1"),
  liquidsoapPort: parseInt(optional("LIQUIDSOAP_PORT", "1234"), 10),

  // Filesystem paths (overridable for local dev via DATA_ROOT)
  analyticsDb: optional("ANALYTICS_DB_PATH", "/var/www/data/analytics.db"),
  musicDir: optional("MUSIC_DIR", "/home/radio/musique"),

  // Runtime
  isDev: process.env.NODE_ENV !== "production",
} as const;
