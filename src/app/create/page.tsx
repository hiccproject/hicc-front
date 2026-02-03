"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import styles from "./create.module.css";
import { savePortfolioStep, PortfolioData } from "@/lib/api/cards";

type Step = 1 | 2 | 3 | 4 | 5;

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
  { id: 5, label: "레이아웃 선택", headline: "원하는 레이아웃을 골라주세요" },
];

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // 폼 데이터 상태 관리
  const [formData, setFormData] = useState<PortfolioData>({
    category: "개발",
    subCategory: "프론트엔드",
    profileImg: "", // 필요 시 업로드 로직 추가
    email: "",
    phone: "",
    location: "",
    projects: [{ projectName: "", projectSummary: "", projectLink: "" }],
    summaryIntro: "",
    layoutType: "CARD",
  });

  // 입력 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 프로젝트 핸들러
  const handleProjectChange = (index: number, field: string, value: string) => {
    const newProjects = [...formData.projects];
    newProjects[index] = { ...newProjects[index], [field]: value };
    setFormData((prev) => ({ ...prev, projects: newProjects }));
  };

  const addProject = () => {
    setFormData(prev => ({ ...prev, projects: [...prev.projects, { projectName: "", projectSummary: "", projectLink: "" }] }));
  };

  // 저장 및 다음 단계 이동
  const handleNext = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      let body = {};
      
      // 단계별 데이터 매핑
      if (step === 1) {
        body = { category: formData.category, subCategory: formData.subCategory, profileImg: formData.profileImg };
      } else if (step === 2) {
        body = { email: formData.email, phone: formData.phone, location: formData.location };
      } else if (step === 3) {
        body = { projects: formData.projects };
      } else if (step === 4) {
        body = { summaryIntro: formData.summaryIntro };
      } else if (step === 5) {
        body = { layoutType: formData.layoutType };
      }

      // API 호출
      const res = await savePortfolioStep(step, body, portfolioId);
      
      // 1단계에서 받은 ID 저장 (이후 단계에서 필수)
      if (step === 1 && res.data) {
        setPortfolioId(res.data);
      }

      if (step < 5) {
        setStep((prev) => (prev + 1) as Step);
        window.scrollTo(0, 0);
      } else {
        alert("포트폴리오 발행이 완료되었습니다!");
        router.push("/mypage");
      }
    } catch (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다. 입력을 확인해주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  // 헤더 텍스트 등 UI 헬퍼
  const stepHeadline = useMemo(() => steps.find((s) => s.id === step)?.headline ?? "", [step]);
  const stepNumber = useMemo(() => String(step).padStart(2, "0"), [step]);
  const canGoPrev = step > 1;

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />

        <section className={styles.body}>
          <aside className={styles.stepper}>
            <div className={styles.stepLine} />
            {steps.map((item) => (
              <div key={item.id} className={styles.stepItem}>
                <div className={`${styles.stepDot} ${item.id === step ? styles.stepDotActive : ""}`} />
                <div className={styles.stepText}>
                  <span className={styles.stepTitle}>STEP 0{item.id}</span>
                  <span className={styles.stepLabel}>{item.label}</span>
                </div>
              </div>
            ))}
          </aside>

          <div className={styles.content}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>{stepNumber}</span>
              <h2 className={styles.stepHeadline}>{stepHeadline}</h2>
            </div>

            {/* Step 1: 직군 */}
            {step === 1 && (
              <div className={styles.stepPanel}>
                <div className={styles.formRow}>
                  <select name="category" value={formData.category} onChange={handleChange} className={styles.selectBox}>
                    <option value="개발">개발</option>
                    <option value="디자인">디자인</option>
                    <option value="기획">기획</option>
                  </select>
                  <input
                    name="subCategory"
                    className={styles.textInput}
                    placeholder="세부 직군 (예: UX/UI 디자이너)"
                    value={formData.subCategory}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {/* Step 2: 정보 */}
            {step === 2 && (
              <div className={styles.stepPanel}>
                <div className={styles.formStack}>
                  <input name="email" className={styles.textInput} placeholder="이메일 (필수)" value={formData.email} onChange={handleChange} />
                  <input name="phone" className={styles.textInput} placeholder="전화번호 (선택)" value={formData.phone} onChange={handleChange} />
                  <input name="location" className={styles.textInput} placeholder="위치 (선택)" value={formData.location} onChange={handleChange} />
                </div>
              </div>
            )}

            {/* Step 3: 프로젝트 */}
            {step === 3 && (
              <div className={styles.projectPanel}>
                {formData.projects.map((proj, idx) => (
                  <div key={idx} className={styles.projectCard} style={{ marginBottom: '20px' }}>
                    <input
                      className={styles.projectInput}
                      placeholder="프로젝트 제목"
                      value={proj.projectName}
                      onChange={(e) => handleProjectChange(idx, "projectName", e.target.value)}
                    />
                    <textarea
                      className={styles.projectText}
                      placeholder="프로젝트 설명"
                      value={proj.projectSummary}
                      onChange={(e) => handleProjectChange(idx, "projectSummary", e.target.value)}
                    />
                    <input
                      className={styles.textInput}
                      placeholder="관련 링크 (URL)"
                      value={proj.projectLink}
                      onChange={(e) => handleProjectChange(idx, "projectLink", e.target.value)}
                      style={{ marginTop: '10px' }}
                    />
                  </div>
                ))}
                <div className={styles.projectAdd} onClick={addProject} style={{ cursor: "pointer" }}>
                  <span className={styles.projectAddIcon}>＋</span> 프로젝트 추가
                </div>
              </div>
            )}

            {/* Step 4: 소개 */}
            {step === 4 && (
              <div className={styles.bioPanel}>
                <textarea
                  name="summaryIntro"
                  className={styles.bioInput}
                  placeholder="당신의 명함에 대해서 설명해주세요."
                  value={formData.summaryIntro}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* Step 5: 레이아웃 선택 */}
            {step === 5 && (
              <div className={styles.stepPanel}>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  {["CARD", "LIST", "GRID"].map((type) => (
                    <div
                      key={type}
                      onClick={() => setFormData(prev => ({ ...prev, layoutType: type as any }))}
                      style={{
                        flex: 1,
                        padding: '20px',
                        border: formData.layoutType === type ? '2px solid #3b82f6' : '1px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        backgroundColor: formData.layoutType === type ? '#eff6ff' : '#fff'
                      }}
                    >
                      <strong>{type}</strong>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                        {type === "CARD" && "명함형 디자인"}
                        {type === "LIST" && "리스트형 디자인"}
                        {type === "GRID" && "그리드형 디자인"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <div className={styles.navControls}>
          <button
            className={`${styles.navButton} ${styles.navButtonGhost}`}
            type="button"
            onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))}
            disabled={!canGoPrev || isSaving}
          >
            ←
          </button>
          <button
            className={`${styles.navButton} ${styles.navButtonSolid}`}
            type="button"
            onClick={handleNext}
            disabled={isSaving}
          >
            {isSaving ? "저장 중..." : step === 5 ? "발행하기" : "→"}
          </button>
        </div>
      </main>
    </div>
  );
}