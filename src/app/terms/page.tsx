// src/app/terms/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import styles from "./terms.module.css";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import { agreeGoogleSignup } from "@/lib/api/auth";
import { apiFetch } from "@/lib/api/client";
import { setTokens } from "@/lib/auth/tokens";

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
      // ✅ (중요) 임시 토큰이 있다면 "요청 전에" 먼저 저장
      const tempTokens = (window as any).__tempTokens;
      if (tempTokens?.accessToken && tempTokens?.refreshToken) {
        setTokens({
          accessToken: tempTokens.accessToken,
          refreshToken: tempTokens.refreshToken,
        });
        delete (window as any).__tempTokens;
      }

      // 1) 이름 업데이트 (백엔드가 JSON 문자열을 받는지 객체를 받는지에 따라 바꿔야 할 수도 있음)
      await apiFetch("/api/mypage/update", {
        method: "POST",
        auth: true,
        // 만약 백엔드가 { name: "..." } 형태를 원하면 아래로 바꿔줘:
        // body: JSON.stringify({ name }),
        body: JSON.stringify(name),
      });

      // 2) 약관 동의 (auth.ts에서 /consent 우선, 404면 /agree 폴백)
      const res = await agreeGoogleSignup({
        personalInfoAgreement,
        serviceTermsAgreement,
      });

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
              <label htmlFor="name" className={styles.nameLabel}>이름</label>
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
