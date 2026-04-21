import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

/** Gowun Dodum·Jua는 next/font에 korean 서브셋이 없어 globals.css @import로 로드합니다. */
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SMITE — 칼바람 증강 추천",
  description: "조합과 상황에 맞는 증강을 빠르게 골라 드립니다.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${mono.variable} min-h-screen font-sans antialiased text-zinc-900`}>
        {children}
      </body>
    </html>
  );
}
