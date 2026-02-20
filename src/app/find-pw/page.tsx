// src/app/find-pw/page.tsx (또는 src/app/find-pw/page.tsx 경로에 해당하는 파일)
//
// 비밀번호 재설정 페이지
// - 이메일 인증(인증번호 발송 → 인증번호 확인) 후 새 비밀번호로 재설정하는 화면
//
// 전체 흐름
// 1) 사용자가 이메일 입력 → "인증번호 발송" 클릭(sendVerificationMail)
// 2) 이메일로 받은 인증번호 입력 → "인증 확인" 클릭(verifyMailCode)
// 3) 인증 성공 상태(isMailVerified=true) + 비밀번호 정책 통과 + 2차 입력 일치
//    → "비밀번호 재설정" 제출(resetMemberPassword)
//
// 상태 설계 포인트
// - isMailSent: 메일 발송 완료 여부(인증번호 입력칸 활성화 기준)
// - isMailVerified: 인증 완료 여부(이메일 변경 잠금, 제출 가능 여부의 핵심 조건)
// - isSending/isVerifying/isSubmitting: 각각의 비동기 동작 중복 실행 방지
//
// 검토/개선 여지(중요)
// A) resetMemberPassword에 code를 보내는 구조라면, verifyMailCode는 UI 선검증 용도
//    - verifyMailCode가 없어도 서버에서 reset 요청 시 code 검증을 할 수 있음
//    - 지금 구조는 UX(미리 인증 완료 표시) 측면에서 괜찮지만 API가 두 번 호출됨
// B) email 형식 검증이 includes("@")로만 되어 있음
//    - 간단히 막는 수준으로는 OK지만, 실제로는 더 정확한 정규식 사용이 안정적
// C) helperText 계산에서 length(8~20) 체크와 policy 체크가 중복될 수 있음
//    - 현재도 동작은 문제 없고, 사용자 안내 문구 우선순위가 명확하다는 장점이 있음

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

  // 입력 상태
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  // 인증 단계 상태
  const [isMailSent, setIsMailSent] = useState(false);
  const [isMailVerified, setIsMailVerified] = useState(false);

  // 비동기 동작 상태(중복 클릭 방지 + 버튼 라벨 변경)
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 이메일이 바뀌면 기존 인증 과정은 모두 무효로 처리
  // - 다른 이메일로 바꿨는데 "인증 완료" 상태가 남아있는 것을 방지
  useEffect(() => {
    setIsMailSent(false);
    setIsMailVerified(false);
    setCode("");
  }, [email]);

  // 비밀번호 정책/일치 여부
  const passwordMatch = newPassword.length > 0 && newPassword === newPassword2;

  // 비밀번호 정책: 8~20자 + 대문자/소문자/숫자/특수문자 포함
  const passwordPolicy =
    /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,20}$/;

  const isPasswordValid = passwordPolicy.test(newPassword);

  // 제출 가능 조건: 메일 인증 완료 + 비밀번호 정책 통과 + 2차 입력 일치
  const canSubmit = isMailVerified && isPasswordValid && passwordMatch;

  // 사용자에게 보여줄 안내 문구(우선순위 기반)
  // - 아무 것도 입력 안 했으면 빈 문자열
  // - 길이 범위 위반 → 정책 위반 → 불일치 순으로 안내
  const helperText = useMemo(() => {
    if (!newPassword.length && !newPassword2.length) return "";
    if (newPassword.length < 8 || newPassword.length > 20)
      return "비밀번호는 8~20자여야 합니다.";
    if (!isPasswordValid)
      return "비밀번호는 대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다.";
    if (!passwordMatch) return "비밀번호가 일치하지 않습니다.";
    return "";
  }, [newPassword, newPassword2, passwordMatch, isPasswordValid]);

  // 인증번호 발송
  async function onSendMail() {
    // 아주 최소한의 이메일 검증
    if (!email || !email.includes("@")) {
      alert("이메일을 올바르게 입력해주세요.");
      return;
    }

    if (isSending) return;

    setIsSending(true);
    try {
      await sendVerificationMail(email);
      alert("인증번호가 발송되었습니다.");

      // 발송 성공 후 상태 전환
      setIsMailSent(true);
      setIsMailVerified(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "메일 발송에 실패했습니다.");
    } finally {
      setIsSending(false);
    }
  }

  // 인증번호 확인
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

      // 응답 형식이 string 또는 {message: ...}일 수 있어 둘 다 대응
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

  // 비밀번호 재설정 제출
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 화면에서 계산한 조건을 통과하지 못하면 제출을 막음
    if (!canSubmit) {
      alert("인증과 비밀번호를 다시 확인해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      // resetMemberPassword는 서버에서 email+code 검증 후 비밀번호 변경을 수행한다고 가정
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

            {/* 이메일 입력 + 인증번호 발송 */}
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

            {/* 인증번호 입력 + 인증 확인 */}
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

            {/* 새 비밀번호 */}
            <div className={styles.field}>
              <label className={styles.label}>새 비밀번호</label>
              <input
                type="password"
                className={styles.input}
                placeholder="새 비밀번호 (비밀번호는 8~20자이며, 대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다.)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            {/* 새 비밀번호 확인 + 안내 문구 */}
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

            {/* 제출 버튼: 인증/정책 통과 전에는 비활성화 */}
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={isSubmitting || !canSubmit}
            >
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