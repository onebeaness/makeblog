import type { Metadata } from "next";
import { Noto_Sans_KR, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/site-header";

const sans = Noto_Sans_KR({
  variable: "--font-sans-kr",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Devlog",
  description: "글을 쓰고 읽는 최소한의 블로그.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans leading-relaxed">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">{children}</main>
        <footer className="border-t border-rule">
          <div className="mx-auto max-w-2xl px-6 py-6 font-mono text-xs text-ink-faint">
            그레이스케일 개발자 블로그 · MVP
          </div>
        </footer>
      </body>
    </html>
  );
}
