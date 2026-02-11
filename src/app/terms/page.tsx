// src/app/terms/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import styles from "./terms.module.css";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import { agreeGoogleSignup } from "@/lib/api/auth";

export default function TermsPage() {
  const router = useRouter();

  const [serviceTermsAgreement, setServiceTermsAgreement] = useState(false);
  const [personalInfoAgreement, setPersonalInfoAgreement] = useState(false);

  const [openModal, setOpenModal] = useState<null | "terms" | "privacy">(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);

  const canSubmit = serviceTermsAgreement && personalInfoAgreement;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await agreeGoogleSignup({
        personalInfoAgreement,
        serviceTermsAgreement,
      });

      alert(res.message || "회원가입이 완료되었습니다.");
      router.replace(res.redirectUrl || "/");
    } catch (error) {
      alert(error instanceof Error ? error.message : "약관 동의 처리에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />

        <section className={styles.body}>
          <h1 className={styles.pageTitle}>약관 동의</h1>

          <form className={styles.form} onSubmit={onSubmit}>
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
                <button type="button" className={styles.viewBtn} onClick={() => setOpenModal("terms")}>
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
                <button type="button" className={styles.viewBtn} onClick={() => setOpenModal("privacy")}>
                  내용보기
                </button>
              </div>

              {!canSubmit && (
                <div className={styles.warn}>필수 약관에 모두 동의해야 합니다.</div>
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
        {openModal === "terms" ? (
          <div className={styles.modalText}>약관 내용</div>
        ) : (
          <div className={styles.modalText}>개인정보 내용</div>
        )}
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
