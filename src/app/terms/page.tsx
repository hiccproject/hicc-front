// src/app/terms/page.tsx
//
// 구글 소셜 회원가입(추가 정보/약관 동의) 페이지
// - 구글 OAuth 이후 "신규 회원"인 경우 백엔드가 /terms로 리다이렉트 시키고,
//   여기서 이름 + 필수 약관 2개 동의를 받아 최종 회원가입을 완료하는 화면
//
// 핵심 흐름
// 1) (이전 단계) 구글 로그인 성공 → 백엔드가 access/refresh 토큰을 발급
// 2) (프론트) 토큰을 바로 저장하지 않고, 임시로 window.__tempTokens 등에 보관
// 3) (이 페이지) 사용자가 이름/약관 동의 → consentGoogleSignup 호출
// 4) 성공 시 토큰 저장(setTokens) + Header 동기화를 위한 auth-changed 이벤트 + redirect
//
// 구현에서 중요한 포인트
// - canSubmit: 이름 + 필수 약관 체크 2개가 모두 만족해야만 제출 가능
// - isSubmitting: 중복 제출 방지
// - Modal: 약관 내용보기(terms/privacy) 표시
// - ConfirmModal: 취소 버튼 클릭 시 "정말 취소?" 확인 후 /login으로 이동
//
// 검토/개선 여지(중요)
// A) window.__tempTokens 사용
//    - 전역(window)에 토큰을 두는 방식은 구현은 간단하지만, 안정성/예측 가능성이 떨어질 수 있음
//    - 새로고침하면 __tempTokens가 사라져 회원가입 완료가 막힐 수 있음
//    - 가능한 대안: sessionStorage에 임시 저장(탭 단위 유지) 또는 URL query로 전달 후 즉시 제거(TokenQueryHandler 패턴)
// B) 토큰 저장 시점
//    - 현재는 "약관 동의 성공" 직전에 토큰을 localStorage에 저장하고 있음
//    - 만약 consentGoogleSignup가 실패하면 토큰만 저장된 상태가 남을 수 있음(부분 성공처럼 보일 위험)
//    - 더 안전한 방식: consentGoogleSignup 성공 후 setTokens 수행
//      (단, 백엔드가 consent 이전 요청을 인증 요구한다면 지금 방식이 필요할 수 있음)
// C) 약관 내용
//    - 현재는 placeholder 문자열만 렌더링
//    - 실제 약관 문구(또는 외부 링크)로 교체가 필요

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import styles from "./terms.module.css";
import Modal from "@/components/Modal";
import ConfirmModal from "@/components/ConfirmModal";
import { consentGoogleSignup } from "@/lib/api/auth";
import { setTokens } from "@/lib/auth/tokens";

export default function TermsPage() {
  const router = useRouter();

  // 사용자 입력
  const [name, setName] = useState("");

  // 필수 약관 동의 체크 상태
  const [serviceTermsAgreement, setServiceTermsAgreement] = useState(false);
  const [personalInfoAgreement, setPersonalInfoAgreement] = useState(false);

  // 약관 "내용보기" 모달 상태
  // - null: 닫힘
  // - "terms": 이용약관 보기
  // - "privacy": 개인정보 동의 보기
  const [openModal, setOpenModal] = useState<null | "terms" | "privacy">(null);

  // 제출 중 상태(중복 클릭 방지)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 취소 확인 모달 상태
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);

  // 제출 가능 조건: 이름 + 필수 약관 2개 동의
  const canSubmit =
    name.trim() !== "" && serviceTermsAgreement && personalInfoAgreement;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // canSubmit이 아니거나 이미 제출 중이면 아무 동작도 하지 않음
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // 구글 로그인 직후 임시 저장된 토큰을 실제 저장소로 옮기는 단계
      // - 이 값이 없으면(새로고침/직접 진입 등) 회원가입 완료 플로우가 깨질 수 있음
      const tempTokens = (window as any).__tempTokens;
      if (tempTokens?.accessToken && tempTokens?.refreshToken) {
        setTokens({
          accessToken: tempTokens.accessToken,
          refreshToken: tempTokens.refreshToken,
        });
        delete (window as any).__tempTokens;
      }

      // 약관 동의 + 이름을 백엔드로 전달해 구글 회원가입을 최종 확정
      const res = await consentGoogleSignup({
        personalInfoAgreement,
        serviceTermsAgreement,
        name: name.trim(),
      });

      alert(res.message || "회원가입이 완료되었습니다.");

      // Header 등 로그인 UI가 즉시 갱신되도록 커스텀 이벤트 발생
      window.dispatchEvent(new Event("auth-changed"));

      // 완료 후 리다이렉트(백엔드가 redirectUrl 내려주면 그 값을 사용)
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
          <h1
            className={styles.pageTitle}
            style={{ textAlign: "center", marginBottom: "50px" }}
          >
            회원가입
          </h1>

          <form className={styles.form} onSubmit={onSubmit}>
            {/* 이름 입력 */}
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

            {/* 약관 동의 영역 */}
            <div className={styles.agreeBox}>
              {/* 이용 약관 */}
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

              {/* 개인정보 수집 이용 동의 */}
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

              {/* 제출 불가 상태 안내 */}
              {!canSubmit && (
                <div className={styles.warn}>
                  이름 입력과 필수 약관 동의가 필요합니다.
                </div>
              )}
            </div>

            {/* 하단 액션 버튼 */}
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

      {/* 약관 내용보기 모달 */}
      <Modal
        open={openModal !== null}
        title={
          openModal === "terms" ? "이용 약관" : "개인정보 수집 이용 동의"
        }
        onClose={() => setOpenModal(null)}
      >
        <div className={styles.modalText}>
          {openModal === "terms"
            ? "이용 약관 내용이 여기에 들어갑니다."
            : "개인정보 수집 및 이용 안내 내용이 여기에 들어갑니다."}
        </div>
      </Modal>

      {/* 취소 확인 모달 */}
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