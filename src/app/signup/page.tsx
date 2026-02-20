// src/app/signup/page.tsx
//
// 일반 회원가입(이메일/비밀번호) 페이지
// - 이름/이메일/비밀번호 입력 + 이메일 인증 + 필수 약관 동의 후 회원가입을 완료하는 화면
//
// 전체 흐름
// 1) 이메일 구성(emailId + domain/customDomain) → fullEmail 생성
// 2) "인증번호 전송" → sendVerificationMail(fullEmail)
// 3) "인증번호 확인" → verifyMailCode(fullEmail, verificationCode)
// 4) 인증 완료(isMailVerified=true) + 필수 입력/약관 동의 조건 충족 → signupMember 호출
// 5) 성공 시 로컬 프로필 캐시 저장(setStoredProfile, setStoredNameForEmail) 후 홈 이동
//
// 구현에서 중요한 포인트
// - 이메일 입력이 여러 필드로 나뉘어 있어, fullEmail을 useMemo로 계산해 단일 값처럼 사용
// - 이메일/도메인이 바뀌면 기존 인증 상태를 무효화(useEffect)
// - isSending / isSubmitting으로 중복 요청 방지
// - canSubmit을 "제출 가능 조건"의 단일 소스로 사용해 버튼 disabled에 그대로 반영
//
// 검토/개선 여지(중요)
// A) 비밀번호 정책 문구는 "대/소문자/숫자/특수문자 포함"인데, 실제 검증은 length(>=8) + 일치만 체크
//    - 지금 상태면 문구와 검증이 불일치함
//    - FindPasswordPage처럼 정규식 정책을 도입하거나, 문구를 "8자 이상"으로 낮추는 식으로 통일 필요
// B) 이메일 인증 verify 요청에 로딩/중복 클릭 방지가 없음
//    - onVerifyCode에도 isVerifying 같은 플래그를 두면 UX가 안정적
// C) verifyMailCode 성공 후에도 사용자가 이메일을 바꾸면 인증 상태가 초기화되므로 안전
//    - 다만 "인증번호 입력칸" 자체가 isMailSent로만 노출되므로, 이메일 변경 시 setIsMailSent(false) 처리한 점이 중요
// D) 회원가입 성공 후 router.push("/")로 이동하는데, 일반적으로는 /login으로 보내는 선택도 가능
//    - 현재 정책이 "가입 직후 홈"이면 OK. 로그인 처리까지 자동으로 되는지(토큰 발급 여부)와 함께 정책 확인 필요

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

type DomainOption =
  | "gmail.com"
  | "naver.com"
  | "nate.com"
  | "hanmail.net"
  | "custom";

