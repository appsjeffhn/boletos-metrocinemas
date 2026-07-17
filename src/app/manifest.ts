import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Boletos Metrocinemas",
    short_name: "Boletos",
    description: "Gestión de boletos digitales de Metrocinemas",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8fb",
    theme_color: "#09142e",
    // Next's Manifest type only accepts a single `purpose` keyword (unlike the
    // raw spec, which allows a space-separated list like "any maskable"), so
    // each size is listed twice — once per purpose — to get the same effect.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
