import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "CityMood — Live Emotional Pulse of Cities",
  description: "Real-time mood monitoring across 12 global cities. Powered by Reddit sentiment, weather, and news signals.",
  openGraph: {
    title: "CityMood — Live Emotional Pulse of Cities",
    description: "Real-time mood monitoring across 12 global cities.",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "CityMood",
    description: "Real-time mood monitoring across 12 global cities.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{__html: `
          window.addEventListener('error', function(e) {
            if (e.message && e.message.includes('MetaMask')) e.stopImmediatePropagation()
          })
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
