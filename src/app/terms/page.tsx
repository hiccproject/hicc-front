// src/app/terms/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import styles from "./terms.module.css";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import { consentGoogleSignup } from "@/lib/api/auth";
import { setTokens } from "@/lib/auth/tokens";
import {
  getStoredProfile,
  setStoredNameForEmail,
  setStoredProfile,
} from "@/lib/auth/profile";

export default function TermsPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [serviceTermsAgreement, setServiceTermsAgreement] = useState(false);
  const [personalInfoAgreement, setPersonalInfoAgreement] = useState(false);

  const [openModal, setOpenModal] = useState<null | "terms" | "privacy">(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);

  const canSubmit = name.trim() !== "" && serviceTermsAgreement && personalInfoAgreement;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      /**
       * ✅ 1) 이름 저장 로직 (MyPage 방식 그대로)
       * - 서버 호출 X
       * - profile store/localStorage만 업데이트
       */
      const profile = getStoredProfile();
      const email = profile?.email ?? "";

      if (email) {
        setStoredNameForEmail(email, name.trim());
      }

      setStoredProfile({
        name: name.trim(),
        email: profile?.email ?? "",
        password: profile?.password ?? "",
      });

      /**
       * ✅ 2) 약관 동의 (agree -> consent로 변경)
       */
      const res = await consentGoogleSignup({
        personalInfoAgreement,
        serviceTermsAgreement,
      });

      /**
       * ✅ 3) 임시 토큰 저장 (기존 로직 유지)
       */
      const tempTokens = (window as any).__tempTokens;
      if (tempTokens) {
        setTokens({
          accessToken: tempTokens.accessToken,
          refreshToken: tempTokens.refreshToken,
        });
        delete (window as any).__tempTokens;
      }

      alert(res.message || "회원가입이 완료되었습니다.");
      window.dispatchEvent(new Event("auth-changed"));
      router.replace(res.redirectUrl || "/");
    } catch (error) {
      alert(error instanceof Error ? error.message : "처리에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />

        <section className={styles.body}>
          <h1 className={styles.pageTitle} style={{ textAlign: "center", marginBottom: "50px" }}>
            회원가입
          </h1>

          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.nameRow}>
              <label htmlFor="name" className={styles.nameLabel}>
                이름
              </label>
              <input
                id="name"
                type="text"
                className={styles.nameInput}
                placeholder="이름을 입력해주세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className={styles.agreeBox}>
              <div className={styles.agreeRow}>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={serviceTermsAgreement}
                    onChange={(e) => setServiceTermsAgreement(e.target.checked)}
                  />
                  <span>이용 약관(필수)</span>
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
                    checked={personalInfoAgreement}
                    onChange={(e) => setPersonalInfoAgreement(e.target.checked)}
                  />
                  <span>개인정보 수집 이용 동의(필수)</span>
                </label>
                <button
                  type="button"
                  className={styles.viewBtn}
                  onClick={() => setOpenModal("privacy")}
                >
                  내용보기
                </button>
              </div>

              {!canSubmit && (
                <div className={styles.warn}>이름 입력과 필수 약관 동의는 필수입니다.</div>
              )}
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
                {isSubmitting ? "처리 중..." : "완료"}
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
        <div className={styles.modalText}>
          {openModal === "terms"
            ? "이용 약관 내용이 여기에 들어갑니다."
            : "개인정보 수집 및 이용 안내 내용이 여기에 들어갑니다."}
        </div>
      </Modal>

      <ConfirmModal
        open={openCancelConfirm}
        title="회원가입 취소"
        message="정말 회원가입을 취소하시겠습니까?"
        onConfirm={() => {
          setOpenCancelConfirm(false);
          router.replace("/login");
        }}
        onCancel={() => setOpenCancelConfirm(false)}
      />
    </div>
  );
}
