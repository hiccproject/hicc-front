"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./signup.module.css";
import Header from "../../components/Header";
import Modal from "../../components/Modal";
import ConfirmModal from "../../components/ConfirmModal";
import { signupMember } from "@/lib/api/auth";
import { sendVerificationMail, verifyMailCode } from "@/lib/api/mail";
import { setStoredNameForEmail, setStoredProfile } from "../../lib/auth/profile";

type DomainOption = "gmail.com" | "naver.com" | "nate.com" | "hanmail.net" | "custom";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [domain, setDomain] = useState<DomainOption>("gmail.com");
  const [customDomain, setCustomDomain] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // 이메일 인증 관련 상태
  const [isMailSent, setIsMailSent] = useState(false);
  const [isMailVerified, setIsMailVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [openModal, setOpenModal] = useState<null | "terms" | "privacy">(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);

  const selectedDomain = domain === "custom" ? customDomain : domain;

  const fullEmail = useMemo(() => {
    if (!emailId) return "";
    if (!selectedDomain) return `${emailId}@`;
    return `${emailId}@${selectedDomain}`;
  }, [emailId, selectedDomain]);

  useEffect(() => {
    setIsMailSent(false);
    setIsMailVerified(false);
    setVerificationCode("");
  }, [emailId, domain, customDomain]);

  const passwordMatch = password.length > 0 && password === password2;
  const canSubmit =
    name.trim().length > 0 &&
    emailId.trim().length > 0 &&
    selectedDomain.trim().length > 0 &&
    isMailVerified &&
    password.length >= 8 &&
    passwordMatch &&
    agreeTerms &&
    agreePrivacy;

  async function onSendMail() {
    if (!fullEmail || !emailId || !selectedDomain) {
      alert("이메일을 올바르게 입력해주세요.");
      return;
    }
    if (isSending) return;

    setIsSending(true);
    try {
      await sendVerificationMail(fullEmail);
      alert("인증번호가 발송되었습니다.");
      setIsMailSent(true);
      setIsMailVerified(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "메일 발송 실패");
    } finally {
      setIsSending(false);
    }
  }

  async function onVerifyCode() {
    if (!verificationCode) {
      alert("인증번호를 입력해주세요.");
      return;
    }
    try {
      const res = await verifyMailCode(fullEmail, verificationCode);
      const msg = typeof res === "object" && res.message ? res.message : res;
      alert(msg || "인증에 성공하였습니다!");
      setIsMailVerified(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "인증 실패");
      setIsMailVerified(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      await signupMember({
        name,
        email: fullEmail,
        password,
        passwordConfirm: password2,
        termsAgreed: agreeTerms,
      });
      setStoredProfile({ name, email: fullEmail, password });
      setStoredNameForEmail(fullEmail, name);
      alert("회원가입이 완료되었습니다.");
      router.push("/");
    } catch (error) {
      alert(error instanceof Error ? error.message : "회원가입 실패");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />
        <section className={styles.body}>
          <h1 className={styles.pageTitle}>회원가입</h1>

          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.row}>
              <label className={styles.label}>이름</label>
              <input
                className={styles.input}
                placeholder="이름을 입력해주세요."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* 이메일 입력 영역 */}
            <div className={styles.row}>
              <label className={styles.label}>이메일 (아이디)</label>
              
              {/* inputGroup: 입력란과 버튼을 감싸는 컨테이너 */}
              <div className={styles.inputGroup}>
                <div className={styles.emailWrap}>
                  <input
                    className={styles.input}
                    placeholder="이메일"
                    value={emailId}
                    onChange={(e) => setEmailId(e.target.value)}
                    disabled={isMailVerified}
                  />
                  <span className={styles.at}>@</span>
                  {domain === "custom" ? (
                    <input
                      className={`${styles.input} ${styles.domainInput}`}
                      placeholder="직접 입력"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      disabled={isMailVerified}
                    />
                  ) : (
                    <div className={styles.domainBox}>
                      <span className={styles.domainText}>{domain}</span>
                    </div>
                  )}
                  <select
                    className={styles.select}
                    value={domain}
                    onChange={(e) => {
                      const next = e.target.value as DomainOption;
                      setDomain(next);
                      if (next !== "custom") setCustomDomain("");
                    }}
                    disabled={isMailVerified}
                  >
                    <option value="gmail.com">gmail.com</option>
                    <option value="naver.com">naver.com</option>
                    <option value="nate.com">nate.com</option>
                    <option value="hanmail.net">hanmail.net</option>
                    <option value="custom">직접 입력</option>
                  </select>
                </div>

                {/* 인증 요청 버튼 (입력란 아래에 배치) */}
                {!isMailVerified && (
                  <button
                    type="button"
                    className={`${styles.btnSmall} ${styles.btnOutline} ${styles.fullWidthBtn}`}
                    onClick={onSendMail}
                    disabled={isSending}
                  >
                    {isSending ? "발송 중..." : isMailSent ? "인증번호 재전송" : "인증번호 전송"}
                  </button>
                )}
                
                {isMailVerified && (
                  <div className={styles.verifiedMsg}>✓ 이메일 인증이 완료되었습니다.</div>
                )}
                
                <div className={styles.helper}>
                  {fullEmail && !isMailVerified ? `입력된 이메일: ${fullEmail}` : ""}
                </div>
              </div>
            </div>

            {/* 인증번호 입력란 (메일 발송 후 표시) */}
            {isMailSent && !isMailVerified && (
              <div className={styles.row}>
                <label className={styles.label}>인증번호</label>
                <div className={styles.verifyWrap}>
                  <input
                    className={styles.input}
                    placeholder="인증번호 6자리"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                  />
                  <button
                    type="button"
                    className={`${styles.btnSmall} ${styles.btnDark}`}
                    onClick={onVerifyCode}
                  >
                    확인
                  </button>
                </div>
              </div>
            )}

            <div className={styles.row}>
              <label className={styles.label}>비밀번호</label>
              <input
                className={styles.input}
                type="password"
                placeholder="비밀번호 (8자 이상)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className={styles.row}>
              <label className={styles.label}></label>
              <input
                className={styles.input}
                type="password"
                placeholder="비밀번호 확인"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />
            </div>

            {/* 약관 및 버튼들 (기존 유지) */}
            <div className={styles.agreeBox}>
              <div className={styles.agreeRow}>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <span>이용 약관</span>
                </label>
                <button type="button" className={styles.viewBtn} onClick={() => setOpenModal("terms")}>내용보기</button>
              </div>
              <div className={styles.agreeRow}>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                  />
                  <span>개인정보 수집 이용 동의</span>
                </label>
                <button type="button" className={styles.viewBtn} onClick={() => setOpenModal("privacy")}>내용보기</button>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setOpenCancelConfirm(true)}
              >
                취소
              </button>
              <button
                type="submit"
                className={`${styles.btn} ${styles.btnPrimary}`}
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting ? "가입 중..." : "완료"}
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* 모달 등 기존 컴포넌트 유지 */}
      <Modal open={openModal !== null} title="약관" onClose={() => setOpenModal(null)}>
        <p className={styles.modalText}>약관 내용...</p>
      </Modal>
      <ConfirmModal
        open={openCancelConfirm}
        title="회원가입 취소"
        message="취소하시겠습니까?"
        onConfirm={() => { setOpenCancelConfirm(false); router.push("/"); }}
        onCancel={() => setOpenCancelConfirm(false)}
      />
    </div>
  );
}
