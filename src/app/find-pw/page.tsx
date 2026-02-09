"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./find-pw.module.css";
import Header from "../../components/Header";
import { resetMemberPassword } from "@/lib/api/auth";
import { sendVerificationMail, verifyMailCode } from "@/lib/api/mail";

export default function FindPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [isMailSent, setIsMailSent] = useState(false);
  const [isMailVerified, setIsMailVerified] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsMailSent(false);
    setIsMailVerified(false);
    setCode("");
  }, [email]);

  const passwordMatch = newPassword.length > 0 && newPassword === newPassword2;
  const canSubmit = isMailVerified && newPassword.length >= 8 && passwordMatch;

  const helperText = useMemo(() => {
    if (!newPassword.length && !newPassword2.length) return "";
    if (newPassword.length < 8) return "비밀번호는 8자 이상이어야 합니다.";
    if (!passwordMatch) return "비밀번호가 일치하지 않습니다.";
    return "";
  }, [newPassword, newPassword2, passwordMatch]);

  async function onSendMail() {
    if (!email || !email.includes("@")) {
      alert("이메일을 올바르게 입력해주세요.");
      return;
    }
    if (isSending) return;

    setIsSending(true);
    try {
      const res = await sendVerificationMail(email);
      const msg = typeof res === "object" && res?.message ? res.message : res;
      alert(msg || "인증번호가 발송되었습니다.");
      setIsMailSent(true);
      setIsMailVerified(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "메일 발송에 실패했습니다.");
    } finally {
      setIsSending(false);
    }
  }

  async function onVerifyCode() {
    if (!code) {
      alert("인증번호를 입력해주세요.");
      return;
    }
    if (!email || !email.includes("@")) {
      alert("이메일을 올바르게 입력해주세요.");
      return;
    }
    if (isVerifying) return;

    setIsVerifying(true);
    try {
      const res = await verifyMailCode(email, code);
      const msg = typeof res === "object" && res?.message ? res.message : res;
      alert(msg || "인증에 성공했습니다.");
      setIsMailVerified(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "인증에 실패했습니다.");
      setIsMailVerified(false);
    } finally {
      setIsVerifying(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      alert("인증과 비밀번호를 다시 확인해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetMemberPassword({ email, code, newPassword });
      alert("비밀번호가 재설정되었습니다. 로그인해주세요.");
      router.push("/login");
    } catch (error) {
      alert(error instanceof Error ? error.message : "비밀번호 재설정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />

        <section className={styles.body}>
          <form className={styles.form} onSubmit={onSubmit}>
            <h2 className={styles.title}>비밀번호 재설정</h2>

            <div className={styles.field}>
              <label className={styles.label}>이메일</label>
              <div className={styles.inputWithButton}>
                <input
                  type="email"
                  className={styles.input}
                  placeholder="이메일을 입력해주세요."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isMailVerified}
                />
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={onSendMail}
                  disabled={isSending}
                >
                  {isSending ? "발송 중..." : "인증번호 발송"}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>인증번호</label>
              <div className={styles.inputWithButton}>
                <input
                  className={styles.input}
                  placeholder="인증번호를 입력해주세요."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={!isMailSent || isMailVerified}
                />
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={onVerifyCode}
                  disabled={!isMailSent || isVerifying || isMailVerified}
                >
                  {isMailVerified ? "인증 완료" : isVerifying ? "확인 중..." : "인증 확인"}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>새 비밀번호</label>
              <input
                type="password"
                className={styles.input}
                placeholder="새 비밀번호 (8자 이상)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>새 비밀번호 확인</label>
              <input
                type="password"
                className={styles.input}
                placeholder="새 비밀번호 확인"
                value={newPassword2}
                onChange={(e) => setNewPassword2(e.target.value)}
              />
              {helperText && <p className={styles.helper}>{helperText}</p>}
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? "재설정 중..." : "비밀번호 재설정"}
            </button>

            <div className={styles.footerLinks}>
              <Link href="/login">로그인으로 돌아가기</Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
