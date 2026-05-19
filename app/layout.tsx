import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import OfflineBanner from "@/components/OfflineBanner";
import PwaRegister from "@/components/PwaRegister";
import RouteWarmup from "@/components/RouteWarmup";
import SmoothAnchorScroll from "@/components/SmoothAnchorScroll";
import TrafficTracker from "@/components/TrafficTracker";
import { AuthProvider } from "@/hooks/useAuth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "FocusForge",
  description: "Quiet focus. Real progress.",
  applicationName: "FocusForge",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/focusforge-logo.png",
    shortcut: "/icons/focusforge-logo.png",
    apple: "/icons/focusforge-logo.png"
  },
  appleWebApp: {
    capable: true,
    title: "FocusForge",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#C9A46C"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('focusforge-theme')||'light';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}"
          }}
        />
      </head>
      <body className={geistSans.variable}>
        <GoogleAnalytics />
        <AuthProvider>
          <PwaRegister />
          <RouteWarmup />
          <SmoothAnchorScroll />
          <TrafficTracker />
          <OfflineBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
