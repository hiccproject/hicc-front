// src/app/layout.tsx
//
// RootLayout
// - Next.js App Router의 최상위 레이아웃
// - 모든 페이지를 감싸는 공통 구조
// - 전역 CSS 적용
// - 메타데이터 설정
// - 로그인(OAuth 등) 후 쿼리 파라미터에 실린 토큰을 처리하는 TokenQueryHandler 포함
//
// 이 파일에서 중요한 설계 포인트
// 1) metadata는 Server Component 영역에서만 정의 가능
//    - SEO/기본 타이틀/설명 관리
// 2) RootLayout은 기본적으로 Server Component
//    - 여기서는 "use client"를 쓰지 않음
//    - 대신 클라이언트 동작이 필요한 부분(TokenQueryHandler)을 별도 Client Component로 분리
// 3) TokenQueryHandler는 모든 페이지에서 한 번씩 실행되도록 최상단에 배치
//    - OAuth 리다이렉트 후 accessToken을 쿼리에서 읽어 localStorage에 저장하는 역할로 추정

import type { Metadata } from "next";
import "./globals.css";
import TokenQueryHandler from "@/components/TokenQueryHandler";

export const metadata: Metadata = {
  title: "OnePageMe",
  description: "One page portfolio service",
  // 확장 가능:
  // openGraph, twitter, icons 등 추가 가능
  // SEO를 강화하려면 페이지별 metadata 분리도 고려 가능
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {/* 
          TokenQueryHandler
          ------------------
          목적:
          - 로그인(OAuth 등) 성공 후 URL 쿼리 파라미터에 담긴
            accessToken/refreshToken 등을 파싱하여 localStorage에 저장
          - 저장 후 쿼리를 제거하거나 리다이렉트 처리
          
          왜 여기 두는가?
          - 모든 페이지에서 공통으로 실행되도록 하기 위함
          - OAuth 콜백 경로가 특정 페이지가 아니어도 처리 가능

          주의:
          - TokenQueryHandler는 반드시 Client Component여야 함
            (useEffect, window.location, localStorage 접근 등)
        */}
        <TokenQueryHandler />

        {/* 
          children
          --------
          실제 페이지 컴포넌트가 여기 렌더링됨
          - page.tsx
          - /login
          - /create
          - /portfolio 등
        */}
        {children}
      </body>
    </html>
  );
}