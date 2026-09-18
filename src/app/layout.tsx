import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DFS Labs",
  description: "Weekly DFS lineup strategy, bankroll discipline, and ROI tracking.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon-192", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DFS Labs",
  },
};

export const viewport: Viewport = {
  themeColor: "#070b0a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
