// src/components/ConfirmModal.tsx
//
// 확인/취소가 필요한 상황에서 사용하는 전용 모달
// - 공통 Modal 컴포넌트를 감싸서 "예 / 아니요" 버튼 구성을 표준화
// - open이 true일 때만 모달이 렌더링되며, 닫힘 동작은 onCancel로 통일
//
// 동작 규칙
// - X 버튼(Modal의 close) 또는 바깥 닫기(onClose): onCancel 호출
// - "아니요" 버튼: onCancel 호출
// - "예" 버튼: onConfirm 호출
//
// UI 구성
// - showDefaultFooter={false}로 Modal의 기본 "확인" 버튼을 끄고
// - footer 슬롯에 ConfirmModal 전용 버튼 영역을 주입

"use client";

import Modal from "./Modal";
import styles from "./ConfirmModal.module.css";

export default function ConfirmModal({
  open,
  title = "확인",
  message,
  onConfirm,
  onCancel,
  confirmText = "예",
  cancelText = "아니요",
}: {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}) {
  return (
    <Modal
      // open: 모달 표시 여부
      open={open}
      // title: 기본값은 "확인", 필요 시 호출부에서 커스터마이징 가능
      title={title}
      // onClose: ConfirmModal에서는 닫힘을 모두 "취소"로 통일
      onClose={onCancel}
      // Modal의 기본 footer(확인 버튼) 비활성화
      showDefaultFooter={false}
      // footer: ConfirmModal 전용 버튼 영역 주입
      footer={
        <div className={styles.actions}>
          {/* 취소 버튼: 모달을 닫고 동작을 취소 */}
          <button
            type="button"
            className={`${styles.btn} ${styles.cancel}`}
            onClick={onCancel}
          >
            {cancelText}
          </button>

          {/* 확인 버튼: 확인 콜백 실행 (모달 닫힘은 호출부 정책에 따름) */}
          <button
            type="button"
            className={`${styles.btn} ${styles.confirm}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      }
    >
      {/* message: 사용자에게 보여줄 본문 문구 */}
      <p className={styles.message}>{message}</p>
    </Modal>
  );
}