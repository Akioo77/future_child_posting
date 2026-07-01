import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Future Child Posting — 儿童隐私风险检测",
  description: "AI 辅助家长识别社交媒体分享孩子内容时的隐私风险",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}