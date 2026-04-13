import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import { MantineProvider, ColorSchemeScript } from '@mantine/core'


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SalesMessage Analytics",
  description: "Total outbound and inbound of calls and messages",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ColorSchemeScript/>
      </head>
      <body className="min-h-full flex flex-col"><MantineProvider>{children}</MantineProvider></body>
    </html>
  );
}
