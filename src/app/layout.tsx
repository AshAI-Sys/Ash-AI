// @ts-nocheck
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./modern-globals.css";
import Providers from './providers';
import ClientErrorBoundary from '@/components/ClientErrorBoundary';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: "ASH AI - Apparel Smart Hub | AI-Powered Manufacturing ERP",
  description: "Revolutionary AI-powered ERP system for apparel manufacturing. Complete end-to-end coverage from design to delivery with intelligent automation, real-time insights, and seamless workflow management.",
  keywords: ["apparel manufacturing", "ERP system", "AI-powered", "production management", "textile manufacturing", "smart manufacturing"],
  authors: [{ name: "ASH AI Team" }],
  creator: "ASH AI",
  publisher: "Apparel Smart Hub",
  icons: {
    icon: '/Ash-AI.png',
    apple: '/Ash-AI.png',
    shortcut: '/Ash-AI.png',
  },
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: "ASH AI - Revolutionary Apparel Manufacturing ERP",
    description: "Transform your apparel manufacturing with AI-powered insights, automated workflows, and real-time production tracking.",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/Ash-AI.png",
        width: 300,
        height: 300,
        alt: "ASH AI - Apparel Smart Hub Logo"
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ASH AI - Smart Apparel Manufacturing",
    description: "AI-powered ERP revolutionizing apparel manufacturing workflows",
    images: ["/ash-ai-logo-hero.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
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
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ASH AI" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script src="/register-sw.js" defer></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: '#f9fafb', color: '#111827' }}
      >
        <ClientErrorBoundary>
          <Providers>
            {children}
          </Providers>
        </ClientErrorBoundary>
      </body>
    </html>
  );
}
