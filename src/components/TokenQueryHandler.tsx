// src/components/TokenQueryHandler.tsx (또는 동일 경로 파일)
//
// 목적
// - OAuth 로그인(예: Google) 이후 URL 쿼리스트링에 포함된
//   accessToken, refreshToken을 추출하여 localStorage에 저장하는 역할
// - 토큰 저장 후, 주소창에서 해당 토큰 쿼리를 제거하여
//   보안 및 UX 측면에서 안전한 상태로 정리
//
// 이 컴포넌트의 성격
// - UI를 렌더링하지 않는 "사이드 이펙트 전용 컴포넌트"
// - 페이지 어디엔가 포함되어 있으면, URL에 토큰이 붙어 들어왔을 때 자동 처리
//
// 구현에서 중요한 포인트 / 주의점
// 1) 반드시 "use client"
//    - useEffect, localStorage(setTokens 내부), router.replace 등
//      브라우저 전용 API를 사용하므로 서버 컴포넌트로는 동작 불가
// 2) 쿼리에서 토큰 제거 이유
//    - 브라우저 히스토리에 토큰이 남지 않도록 하기 위함
//    - URL 공유 시 토큰이 노출되지 않도록 하기 위함
//    - 새로고침 시 저장 로직이 반복 실행되는 것을 방지
// 3) router.replace 사용 이유
//    - push가 아니라 replace를 사용해
//      "토큰이 포함된 URL"을 히스토리에 남기지 않기 위함
// 4) accessToken, refreshToken 중 하나만 존재하는 경우
//    - 둘 다 없어야만 early return
//    - 하나라도 존재하면 저장 시도 (유연성 확보)
// 5) 무한 루프 여부
//    - replace 후 토큰이 제거되므로
//      다음 렌더링에서는 early return에 걸려 추가 실행되지 않음

"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { setTokens } from "@/lib/auth/tokens";
// setTokens: localStorage에 accessToken / refreshToken을 저장하는 유틸 함수
// 내부에서 undefined는 저장하지 않도록 구현되어 있어야 안전함

export default function TokenQueryHandler() {
  const router = useRouter();
  // 라우팅 제어 (replace 사용)

  const pathname = usePathname();
  // 현재 경로 (/home, /login 등)
  // 쿼리 제거 후 동일 경로로 되돌리기 위해 필요

  const sp = useSearchParams();
  // 현재 URL의 쿼리스트링 접근
  // ReadonlyURLSearchParams이므로 직접 수정 불가 → 복사해서 사용해야 함

  useEffect(() => {
    // URL 예시:
    // /?accessToken=xxx&refreshToken=yyy

    const accessToken = sp.get("accessToken");
    const refreshToken = sp.get("refreshToken");

    // 둘 다 없으면 처리할 것이 없음
    // 왜 (!accessToken || !refreshToken)가 아닌가?
    // → 하나만 있어도 저장 시도해야 하므로
    //   "둘 다 없는 경우"에만 return 하는 것이 맞다.
    if (!accessToken && !refreshToken) return;

    // 1) 토큰 저장
    // null 대신 undefined로 넘기는 이유:
    // - setTokens 타입 안정성 유지
    // - undefined는 "저장하지 않음"의 의미로 사용 가능
    setTokens({
      accessToken: accessToken ?? undefined,
      refreshToken: refreshToken ?? undefined,
    });

    // 2) 주소창에서 토큰 제거
    // sp는 immutable이므로 복사본 생성
    const next = new URLSearchParams(sp.toString());

    next.delete("accessToken");
    next.delete("refreshToken");
    // 다른 쿼리 파라미터는 유지됨

    const qs = next.toString();

    // replace를 사용하는 이유:
    // - push를 사용하면 토큰이 포함된 URL이 히스토리에 남음
    // - replace는 현재 기록을 덮어쓰기 때문에 보안상 안전
    router.replace(qs ? `${pathname}?${qs}` : pathname);

    // 의문: dependency에 sp를 넣으면 무한 실행되지 않나?
    // → replace 이후 accessToken, refreshToken이 제거되므로
    //   다음 렌더링에서는 early return에 걸려 실행되지 않음
  }, [sp, router, pathname]);

  // UI는 렌더링하지 않음
  // 이 컴포넌트는 오직 URL 토큰 처리만 담당
  return null;
}