// src/app/layout.tsx
import type { Metadata } from "next";
import TokenQueryHandler from "@/components/TokenQueryHandler";

export const metadata: Metadata = {
  title: "OnePageMe",
  description: "One page portfolio service",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {/* ✅ 로그인 성공 후 쿼리 토큰 처리 */}
        <TokenQueryHandler />
        {children}
      </body>
    </html>
  );
}
