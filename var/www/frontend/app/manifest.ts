import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GRANDE MAISON — Radio",
    short_name: "GRANDE MAISON",
    description: "Radio en direct du collectif GRANDE MAISON. Écoutez en continu.",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#000000",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/images/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    categories: ["music", "entertainment"],
    lang: "fr",
  };
}
