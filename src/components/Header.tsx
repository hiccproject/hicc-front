// src/components/Header.tsx
//
// 공통 헤더 컴포넌트
// - 좌측에 로고/브랜드 링크를 보여주고, 우측에는 로그인 상태에 따라 메뉴를 분기
// - 비로그인: "로그인" 링크만 노출
// - 로그인: 프로필 원형 버튼을 누르면 드롭다운(마이페이지/내 명함 목록/로그아웃) 노출
//
// 상태 동기화 방식
// - accessToken 유무로 로그인 여부를 판단
// - profileImg는 localStorage("profileImg") 값을 사용하고, 없으면 기본 이미지 사용
// - 같은 탭: "auth-changed" 커스텀 이벤트로 즉시 동기화
// - 다른 탭: "storage" 이벤트로 동기화
//
// 드롭다운 UX
// - 프로필 버튼 클릭 시 드롭다운 토글
// - 드롭다운 열린 상태에서 바깥을 클릭하면 자동으로 닫힘
//
// 로그아웃 처리
// - clearTokens로 토큰 제거
// - 같은 탭에서도 헤더가 즉시 바뀌도록 auth-changed 이벤트 발생
// - 드롭다운 닫고 안내 후 홈으로 이동

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

  // isLoggedIn: accessToken 유무로 판단하는 로그인 상태
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // isDropdownOpen: 프로필 드롭다운 오픈 여부
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // profileImg: localStorage("profileImg") 기반, 없으면 기본 이미지
  const [profileImg, setProfileImg] = useState<string>(DEFAULT_PROFILE_IMG);

  // dropdownRef: 드롭다운 영역 바깥 클릭 감지를 위한 ref
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 토큰/프로필 동기화 함수
  // - accessToken이 있으면 로그인 상태로 판단
  // - profileImg는 localStorage에서 읽어와 반영
  // - useCallback으로 고정해 effect 의존성/리스너 등록 시 안정적으로 사용
  const syncAuthState = useCallback(() => {
    const token = getAccessToken();
    setIsLoggedIn(!!token);

    const savedProfileImg = localStorage.getItem("profileImg");
    setProfileImg(savedProfileImg || DEFAULT_PROFILE_IMG);
  }, []);

  // 최초 마운트 시 1회 동기화 + 이벤트 기반 동기화
  // - auth-changed: 같은 탭에서 로그인/로그아웃/프로필 변경 시 수동으로 dispatch하는 이벤트
  // - storage: 다른 탭에서 localStorage 값이 바뀔 때 자동으로 발생하는 이벤트
  useEffect(() => {
    syncAuthState();

    const handleAuthChanged = () => syncAuthState();

    const handleStorage = (e: StorageEvent) => {
      // auth 관련 키가 바뀌었을 때만 반영해서 불필요한 setState를 줄임
      if (
        e.key === "accessToken" ||
        e.key === "refreshToken" ||
        e.key === "profileImg"
      ) {
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

  // 드롭다운이 열려 있을 때만 바깥 클릭을 감지해서 닫는 로직
  // - 열린 상태에서만 document listener를 붙여 불필요한 이벤트 처리 비용을 줄임
  // - cleanup에서 무조건 제거해 이벤트 누수를 방지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
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
  // - 토큰 제거 후 같은 탭에서도 헤더 UI가 즉시 바뀌도록 auth-changed 발생
  // - 드롭다운 닫고 홈으로 이동
  const handleLogout = () => {
    clearTokens();
    window.dispatchEvent(new Event("auth-changed"));

    setIsDropdownOpen(false);
    alert("로그아웃 되었습니다.");
    router.push("/");
  };

  return (
    <header className={styles.header}>
      {/* 브랜드 영역: 홈으로 이동 */}
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
        {/* 비로그인: 로그인 링크만 표시 */}
        {!isLoggedIn ? (
          <Link href="/login" className={styles.navLink}>
            로그인
          </Link>
        ) : (
          // 로그인: 프로필 버튼 + 드롭다운
          <div className={styles.profileContainer} ref={dropdownRef}>
            {/* 프로필 원형 버튼
                - backgroundImage로 프로필 이미지 표현
                - 클릭 시 드롭다운 토글 */}
            <button
              className={styles.profileCircle}
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              aria-label="사용자 메뉴"
              style={{ backgroundImage: `url(${profileImg})` }}
            />

            {/* 드롭다운 메뉴 */}
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