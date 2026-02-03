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
  if (!open) return null;

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.close} onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        <div className={styles.body}>{children}</div>

        <div className={styles.footer}>
          {footer}
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
