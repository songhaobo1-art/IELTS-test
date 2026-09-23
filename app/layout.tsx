import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "雅思冲刺 · 练习簿",
  description: "IELTS 阅读与听力训练，自动保存进度并整理错题。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}

