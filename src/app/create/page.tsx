"use client";

import { useMemo, useState } from "react";
import Header from "@/components/Header";
import styles from "./create.module.css";

type Step = 1 | 2 | 3 | 4;

type StepMeta = {
  id: Step;
  label: string;
  headline: string;
};

const steps: StepMeta[] = [
  { id: 1, label: "직군 선택", headline: "직군을 선택해주세요" },
  { id: 2, label: "추가 정보 입력", headline: "추가 정보를 입력해주세요" },
  { id: 3, label: "프로젝트 첨부", headline: "프로젝트를 첨부해주세요" },
  { id: 4, label: "소개글 입력", headline: "당신의 페이지를 요약하는 소개글을 써주세요" },
];

export default function CreatePage() {
  const [step, setStep] = useState<Step>(1);

  const stepLabel = useMemo(() => {
    const current = steps.find((item) => item.id === step);
    return current?.label ?? "";
  }, [step]);

  const stepHeadline = useMemo(() => {
    const current = steps.find((item) => item.id === step);
    return current?.headline ?? "";
  }, [step]);

  const stepNumber = useMemo(() => String(step).padStart(2, "0"), [step]);

  const canGoPrev = step > 1;
  const canGoNext = step < 4;

  const nextLabel = step === 4 ? "✓" : "→";

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />

        <section className={styles.body}>
          <aside className={styles.stepper}>
            <div className={styles.stepLine} />
            {steps.map((item) => {
              const isActive = item.id === step;
              return (
                <div key={item.id} className={styles.stepItem}>
                  <div
                    className={`${styles.stepDot} ${
                      isActive ? styles.stepDotActive : ""
                    }`}
                  />
                  <div className={styles.stepText}>
                    <span className={styles.stepTitle}>STEP 0{item.id}</span>
                    <span className={styles.stepLabel}>{item.label}</span>
                  </div>
                </div>
              );
            })}
          </aside>

          <div className={styles.content}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>{stepNumber}</span>
              <h2 className={styles.stepHeadline}>{stepHeadline}</h2>
            </div>

            {step === 1 && (
              <div className={styles.stepPanel}>
                <div className={styles.profileCard}>
                  <div className={styles.avatar}>
                    <span className={styles.avatarEdit}>✎</span>
                  </div>
                  <span className={styles.profileName}>홍길동</span>
                </div>
                <div className={styles.formRow}>
                  <button type="button" className={styles.selectBox}>
                    디자인 <span className={styles.selectArrow}>⌄</span>
                  </button>
                  <input
                    className={styles.textInput}
                    placeholder="UX/UI 디자이너"
                    defaultValue="UX/UI 디자이너"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className={styles.stepPanel}>
                <div className={styles.profileCard}>
                  <div className={styles.avatar}>
                    <span className={styles.avatarEdit}>✎</span>
                  </div>
                  <span className={styles.profileName}>홍길동</span>
                </div>
                <div className={styles.formStack}>
                  <div className={styles.formRow}>
                    <button type="button" className={styles.selectBox}>
                      디자인 <span className={styles.selectArrow}>⌄</span>
                    </button>
                    <input
                      className={styles.textInput}
                      defaultValue="UX/UI 디자이너"
                    />
                  </div>
                  <input
                    className={styles.textInput}
                    defaultValue="hgd1234@gmail.com"
                  />
                  <input
                    className={styles.textInput}
                    placeholder="전화번호를 입력해주세요. (선택)"
                  />
                  <input
                    className={styles.textInput}
                    placeholder="위치를 입력해주세요. (선택)"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className={styles.projectPanel}>
                <div className={styles.projectCard}>
                  <input
                    className={styles.projectInput}
                    placeholder="프로젝트 제목"
                  />
                  <textarea
                    className={styles.projectText}
                    placeholder="프로젝트 설명"
                  />
                  <button type="button" className={styles.linkButton}>
                    🔗 링크를 첨부해주세요.
                  </button>
                  <div className={styles.photoDrop}>
                    <span className={styles.photoIcon}>🖼️</span>
                    대표 사진을 첨부해 주세요. (선택)
                  </div>
                </div>
                <div className={styles.projectAdd}>
                  <span className={styles.projectAddIcon}>＋</span>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className={styles.bioPanel}>
                <textarea
                  className={styles.bioInput}
                  placeholder="당신의 명함에 대해서 설명해주세요. (선택)"
                />
              </div>
            )}
          </div>
        </section>

        <div className={styles.navControls}>
          <button
            className={`${styles.navButton} ${styles.navButtonGhost}`}
            type="button"
            onClick={() =>
              setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))
            }
            disabled={!canGoPrev}
            aria-label="이전"
          >
            ←
          </button>
          <button
            className={`${styles.navButton} ${styles.navButtonSolid}`}
            type="button"
            onClick={() =>
              setStep((prev) => (prev < 4 ? ((prev + 1) as Step) : prev))
            }
            disabled={!canGoNext && step !== 4}
            aria-label="다음"
          >
            {nextLabel}
          </button>
        </div>
      </main>
    </div>
  );
}
