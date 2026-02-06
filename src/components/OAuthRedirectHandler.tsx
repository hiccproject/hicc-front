"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setTokens } from "@/lib/auth/tokens";

export default function OAuthRedirectHandler() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const accessToken = sp.get("accessToken");
    const refreshToken = sp.get("refreshToken");
    const tempUserKey = sp.get("tempUserKey");

    if (!accessToken || !refreshToken) return;

    // 1) 토큰 저장 (✅ tokenType 제거)
    setTokens({ accessToken, refreshToken });

    // 2) 분기
    if (tempUserKey) {
      localStorage.setItem("tempUserKey", tempUserKey);
      router.replace("/oauth-agree");
      return;
    }

    router.replace("/login-success");
  }, [router, sp]);

  return null;
}
