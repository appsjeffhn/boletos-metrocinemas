import type { Metadata, Viewport } from "next";
import { Work_Sans } from "next/font/google";
import { RegisterSW } from "@/components/RegisterSW";
import { InstallPWA } from "@/components/InstallPWA";
import "./globals.css";

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Boletos Metrocinemas",
  description: "Gestión de boletos digitales de Metrocinemas",
  appleWebApp: {
    capable: true,
    title: "Boletos",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09142e",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${workSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <RegisterSW />
        <InstallPWA />
      </body>
    </html>
  );
}
