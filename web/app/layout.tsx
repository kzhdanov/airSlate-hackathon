import type { Metadata } from "next";
import { Zilla_Slab } from "next/font/google";
import "./globals.css";

// Slab serif for display / headings — the "wanted-poster" frontier feel.
const zillaSlab = Zilla_Slab({
  variable: "--font-zilla-slab",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Agreement Builder",
  description: "Turn a two-party correspondence PDF into a ready-to-sign contract",
  icons: { icon: "/handshake.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${zillaSlab.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
