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
      open={open}
      title={title}
      onClose={onCancel}
      showDefaultFooter={false}
      footer={
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.cancel}`}
            onClick={onCancel}
          >
            {cancelText}
          </button>
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
      <p className={styles.message}>{message}</p>
    </Modal>
  );
}
