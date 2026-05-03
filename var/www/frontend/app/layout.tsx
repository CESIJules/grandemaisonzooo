import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GRANDE MAISON",
  description: "Maison de disque, label et collectif d'artistes indépendants",
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      </head>
      <body>{children}</body>
    </html>
  );
}
