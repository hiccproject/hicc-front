"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchSignupInfo } from "@/lib/api/auth";
import { setTokens } from "@/lib/auth/tokens";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const run = async () => {
      const accessToken = params.get("accessToken");
      const refreshToken = params.get("refreshToken");
      const tempUserKeyFromQuery = params.get("tempUserKey");

      if (!accessToken || !refreshToken) {
        router.replace("/login");
        return;
      }

      setTokens({ accessToken, refreshToken });

      if (tempUserKeyFromQuery) {
        localStorage.setItem("tempUserKey", tempUserKeyFromQuery);
      }

      try {
        const info = await fetchSignupInfo();
        const email = info.email?.trim() ?? "";
        const name = info.name?.trim() ?? "";
        const tempUserKey = info.tempUserKey ?? tempUserKeyFromQuery;

        if (email) {
          localStorage.setItem("google_signup_email", email);
        }
        if (name) {
          localStorage.setItem("google_signup_name", name);
        }
        if (tempUserKey) {
          localStorage.setItem("tempUserKey", tempUserKey);
        }

        if (!cancelled) {
          router.replace(tempUserKey ? "/google-signup" : "/");
        }
      } catch {
        if (!cancelled) {
          router.replace(tempUserKeyFromQuery ? "/google-signup" : "/");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return <div>구글 로그인 처리 중...</div>;
}
