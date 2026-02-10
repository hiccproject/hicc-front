"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./Header.module.css";
import { clearTokens, getAccessToken } from "@/lib/auth/tokens";

const DEFAULT_PROFILE_IMG = "/default-avatar.png";

export default function Header() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [profileImg, setProfileImg] = useState<string>(DEFAULT_PROFILE_IMG);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // 토큰/프로필 동기화 함수
  const syncAuthState = useCallback(() => {
    const token = getAccessToken();
    setIsLoggedIn(!!token);

    const savedProfileImg = localStorage.getItem("profileImg");
    setProfileImg(savedProfileImg || DEFAULT_PROFILE_IMG);
  }, []);

  // 1) 최초 마운트 + 2) auth-changed(같은 탭) + 3) storage(다른 탭) 동기화
  useEffect(() => {
    syncAuthState();

    const handleAuthChanged = () => syncAuthState();
    const handleStorage = (e: StorageEvent) => {
      // accessToken/refreshToken/profileImg 변경 시에만 반영
      if (e.key === "accessToken" || e.key === "refreshToken" || e.key === "profileImg") {
        syncAuthState();
      }
    };

    window.addEventListener("auth-changed", handleAuthChanged);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, [syncAuthState]);

  // 외부 클릭 감지 로직
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // 로그아웃
  const handleLogout = () => {
    clearTokens();
    // 같은 탭에서도 Header가 즉시 반영되도록 커스텀 이벤트 발생
    window.dispatchEvent(new Event("auth-changed"));

    setIsDropdownOpen(false);
    alert("로그아웃 되었습니다.");
    router.push("/");
  };

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brandLink}>
        <Image
          src="/logo.png"
          alt="OnePageMe 로고"
          width={30}
          height={22}
          className={styles.logo}
          priority
        />
        <span className={styles.brand}>onepageme</span>
      </Link>

      <nav className={styles.nav}>
        {!isLoggedIn ? (
          <>
            <Link href="/login" className={styles.navLink}>
              로그인
            </Link>
          </>
        ) : (
          <div className={styles.profileContainer} ref={dropdownRef}>
            <button
              className={styles.profileCircle}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-label="사용자 메뉴"
              style={{ backgroundImage: `url(${profileImg})` }}
            />

            {isDropdownOpen && (
              <div className={styles.dropdown}>
                <Link
                  href="/mypage"
                  className={styles.dropdownItem}
                  onClick={() => setIsDropdownOpen(false)}
                >
                  마이페이지
                </Link>

                <Link
                  href="/cards"
                  className={styles.dropdownItem}
                  onClick={() => setIsDropdownOpen(false)}
                >
                  내 명함 목록
                </Link>

                <button className={styles.dropdownItem} onClick={handleLogout}>
                  로그아웃
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
