import Header from "@/components/Header";
import RandomCardWall from "@/components/RandomCardWall";
import styles from "./page.module.css";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />

        <section className={styles.hero}>
          {/* 왼쪽: 랜덤 명함 영역 */}
          <div className={styles.heroLeft}>
            <RandomCardWall />
          </div>

          {/* 오른쪽: 설명 + 버튼 */}
          <div className={styles.heroRight}>
            <h1 className={styles.title}>One Page Me</h1>

            <p className={styles.subtitle}>
              나를 설명하는 단 하나의 페이지,
              <br />
              포트폴리오를 간결하게 보여주는 디지털 명함 서비스
            </p>

            <div className={styles.ctaRow}>
              <Link href="/create" className={`${styles.btn} ${styles.btnPrimary}`}>
                명함 만들기
              </Link>
              <Link href="/explore" className={`${styles.btn} ${styles.btnGhost}`}>
                둘러보기
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
