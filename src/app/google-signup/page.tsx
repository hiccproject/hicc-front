"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import styles from "./google-signup.module.css";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import { agreeGoogleSignup, fetchSignupInfo } from "@/lib/api/auth";

function clearGoogleSignupStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("google_signup_email");
  localStorage.removeItem("google_signup_name");
  localStorage.removeItem("tempUserKey");
}

export default function GoogleSignupPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  const [openModal, setOpenModal] = useState<null | "terms" | "privacy">(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const init = async () => {
      const tempUserKey = localStorage.getItem("tempUserKey") ?? "";
      const storedEmail = localStorage.getItem("google_signup_email") ?? "";
      const storedName = localStorage.getItem("google_signup_name") ?? "";

      if (!tempUserKey) {
        router.replace("/login");
        return;
      }

      setEmail(storedEmail);
      setName(storedName);

      if (storedEmail) {
        return;
      }

      try {
        const info = await fetchSignupInfo();
        if (cancelled) return;

        const infoEmail = info.email?.trim() ?? "";
        const infoName = info.name?.trim() ?? "";

        if (infoEmail) {
          setEmail(infoEmail);
          localStorage.setItem("google_signup_email", infoEmail);
        }

        if (infoName && !storedName) {
          setName(infoName);
          localStorage.setItem("google_signup_name", infoName);
        }

        if (info.tempUserKey) {
          localStorage.setItem("tempUserKey", info.tempUserKey);
        }
      } catch {
        // Ignore init fetch failure and keep page usable with localStorage values.
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const canSubmit = name.trim().length > 0 && !!email && agreeTerms && agreePrivacy;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const tempUserKey = localStorage.getItem("tempUserKey") || "";
      if (!tempUserKey) {
        throw new Error("tempUserKey가 없습니다. 다시 시도해주세요.");
      }

      await agreeGoogleSignup({
        tempUserKey,
        consents: {
          SERVICE_TERMS: true,
          PRIVACY_POLICY: true,
          MARKETING: false,
          SMS_NOTIFICATION: false,
          EMAIL_NOTIFICATION: false,
        },
        name,
      });

      clearGoogleSignupStorage();
      alert("구글 회원가입이 완료되었습니다.");
      router.replace("/");
    } catch (error) {
      alert(error instanceof Error ? error.message : "구글 회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />

        <section className={styles.body}>
          <h1 className={styles.pageTitle}>구글 회원가입</h1>

          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.row}>
              <label className={styles.label}>이메일</label>
              <input className={styles.input} value={email} readOnly />
              <div className={styles.helper}>구글 계정 이메일은 변경할 수 없습니다.</div>
            </div>

            <div className={styles.row}>
              <label className={styles.label}>이름</label>
              <input
                className={styles.input}
                placeholder="이름을 입력해주세요."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className={styles.agreeBox}>
              <div className={styles.agreeRow}>
                <label className={styles.checkLabel}>
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
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
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                  />
                  <span>개인정보 수집 이용 동의(필수)</span>
                </label>
                <button type="button" className={styles.viewBtn} onClick={() => setOpenModal("privacy")}>
                  내용보기
                </button>
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
        {openModal === "terms" ? <div className={styles.modalText}>약관 내용</div> : <div className={styles.modalText}>개인정보 내용</div>}
      </Modal>

      <ConfirmModal
        open={openCancelConfirm}
        title="구글 회원가입 취소"
        message="정말 구글 회원가입을 취소하시겠습니까?"
        onConfirm={() => {
          clearGoogleSignupStorage();
          setOpenCancelConfirm(false);
          router.replace("/login");
        }}
        onCancel={() => setOpenCancelConfirm(false)}
      />
    </div>
  );
}
