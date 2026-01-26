"use client";

import { useState } from "react";
import Header from "@/components/Header";
import styles from "./portfolio.module.css";

type Theme = "theme01" | "theme02" | "theme03";

export default function PortfolioPage() {
  const [theme, setTheme] = useState<Theme>("theme01");
  const [isEditMode, setIsEditMode] = useState(false);

  // 사용자 데이터 (이미지의 '홍길동' 예시 반영)
  const userData = {
    name: "홍길동",
    bio: "정보여기", // 이미지의 더미 텍스트 반영
    tags: ["태그 01", "태그 01", "태그 01"],
    links: ["링크", "링크"],
  };

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />

        <section className={`${styles.container} ${styles[theme]}`}>
          {/* 상단/좌측 프로필 영역 (회색 배경 섹션) */}
          <div className={styles.profileSection}>
            <div className={styles.profileContent}>
              <div className={styles.avatarCircle} />
              <div className={styles.infoArea}>
                <h1 className={styles.name}>{userData.name}</h1>
                <p className={styles.bio}>{userData.bio}</p>
                <div className={styles.tagRow}>
                  {userData.tags.map((tag, idx) => (
                    <span key={idx} className={styles.tag}>{tag}</span>
                  ))}
                </div>
                
                {/* 이미지의 링크 입력창 부분 */}
                <div className={styles.linkInputs}>
                  {userData.links.map((link, idx) => (
                    <div key={idx} className={styles.linkField}>{link}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* 이미지 우측의 세로형 버튼 스택 (Theme 01에서 두드러짐) */}
            <div className={styles.actionStack}>
              <button className={styles.actionBtn}>미리보기</button>
              <button className={styles.actionBtn} onClick={() => {
                // 테마 순환 변경 예시
                if (theme === "theme01") setTheme("theme02");
                else if (theme === "theme02") setTheme("theme03");
                else setTheme("theme01");
              }}>테마변경</button>
              <button className={styles.actionBtn}>공유</button>
              <button 
                className={`${styles.actionBtn} ${isEditMode ? styles.active : ""}`}
                onClick={() => setIsEditMode(!isEditMode)}
              >
                {isEditMode ? "저장" : "편집"}
              </button>
            </div>
          </div>

          {/* 하단/우측 콘텐츠 카드 영역 */}
          <div className={styles.contentSection}>
            <div className={styles.contentCard}></div>
            <div className={styles.contentCard}></div>
            <div className={styles.contentCard}></div>
            {theme === "theme01" && <div className={styles.contentCard}></div>}
          </div>
        </section>
      </main>
    </div>
  );
}