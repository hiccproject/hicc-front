import Link from "next/link";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brandLink}>
        <span className={styles.box} aria-hidden="true" />
        <span className={styles.brand}>onepageme</span>
      </Link>

      <nav className={styles.nav}>
        <Link href="/signup" className={styles.navLink}>
          회원가입
        </Link>
        <Link href="/login" className={styles.navLink}>
          로그인
        </Link>
      </nav>
    </header>
  );
}
