"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation"; // 리다이렉트를 위해 추가
import styles from "./Header.module.css";

export default function Header() {
  const router = useRouter();
  // 1. 초기값은 false로 설정합니다.
  const [isLoggedIn, setIsLoggedIn] = useState(false); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 2. 컴포넌트 마운트 시 토큰 존재 여부를 확인하여 로그인 상태를 설정합니다.
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  // 외부 클릭 감지 로직 (기존 유지)
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

  // 3. 로그아웃 함수: 토큰을 삭제하고 상태를 변경합니다.
  const handleLogout = () => {
    localStorage.removeItem("accessToken"); // 토큰 삭제
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
                <Link href="/mypage" className={styles.dropdownItem} onClick={() => setIsDropdownOpen(false)}>
                  마이페이지
                </Link>
                <button 
                  className={styles.dropdownItem}
                  onClick={handleLogout} // 수정된 로그아웃 함수 연결
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