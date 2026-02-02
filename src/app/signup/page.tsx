"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import styles from "./signup.module.css";
import Header from "../../components/Header";
import Modal from "../../components/Modal";
import { signupMember } from "@/lib/api/auth";

type DomainOption = "naver.com" | "nate.com" | "hanmail.net" | "custom";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [domain, setDomain] = useState<DomainOption>("naver.com");
  const [customDomain, setCustomDomain] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const [openModal, setOpenModal] = useState<null | "terms" | "privacy">(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDomain = domain === "custom" ? customDomain : domain;

  const fullEmail = useMemo(() => {
    if (!emailId) return "";
    if (!selectedDomain) return `${emailId}@`;
    return `${emailId}@${selectedDomain}`;
  }, [emailId, selectedDomain]);

  const passwordMatch = password.length > 0 && password === password2;

  const canSubmit =
    name.trim().length > 0 &&
    emailId.trim().length > 0 &&
    selectedDomain.trim().length > 0 &&
    password.length >= 8 &&
    passwordMatch &&
    agreeTerms &&
    agreePrivacy;

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
      });
      alert("회원가입이 완료되었습니다.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "회원가입에 실패했습니다.");
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

            <div className={styles.row}>
              <label className={styles.label}>이메일 (아이디)</label>

              <div className={styles.emailWrap}>
                <input
                  className={styles.input}
                  placeholder="이메일을 입력해주세요."
                  value={emailId}
                  onChange={(e) => setEmailId(e.target.value)}
                />

                <span className={styles.at}>@</span>

                {domain === "custom" ? (
                  <input
                    className={`${styles.input} ${styles.domainInput}`}
                    placeholder="직접 입력"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
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
                >
                  <option value="naver.com">naver.com</option>
                  <option value="nate.com">nate.com</option>
                  <option value="hanmail.net">hanmail.net</option>
                  <option value="custom">직접 입력</option>
                </select>
              </div>

              <div className={styles.helper}>
                {fullEmail ? `입력된 이메일: ${fullEmail}` : ""}
              </div>
            </div>

            <div className={styles.row}>
              <label className={styles.label}>비밀번호</label>
              <input
                className={styles.input}
                type="password"
                placeholder="비밀번호를 입력해주세요. (8자 이상)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className={styles.row}>
              <label className={styles.label}></label>
              <input
                className={styles.input}
                type="password"
                placeholder="비밀번호를 한번 더 입력해주세요."
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
              />

              <div className={styles.helper}>
                {password2.length === 0
                  ? ""
                  : passwordMatch
                  ? "비밀번호가 일치합니다."
                  : "비밀번호가 일치하지 않습니다."}
              </div>
            </div>

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

                <button
                  type="button"
                  className={styles.viewBtn}
                  onClick={() => setOpenModal("terms")}
                >
                  내용보기
                </button>
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

                <button
                  type="button"
                  className={styles.viewBtn}
                  onClick={() => setOpenModal("privacy")}
                >
                  내용보기
                </button>
              </div>
            </div>

            <div className={styles.actions}>
              <Link href="/" className={`${styles.btn} ${styles.btnGhost}`}>
                취소
              </Link>

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

      <Modal
        open={openModal !== null}
        title={openModal === "terms" ? "이용 약관" : "개인정보 수집 이용 동의"}
        onClose={() => setOpenModal(null)}
      >
        {openModal === "terms" ? (
          <div className={styles.modalText}>
            <p>여기에 이용 약관 내용을 넣으면 돼요.</p>
            <ul>
              <li>서비스 이용 규칙</li>
              <li>계정/보안</li>
              <li>금지 행위</li>
              <li>책임 제한</li>
            </ul>
          </div>
        ) : (
          <div className={styles.modalText}>
            <p>여기에 개인정보 수집/이용 동의 내용을 넣으면 돼요.</p>
            <ul>
              <li>수집 항목: 이름, 이메일, 비밀번호(해시)</li>
              <li>이용 목적: 회원가입/로그인</li>
              <li>보유 기간: 탈퇴 시 또는 법령 기준</li>
            </ul>
          </div>
        )}
      </Modal>
    </div>
  );
}
