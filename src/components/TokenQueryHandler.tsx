"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { setTokens } from "@/lib/auth/tokens";

export default function TokenQueryHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  useEffect(() => {
    const accessToken = sp.get("accessToken");
    const refreshToken = sp.get("refreshToken");

    if (!accessToken && !refreshToken) return;

    // 1) 저장
    setTokens({
      accessToken: accessToken ?? undefined,
      refreshToken: refreshToken ?? undefined,
    });

    // 2) 주소창 토큰 제거(다른 쿼리는 유지)
    const next = new URLSearchParams(sp.toString());
    next.delete("accessToken");
    next.delete("refreshToken");

    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [sp, router, pathname]);

  return null;
}
