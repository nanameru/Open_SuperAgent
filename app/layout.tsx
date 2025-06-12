import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ModelProvider } from "./components/ModelContext";
import dynamic from "next/dynamic";

// Conditionally import Stagewise toolbar only in development
const ClientStagewiseToolbar = dynamic(
  () => import("./components/ClientStagewiseToolbar")
);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Open-SuperAgent",
  description: "Open-SuperAgent - An open-source AI assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const showStagewise = process.env.NODE_ENV === 'development' && 
                       process.env.NEXT_PUBLIC_STAGEWISE_ENABLED === 'true';

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ModelProvider>
          {children}
          {showStagewise && <ClientStagewiseToolbar />}
        </ModelProvider>
      </body>
    </html>
  );
}
