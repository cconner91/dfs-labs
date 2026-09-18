import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DFS Labs",
    short_name: "DFS Labs",
    description: "Weekly DFS lineup strategy, bankroll discipline, and ROI tracking.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#070b0a",
    theme_color: "#070b0a",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
