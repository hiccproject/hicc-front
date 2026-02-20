// src/components/Modal.tsx
//
// 공통 모달 컴포넌트
// - open 값에 따라 화면에 오버레이 + 모달 박스를 렌더링
// - title, children, footer를 외부에서 받아 재사용 가능하도록 설계
// - footer를 직접 넘기지 않으면 기본 "확인" 버튼을 자동으로 제공
// - 닫기 버튼(X)과 기본 확인 버튼은 모두 onClose를 호출

"use client";

import React from "react";
import styles from "./Modal.module.css";

export default function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  showDefaultFooter = true,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  showDefaultFooter?: boolean;
}) {
  // open이 false면 아무것도 렌더링하지 않음
  // 조건부 렌더링으로 DOM 자체를 만들지 않아 성능과 접근성 모두 안전
  if (!open) return null;

  return (
    // backdrop: 화면 전체를 덮는 오버레이
    // role="dialog"와 aria-modal을 추가해 접근성 보강
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        {/* 헤더 영역: 제목 + 닫기 버튼 */}
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>

          {/* 닫기 버튼은 항상 표시 */}
          <button
            className={styles.close}
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 본문 영역: 외부에서 전달받은 children 렌더링 */}
        <div className={styles.body}>{children}</div>

        {/* 푸터 영역 */}
        <div className={styles.footer}>
          {/* footer를 직접 넘긴 경우 그대로 렌더링 */}
          {footer}

          {/* footer가 없고 showDefaultFooter가 true인 경우
              기본 "확인" 버튼을 자동 제공 */}
          {!footer && showDefaultFooter && (
            <button className={styles.ok} onClick={onClose}>
              확인
            </button>
          )}
        </div>
      </div>
    </div>
  );
}