import type { Metadata, Viewport } from "next";
import "./globals.css";

const BASE_URL = "https://grandemaisonzoo.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "GRANDE MAISON — Radio & Collectif Artistique",
    template: "%s | GRANDE MAISON",
  },
  description:
    "GRANDE MAISON — maison de disque indépendante, label, collectif d'artistes et radio en ligne. Découvrez nos artistes, nos sorties et écoutez notre radio en direct.",
  keywords: [
    "grande maison",
    "radio indépendante",
    "label musical",
    "collectif artistes",
    "musique électronique",
    "grande maison zoo",
  ],
  authors: [{ name: "GRANDE MAISON", url: BASE_URL }],
  creator: "GRANDE MAISON",
  publisher: "GRANDE MAISON",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: BASE_URL,
    siteName: "GRANDE MAISON",
    title: "GRANDE MAISON — Radio & Collectif Artistique",
    description:
      "Maison de disque indépendante, label et collectif d'artistes. Radio en direct 24h/24.",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "GRANDE MAISON",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GRANDE MAISON — Radio & Collectif Artistique",
    description: "Maison de disque indépendante, label et collectif d'artistes. Radio en direct.",
    images: ["/images/og-image.jpg"],
  },
  alternates: {
    canonical: BASE_URL,
    types: {
      "application/rss+xml": `${BASE_URL}/feed.xml`,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: "GRANDE MAISON",
    url: BASE_URL,
    description:
      "Maison de disque indépendante, label et collectif d'artistes. Radio en direct 24h/24.",
    genre: ["Électronique", "Expérimental", "Indépendant"],
    logo: {
      "@type": "ImageObject",
      url: `${BASE_URL}/images/og-image.jpg`,
    },
    sameAs: [],
  };

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;700&family=Outfit:wght@400;500;700&family=Lexend:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
        <link rel="preload" href="/font/Syne-ExtraBoldGMZV4.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link rel="preload" href="/font/Syne-BoldGMZV3.ttf" as="font" type="font/ttf" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
