"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./Header.module.css";
import { clearTokens, getAccessToken } from "@/lib/auth/tokens";

export default function Header() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 컴포넌트 마운트 시 토큰 존재 여부를 확인하여 로그인 상태를 설정합니다.
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

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

  // 로그아웃 함수
  const handleLogout = () => {
    clearTokens();
    setIsLoggedIn(false);
    setIsDropdownOpen(false);
    alert("로그아웃 되었습니다.");
    router.push("/"); // 메인으로 이동
  };

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brandLink}>
        <span className={styles.box} aria-hidden="true" />
        <span className={styles.brand}>onepageme</span>
      </Link>

      <nav className={styles.nav}>
        {!isLoggedIn ? (
          <>
            <Link href="/signup" className={styles.navLink}>회원가입</Link>
            <Link href="/login" className={styles.navLink}>로그인</Link>
          </>
        ) : (
          <div className={styles.profileContainer} ref={dropdownRef}>
            <button 
              className={styles.profileCircle}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-label="사용자 메뉴"
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
                {/* [수정] href를 '/portfolio'에서 목록 페이지인 '/cards'로 변경 */}
                <Link 
                  href="/cards" 
                  className={styles.dropdownItem} 
                  onClick={() => setIsDropdownOpen(false)}
                >
                  내 명함 목록
                </Link>
                <button 
                  className={styles.dropdownItem}
                  onClick={handleLogout}
                >
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