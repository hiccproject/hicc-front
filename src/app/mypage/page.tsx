"use client";

import Header from "@/components/Header";
import Link from "next/link";
import styles from "./mypage.module.css";

export default function MyPage() {
  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />

        <div className={styles.pageTitleArea}>
          <h1 className={styles.pageTitle}>마이페이지</h1>
        </div>

        <section className={styles.container}>
          {/* 왼쪽 섹션: 상세 프로필 카드 */}
          <aside className={styles.profileCard}>
            <div className={styles.avatarCircle} />
            <h2 className={styles.profileName}>홍길동</h2>
            <p className={styles.profileBio}>한줄소개 or 요약</p>

            <ul className={styles.detailList}>
              <li className={styles.detailItem}>
                <span className={styles.iconBox} /> 분야
              </li>
              <li className={styles.detailItem}>
                <span className={styles.iconBox} /> 위치
              </li>
              <li className={styles.detailItem}>
                <span className={styles.iconBox} /> 010-1234-1234
              </li>
              <li className={styles.detailItem}>
                <span className={styles.iconBox} /> hgd@gmail.com
              </li>
            </ul>

            <button className={styles.editBtn}>프로필 정보 편집</button>
          </aside>

          {/* 오른쪽 섹션: 통계 및 명함 관리 */}
          <div className={styles.dashboard}>
            {/* 조회 통계 */}
            <article className={styles.statsBox}>
              <div className={styles.statsHeader}>
                <h3 className={styles.boxTitle}>조회 통계</h3>
                <span className={styles.statsCount}>0</span>
              </div>
              <div className={styles.graphArea}>
                <svg viewBox="0 0 400 100" className={styles.svgGraph}>
                  <path
                    d="M0,80 L80,85 L160,50 L240,40 L320,60 L400,80"
                    fill="none"
                    stroke="#555"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </article>

            {/* 내 명함 관리 (클릭 시 지원자 포폴 페이지로 이동) */}
            <Link href="/portfolio" className={styles.cardManageBox}>
              <div className={styles.cardManageHeader}>
                <h3 className={styles.boxTitle}>내 명함</h3>
                <span className={styles.navArrow}>&gt;</span>
              </div>
              
              <div className={styles.tagRow}>
                <span className={styles.tag}>태그 01</span>
                <span className={styles.tag}>태그 01</span>
                <span className={styles.tag}>태그 01</span>
              </div>

              <div className={styles.linkList}>
                <div className={styles.linkItem}>링크</div>
                <div className={styles.linkItem}>링크</div>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}