export default function SignupPage() {
  const router = useRouter();

  // 기본 입력값
  const [name, setName] = useState("");
  const [emailId, setEmailId] = useState("");

  // 도메인 선택(프리셋 or 직접 입력)
  const [domain, setDomain] = useState<DomainOption>("gmail.com");
  const [customDomain, setCustomDomain] = useState("");

  // 비밀번호 입력(1차/2차)
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // 이메일 인증 상태
  const [isMailSent, setIsMailSent] = useState(false);
  const [isMailVerified, setIsMailVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  // 메일 발송 중(중복 클릭 방지)
  const [isSending, setIsSending] = useState(false);

  // 약관 동의 상태
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);

  // 약관 내용보기 모달 상태
  const [openModal, setOpenModal] = useState<null | "terms" | "privacy">(null);

  // 제출 중 상태(중복 제출 방지)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 취소 확인 모달
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);

  // 현재 선택된 도메인(직접 입력이면 customDomain 사용)
  const selectedDomain = domain === "custom" ? customDomain : domain;

  // fullEmail: 화면 전체에서 사용할 "최종 이메일 문자열"
  // - emailId 또는 domain이 비어있을 수 있어 단계별로 문자열을 구성
  const fullEmail = useMemo(() => {
    if (!emailId) return "";
    if (!selectedDomain) return `${emailId}@`;
    return `${emailId}@${selectedDomain}`;
  }, [emailId, selectedDomain]);

  // 이메일 관련 입력(emailId/domain/customDomain)이 바뀌면 기존 인증 절차를 무효화
  // - 다른 이메일로 바꿨는데 인증 상태가 남아있는 것을 방지
  useEffect(() => {
    setIsMailSent(false);
    setIsMailVerified(false);
    setVerificationCode("");
  }, [emailId, domain, customDomain]);

  // 비밀번호 일치 여부
  const passwordMatch = password.length > 0 && password === password2;

  // 제출 가능 조건
  // - 이메일 인증 완료가 필수
  // - 약관 동의 2개 모두 필수
  // - 비밀번호는 현재 최소 8자 + 2차 일치만 체크
  const canSubmit =
    name.trim().length > 0 &&
    emailId.trim().length > 0 &&
    selectedDomain.trim().length > 0 &&
    isMailVerified &&
    password.length >= 8 &&
    passwordMatch &&
    agreeTerms &&
    agreePrivacy;

  // 이메일 인증번호 발송
  async function onSendMail() {
    // 최소한의 검증: emailId와 domain이 있어야 fullEmail이 유효해짐
    if (!fullEmail || !emailId || !selectedDomain) {
      alert("이메일을 올바르게 입력해주세요.");
      return;
    }

    if (isSending) return;

    setIsSending(true);
    try {
      await sendVerificationMail(fullEmail);
      alert("인증번호가 발송되었습니다.");

      // 발송 성공 후 상태 전환
      setIsMailSent(true);
      setIsMailVerified(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "메일 발송 실패");
    } finally {
      setIsSending(false);
    }
  }

  // 인증번호 확인
  async function onVerifyCode() {
    if (!verificationCode) {
      alert("인증번호를 입력해주세요.");
      return;
    }

    try {
      const res = await verifyMailCode(fullEmail, verificationCode);

      // 응답 형식이 string 또는 {message: ...}일 수 있어 둘 다 대응
      const msg = typeof res === "object" && res.message ? res.message : res;

      alert(msg || "인증에 성공하였습니다!");
      setIsMailVerified(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "인증 실패");
      setIsMailVerified(false);
    }
  }

  // 회원가입 제출
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // 버튼 disabled로도 막지만, 함수 레벨에서도 한 번 더 방어
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      // signupMember 요청
      // - termsAgreed는 서버 스펙 상 이용약관 동의만 받는 구조일 수 있어 agreeTerms만 전달
      // - 개인정보 동의(agreePrivacy)는 서버에서 별도 필드가 필요하면 payload 확장 필요
      await signupMember({
        name,
        email: fullEmail,
        password,
        passwordConfirm: password2,
        termsAgreed: agreeTerms,
      });

      // 로컬 캐시(프론트 UX용)
      // - 서버의 마이페이지 응답과 정책이 다르면, 추후 GET /api/mypage로 덮어쓰는 방식과 조합 가능
      setStoredProfile({ name, email: fullEmail, password });

      // 이메일->이름 매핑 저장(로그인 greeting 등에서 사용)
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
            {/* 이름 */}
            <div className={styles.row}>
              <label className={styles.label}>이름</label>
              <input
                className={styles.input}
                placeholder="이름을 입력해주세요."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* 이메일 입력 + 인증 플로우 */}
            <div className={styles.row}>
              <label className={styles.label}>이메일 (아이디)</label>

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

                  {/* 도메인 입력(직접 입력 vs 고정 텍스트) */}
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

                  {/* 도메인 선택 드롭다운 */}
                  <select
                    className={styles.select}
                    value={domain}
                    onChange={(e) => {
                      const next = e.target.value as DomainOption;
                      setDomain(next);

                      // custom이 아니면 customDomain은 비워서 상태 충돌을 방지
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

                {/* 인증번호 전송/재전송 버튼
                    - 인증 완료 후에는 더 이상 필요 없으므로 숨김 */}
                {!isMailVerified && (
                  <button
                    type="button"
                    className={`${styles.btnSmall} ${styles.btnOutline} ${styles.fullWidthBtn}`}
                    onClick={onSendMail}
                    disabled={isSending}
                  >
                    {isSending
                      ? "발송 중..."
                      : isMailSent
                      ? "인증번호 재전송"
                      : "인증번호 전송"}
                  </button>
                )}

                {/* 인증 완료 메시지 */}
                {isMailVerified && (
                  <div className={styles.verifiedMsg}>
                    ✓ 이메일 인증이 완료되었습니다.
                  </div>
                )}

                {/* 사용자가 조합된 이메일을 확인할 수 있도록 보조 문구 표시 */}
                <div className={styles.helper}>
                  {fullEmail && !isMailVerified ? `입력된 이메일: ${fullEmail}` : ""}
                </div>
              </div>
            </div>

            {/* 인증번호 입력(메일 발송 후 표시) */}
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

            {/* 비밀번호 */}
            <div className={styles.row}>
              <label className={styles.label}>비밀번호</label>
              <input
                className={styles.input}
                type="password"
                placeholder="비밀번호 (비밀번호는 8~20자이며, 대문자, 소문자, 숫자, 특수문자를 모두 포함해야 합니다.)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* 비밀번호 확인 */}
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

            {/* 약관 동의 */}
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

            {/* 액션 버튼 */}
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

      {/* 약관 내용보기 모달 */}
      <Modal
        open={openModal !== null}
        title={openModal === "terms" ? "이용약관" : "개인정보 수집 이용 동의"}
        onClose={() => setOpenModal(null)}
      >
        {openModal === "terms" ? (
          <div className={styles.modalText}>
            <p>제1조 (목적)</p>
            <p>
              본 약관은 opm 에서 제공하는 opm 서비스의 이용 조건 및 회원과
              운영자의 권리·의무를 규정함을 목적으로 합니다.
            </p>
            <p>제2조 (위반 시 조치)</p>
            <p>
              운영자는 게시물 삭제, 경고, 일정 기간 이용 제한, 영구 탈퇴 등의
              조치를 취할 수 있습니다.
            </p>
            <p>제3조 (저작권 및 게시물 이용)</p>
            <p>
              작성자는 게시물에 대한 저작권을 가지며, opm은 해당 콘텐츠를 서비스
              운영·홍보 목적으로 사용할 수 있습니다.
            </p>
            <p>단, 사전 동의 없이 외부 플랫폼에 배포하거나 판매하지 않습니다.</p>
            <p>제4조 (회원 탈퇴 및 자격 정지)</p>
            <p>
              회원은 언제든지 탈퇴를 요청할 수 있으며, opm은 7일 이내 처리합니다.
            </p>
            <p>
              다음의 경우 운영자는 사전 통지 후 회원 자격을 제한하거나 해지할 수
              있습니다:
            </p>
            <p>명백한 약관 위반, 반복적인 비방 행위, 저작권 침해, 사칭 등</p>
          </div>
        ) : (
          <div className={styles.modalText}>
            <p>
              opm은 회원의 개인정보를 소중히 여기며, 「개인정보 보호법」 등 관계
              법령을 준수하여 안전하게 보호하고자 다음과 같은 정책을
              수립·운영합니다.
            </p>
            <p>1. 수집하는 개인정보 항목</p>
            <p>가입 시: 닉네임, 이메일 주소, 프로필 이미지</p>
            <p>서비스 이용 시: 접속 IP, 이용기록, 기기 및 브라우저 정보, 쿠키</p>
            <p>
              ※ 게시물 내 포함된 정보도 개인정보로 간주될 수 있으며, 커뮤니티 질서
              유지를 위한 분석·보관 대상이 됩니다.
            </p>
            <p>2. 개인정보의 수집 및 이용 목적</p>
            <p>이용자 식별 및 부정 이용 방지</p>
            <p>고객 문의 및 신고 대응, 분쟁 해결</p>
            <p>맞춤 콘텐츠 추천, 서비스 품질 향상</p>
            <p>법령상 의무 이행 및 통계 분석</p>
            <p>3. 보유 및 이용 기간</p>
            <p>회원 탈퇴 시 즉시 파기 (단, 아래 항목은 예외)</p>
            <p>
              보관 항목보관 사유보관 기간채팅 기록분쟁 대비 및 악용 방지 3개월 신고
              관련 게시물 및 기록 커뮤니티 운영 및 법적 대응 6개월 이메일,
              닉네임회원 식별 이력 확인탈퇴 후 최대 1년
            </p>
            <p>4. 개인정보 제3자 제공 및 위탁</p>
            <p>원칙적으로 외부에 제공하지 않음</p>
            <p>단 opm 또는 법령에 따라 사전 동의 후 최소한의 정보 제공 가능</p>
            <p>5. 이용자 권리</p>
            <p>
              회원은 언제든지 개인정보 열람, 수정, 삭제, 탈퇴를 요청할 수 있습니다.
            </p>
            <p>민감 정보는 운영자 승인 또는 요청 절차를 통해 수정 가능합니다.</p>
          </div>
        )}
      </Modal>

      {/* 취소 확인 모달 */}
      <ConfirmModal
        open={openCancelConfirm}
        title="회원가입 취소"
        message="취소하시겠습니까?"
        onConfirm={() => {
          setOpenCancelConfirm(false);
          router.push("/");
        }}
        onCancel={() => setOpenCancelConfirm(false)}
      />
    </div>
  );
}