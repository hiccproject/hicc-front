// 명함 생성 페이지
//src/app/create/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
<<<<<<< HEAD
import { getRecentPortfolioId, savePortfolioStep, PortfolioCategory, PortfolioData  } from "@/lib/api/cards";
import Header from "@/components/Header";
import styles from "./create.module.css";
=======
import Header from "@/components/Header";
import styles from "./create.module.css";
import { getPortfolioDetail, getPortfolioShareLink, savePortfolioStep, PortfolioCategory, PortfolioData } from "@/lib/api/cards";
>>>>>>> 8545fc58cbf593928a45e69ef670fe4fea5ad381
import { uploadImage } from "@/lib/api/uploads";
import { getStoredProfile } from "@/lib/auth/profile";

type Step = 1 | 2 | 3 | 4;

type StepMeta = {
  id: Step;
  label: string;
  headline: string;
};

type UploadImageResponse =
  | string
  | {
      data?: string;
      url?: string;
      imageUrl?: string;
    };

const S3_BASE_URL = process.env.NEXT_PUBLIC_S3_BASE_URL ?? "";

type CategoryOption = {
  value: PortfolioCategory;
  label: string;
  jobs: string[];
};

const DEFAULT_PROFILE_IMG = "/default-avatar.png";

const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: "DEVELOPMENT", label: "IT·개발", jobs: ["백엔드", "프론트엔드", "풀스택", "모바일", "DevOps", "데이터 엔지니어"] },
  { value: "DESIGN", label: "디자인", jobs: ["UX/UI 디자이너", "프로덕트 디자이너", "BX/브랜딩", "그래픽 디자이너"] },
  { value: "MARKETING", label: "마케팅·광고", jobs: ["퍼포먼스 마케터", "콘텐츠 마케터", "CRM 마케터"] },
  { value: "PLANNING", label: "기획·전략", jobs: ["서비스 기획", "PM", "사업 기획", "전략 기획"] },
  { value: "BUSINESS", label: "영업·고객상담", jobs: ["B2B 영업", "B2C 영업", "고객상담", "CS 매니저"] },
  { value: "MANAGEMENT", label: "경영·인사·총무", jobs: ["인사", "총무", "경영지원", "조직문화"] },
  { value: "FINANCE", label: "금융·재무", jobs: ["회계", "재무", "투자", "리스크관리"] },
  { value: "SERVICE", label: "서비스·교육", jobs: ["교육 기획", "강사", "운영 매니저", "서비스 운영"] },
  { value: "ENGINEERING", label: "엔지니어링·설계", jobs: ["기계 설계", "전기·전자", "품질관리", "생산기술"] },
  { value: "MEDIA", label: "미디어·예술", jobs: ["영상 편집", "PD", "작가", "아트디렉터"] },
  { value: "MEDICAL", label: "의료·바이오", jobs: ["간호", "임상", "바이오 연구", "의료기기"] },
  { value: "OTHERS", label: "기타", jobs: ["기타"] },
];

const steps: StepMeta[] = [
  { id: 1, label: "직군 선택", headline: "직군을 선택해주세요" },
  { id: 2, label: "추가 정보 입력", headline: "추가 정보를 입력해주세요" },
  { id: 3, label: "프로젝트 첨부", headline: "프로젝트를 첨부해주세요" },
  { id: 4, label: "태그와 소개글 입력", headline: "명함 태그와 소개글을 입력해주세요" },
];

function normalizeImageSrc(payload: UploadImageResponse): string {
  if (!payload) return "";

  const raw = typeof payload === "string" ? payload : payload?.imageUrl ?? payload?.url ?? payload?.data ?? "";
  const normalized = raw.trim();

  if (!normalized) return "";

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }

  const matchedUrl = normalized.match(/https?:\/\/\S+/)?.[0];
  if (matchedUrl) {
    return matchedUrl;
  }

  if (S3_BASE_URL) {
    return `${S3_BASE_URL.replace(/\/$/, "")}/${normalized.replace(/^\//, "")}`;
  }

  return "";
}

function getJobsByCategory(category: PortfolioCategory) {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.jobs ?? ["기타"];
}

export default function CreatePage() {
  if (process.env.NODE_ENV !== "production") {
    console.log("CREATE PAGE LOADED - 2026-02-06 v2");
  }

  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>(1);
  const [portfolioId, setPortfolioId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [profilePreview, setProfilePreview] = useState<string>(DEFAULT_PROFILE_IMG);
  const [profileName, setProfileName] = useState("회원");
  const [tagInput, setTagInput] = useState("");
  const [projectImagePreviews, setProjectImagePreviews] = useState<string[]>([""]);

  const [formData, setFormData] = useState<PortfolioData>({
    category: "DEVELOPMENT",
    subCategory: "백엔드",
    profileImg: DEFAULT_PROFILE_IMG,
    email: "",
    phone: "",
    location: "",
    projects: [{ projectName: "", projectSummary: "", projectLink: "", projectImg: "" }],
    summaryIntro: "",
    tags: [],
    layoutType: "CARD",
  });

  const isEditMode = searchParams.get("mode") === "edit";
  const requestedStep = Number(searchParams.get("step") || "1");

  useEffect(() => {
    const qsPortfolioId = Number(searchParams.get("portfolioId") || "0");
    const normalizedStep = requestedStep >= 1 && requestedStep <= 4 ? (requestedStep as Step) : 1;

    if (qsPortfolioId > 0) {
      setPortfolioId(qsPortfolioId);
      setStep(normalizedStep);
    }
  }, [requestedStep, searchParams]);

  useEffect(() => {
    const loadPortfolioDetail = async () => {
      if (!portfolioId || !isEditMode) return;

      try {
        setIsHydrating(true);
        const shareLinkResponse = await getPortfolioShareLink(portfolioId);
        const slug = shareLinkResponse?.data?.trim();

        if (!slug) {
          throw new Error("슬러그를 가져오지 못했습니다.");
        }

        const response = await getPortfolioDetail(slug);
        const detail = response?.data;
        if (!detail) return;

        setFormData((prev) => ({
          ...prev,
          category: detail.category || prev.category,
          subCategory: detail.subCategory || prev.subCategory,
          profileImg: detail.profileImg || prev.profileImg,
          email: detail.email || "",
          phone: detail.phone || "",
          location: detail.location || "",
          projects:
            detail.projects && detail.projects.length > 0
              ? detail.projects.map((project) => ({
                  projectName: project.projectName || "",
                  projectSummary: project.projectSummary || "",
                  projectLink: project.projectLink || "",
                  projectImg: project.projectImg || "",
                }))
              : prev.projects,
          summaryIntro: detail.summaryIntro || "",
          tags: detail.tags || [],
          layoutType: detail.layoutType || prev.layoutType,
        }));

        if (detail.profileImg) {
          setProfilePreview(detail.profileImg);
        }
      } catch (error) {
        console.error(error);
        alert("수정할 명함 정보를 불러오지 못했습니다.");
      } finally {
        setIsHydrating(false);
      }
    };

    loadPortfolioDetail();
  }, [isEditMode, portfolioId]);

  useEffect(() => {
    const profile = getStoredProfile();
    const savedProfileImg = localStorage.getItem("profileImg");

    if (profile?.name?.trim()) {
      setProfileName(profile.name.trim());
    }

    if (savedProfileImg?.trim()) {
      setProfilePreview(savedProfileImg);
      setFormData((prev) => ({ ...prev, profileImg: savedProfileImg }));
    }
  }, []);

  useEffect(() => {
    setProjectImagePreviews((prev) => {
      const next = formData.projects.map((project, index) => project.projectImg || prev[index] || "");
      return next.length > 0 ? next : [""];
    });
  }, [formData.projects]);
  // 입력 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  // 프로젝트 핸들러
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCategory = e.target.value as PortfolioCategory;
    const nextJobs = getJobsByCategory(nextCategory);
    setFormData((prev) => ({
      ...prev,
      category: nextCategory,
      subCategory: nextJobs[0] ?? "기타",
    }));
  };

  const handleProjectChange = (index: number, field: string, value: string) => {
    const newProjects = [...formData.projects];
    newProjects[index] = { ...newProjects[index], [field]: value };
    setFormData((prev) => ({ ...prev, projects: newProjects }));
  };

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setProfilePreview(localPreview);

    try {
      const uploaded = (await uploadImage(file)) as UploadImageResponse;
      const uploadedUrl = normalizeImageSrc(uploaded);
      const finalUrl = uploadedUrl || DEFAULT_PROFILE_IMG;

      setFormData((prev) => ({ ...prev, profileImg: finalUrl }));
      localStorage.setItem("profileImg", finalUrl);
    } catch (error) {
      console.error(error);
      setFormData((prev) => ({ ...prev, profileImg: DEFAULT_PROFILE_IMG }));
      localStorage.setItem("profileImg", DEFAULT_PROFILE_IMG);
      alert("이미지 업로드에 실패하여 기본 이미지가 사용됩니다.");
    }
  };

  const addTag = () => {
    const normalized = tagInput.trim();
    if (!normalized) return;
    if ((formData.tags?.length || 0) >= 5) {
      alert("태그는 최대 5개까지 등록 가능합니다.");
      return;
    }
    if (formData.tags?.includes(normalized)) {
      setTagInput("");
      return;
    }

    setFormData((prev) => ({ ...prev, tags: [...(prev.tags || []), normalized] }));
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: (prev.tags || []).filter((item) => item !== tag) }));
  };

  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      projects: [...prev.projects, { projectName: "", projectSummary: "", projectLink: "", projectImg: "" }],
    }));
    setProjectImagePreviews((prev) => [...prev, ""]);
  };

  const removeProject = (index: number) => {
    setFormData((prev) => {
      if (prev.projects.length === 1) return prev;
      return { ...prev, projects: prev.projects.filter((_, i) => i !== index) };
    });
    setProjectImagePreviews((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const getProjectLinks = (projectLink?: string) => {
    if (projectLink === undefined || projectLink === null || projectLink === "") {
      return [""];
    }

    const links = projectLink.split("\n").map((item) => item.trim());
    return links.length > 0 ? links : [""];
  };

  const updateProjectLinks = (projectIndex: number, links: string[]) => {
    handleProjectChange(projectIndex, "projectLink", links.join("\n"));
  };

  const addProjectLink = (projectIndex: number) => {
    const nextLinks = [...getProjectLinks(formData.projects[projectIndex]?.projectLink), ""];
    updateProjectLinks(projectIndex, nextLinks);
  };

  const removeProjectLink = (projectIndex: number, linkIndex: number) => {
    const currentLinks = getProjectLinks(formData.projects[projectIndex]?.projectLink);
    if (currentLinks.length <= 1) {
      updateProjectLinks(projectIndex, [""]);
      return;
    }
    const nextLinks = currentLinks.filter((_, idx) => idx !== linkIndex);
    updateProjectLinks(projectIndex, nextLinks);
  };

  const handleProjectLinkChange = (projectIndex: number, linkIndex: number, value: string) => {
    const nextLinks = getProjectLinks(formData.projects[projectIndex]?.projectLink);
    nextLinks[linkIndex] = value;
    updateProjectLinks(projectIndex, nextLinks);
  };

  const handleProjectImageChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setProjectImagePreviews((prev) => {
      const next = [...prev];
      next[index] = localPreview;
      return next;
    });

    try {
      const uploaded = (await uploadImage(file)) as UploadImageResponse;
      const uploadedUrl = normalizeImageSrc(uploaded);
      if (!uploadedUrl) {
        throw new Error("업로드된 이미지 URL이 비어있습니다.");
      }
      handleProjectChange(index, "projectImg", uploadedUrl);
      setProjectImagePreviews((prev) => {
        const next = [...prev];
        next[index] = uploadedUrl;
        return next;
      });
    } catch (error) {
      console.error(error);
      handleProjectChange(index, "projectImg", "");
      alert("프로젝트 이미지 업로드에 실패했습니다.");
    }
  };
  // 저장 및 다음 단계 이동
  const handleNext = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      if (process.env.NODE_ENV !== "production") {
        console.log("HANDLE NEXT formData", formData);
      }

      let body = {};
      // 단계별 데이터 매핑
      if (step === 1) {
        body = {
          category: formData.category,
          subCategory: formData.subCategory,
          profileImg: formData.profileImg || DEFAULT_PROFILE_IMG,
        };
      } else if (step === 2) {
        const normalizedEmail = formData.email.trim();
        if (!normalizedEmail) {
          alert("이메일은 필수 입력 항목입니다.");
          return;
        }

        body = {
          email: normalizedEmail,
          phone: formData.phone?.trim() || null,
          location: formData.location?.trim() || null,
        };
      } else if (step === 3) {
        body = {
          projects: formData.projects.map((project) => ({
            ...project,
            projectLink: getProjectLinks(project.projectLink)
              .map((link) => link.trim())
              .filter(Boolean)
              .join("\n"),
          })),
        };
      } else {
        body = {
          summaryIntro: formData.summaryIntro,
          tags: formData.tags || [],
        };
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("PAGE body", body);
      }

      // API 호출
      const res = await savePortfolioStep(step, body, portfolioId);
      // 1단계에서 받은 ID 저장 (이후 단계에서 필수)
      let nextPortfolioId = portfolioId;
      if (step === 1 && res.data) {
        nextPortfolioId = res.data;
        setPortfolioId(res.data);
      }

      if (isEditMode && nextPortfolioId) {
        if (step === 1) {
          if (!formData.email.trim()) {
            alert("이메일은 필수 입력 항목입니다.");
            return;
          }

          await savePortfolioStep(2, {
            email: formData.email.trim(),
            phone: formData.phone?.trim() || null,
            location: formData.location?.trim() || null,
          }, nextPortfolioId);
          await savePortfolioStep(3, {
            projects: formData.projects.map((project) => ({
              ...project,
              projectLink: getProjectLinks(project.projectLink)
                .map((link) => link.trim())
                .filter(Boolean)
                .join("\n"),
            })),
          }, nextPortfolioId);
          await savePortfolioStep(4, {
            summaryIntro: formData.summaryIntro,
            tags: formData.tags || [],
          }, nextPortfolioId);
          await savePortfolioStep(5, { layoutType: formData.layoutType }, nextPortfolioId);
          alert("명함이 수정되었습니다!");
          router.push("/cards");
          return;
        }
      }

      if (step < 4) {
        setStep((prev) => (prev + 1) as Step);
        window.scrollTo(0, 0);
      } else {
        if (!nextPortfolioId) {
          throw new Error("포트폴리오 ID가 없습니다.");
        }
        await savePortfolioStep(5, { layoutType: formData.layoutType }, nextPortfolioId);
        alert("포트폴리오 발행이 완료되었습니다!");
        router.push("/cards");
      }
    } catch (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다. 입력을 확인해주세요.");
    } finally {
      setIsSaving(false);
    }
  };
  // 헤더 텍스트 등 UI 헬퍼
  const stepHeadline = useMemo(() => (isEditMode ? "명함 정보를 한 번에 수정해주세요" : steps.find((s) => s.id === step)?.headline ?? ""), [isEditMode, step]);
  const stepNumber = useMemo(() => (isEditMode ? "EDIT" : String(step).padStart(2, "0")), [isEditMode, step]);
  const canGoPrev = step > 1 && !isEditMode;
  const subCategoryOptions = useMemo(() => getJobsByCategory(formData.category), [formData.category]);

  const profileEditor = (
    <div className={styles.profileCard}>
      <label className={styles.avatar}>
        <img
          src={profilePreview || DEFAULT_PROFILE_IMG}
          alt="프로필 이미지"
          className={styles.avatarImage}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = DEFAULT_PROFILE_IMG;
          }}
        />
        <span className={styles.avatarEdit}>✎</span>
        <input
          type="file"
          accept="image/*"
          className={styles.hiddenFileInput}
          onChange={handleProfileUpload}
        />
      </label>
      <div className={styles.profileName}>{profileName}</div>
    </div>
  );

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />

        <section className={`${styles.body} ${isEditMode ? styles.bodySingle : ""}`}>
          {!isEditMode && <aside className={styles.stepper}>
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
          </aside>}

          <div className={styles.content}>
            {(isEditMode || step !== 4) && (
              <div className={styles.stepHeader}>
                <span className={styles.stepNumber}>{stepNumber}</span>
                <h2 className={styles.stepHeadline}>{stepHeadline}</h2>
              </div>
            )}
            {/* Step 1: 직군 */}
            {(step === 1 && !isEditMode) && (
              <div className={styles.stepPanel}>
                {profileEditor}
                <div className={styles.formRow}>
                  <select name="category" value={formData.category} onChange={handleCategoryChange} className={styles.selectBox}>
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select name="subCategory" value={formData.subCategory} onChange={handleChange} className={styles.selectBox}>
                    {subCategoryOptions.map((job) => (
                      <option key={job} value={job}>
                        {job}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            {/* Step 2: 정보 */}
            {(step === 2 || isEditMode) && (
              <div className={styles.stepPanelColumn}>
                <div className={`${styles.stepPanel} ${styles.step2Panel}`}>
                  {profileEditor}
                  <div className={`${styles.formStack} ${styles.step2FormStack}`}>
                    <div className={styles.formRow}>
                      <select name="category" value={formData.category} onChange={handleCategoryChange} className={styles.selectBox}>
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select name="subCategory" value={formData.subCategory} onChange={handleChange} className={styles.selectBox}>
                        {subCategoryOptions.map((job) => (
                          <option key={job} value={job}>
                            {job}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input name="email" className={styles.textInputWide} placeholder="이메일을 입력해주세요." value={formData.email} onChange={handleChange} />
                    <input name="phone" className={styles.textInputWide} placeholder="전화번호를 입력해주세요. (선택, 010-0000-0000 형식으로 작성해주세요.)" value={formData.phone} onChange={handleChange} />
                    <input name="location" className={styles.textInputWide} placeholder="위치를 입력해주세요. (선택)" value={formData.location} onChange={handleChange} />
                  </div>
                </div>
              </div>
            )}
            {/* Step 3: 프로젝트 */}
            {(step === 3 || isEditMode) && (
              <div className={styles.projectPanel}>
                {formData.projects.map((proj, idx) => (
                  <div key={idx} className={styles.projectCard}>
                    <button className={styles.deleteProjectButton} type="button" onClick={() => removeProject(idx)}>
                      🗑️
                    </button>
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
                    <label className={styles.photoDrop}>
                      <input type="file" accept="image/*" className={styles.hiddenFileInput} onChange={(e) => handleProjectImageChange(idx, e)} />
                      {projectImagePreviews[idx] ? (
                        <img src={projectImagePreviews[idx]} alt="프로젝트 미리보기" className={styles.projectPreviewImage} />
                      ) : (
                        <>
                          <span className={styles.photoIcon}>🖼️</span>
                          <span>이미지를 첨부해 주세요. (선택)</span>
                        </>
                      )}
                    </label>
                    <div className={styles.projectLinksWrap}>
                      {getProjectLinks(proj.projectLink).map((link, linkIdx) => (
                        <div key={`${idx}-${linkIdx}`} className={styles.projectLinkRow}>
                          <input
                            className={styles.projectLinkInput}
                            placeholder="링크를 붙여넣어 주세요."
                            value={link}
                            onChange={(e) => handleProjectLinkChange(idx, linkIdx, e.target.value)}
                          />
                          <button type="button" className={styles.projectLinkIconButton} onClick={() => addProjectLink(idx)} aria-label="링크 추가">
                            ＋
                          </button>
                          {getProjectLinks(proj.projectLink).length > 1 && (
                            <button
                              type="button"
                              className={styles.projectLinkIconButton}
                              onClick={() => removeProjectLink(idx, linkIdx)}
                              aria-label="링크 삭제"
                            >
                              －
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button className={styles.projectAdd} type="button" onClick={addProject}>
                  <span className={styles.projectAddIcon}>＋</span>
                </button>
              </div>
            )}
            {/* Step 4: 소개 */}
            {(step === 4 || isEditMode) && (
              <div className={styles.bioPanel}>
                <section className={styles.subStepCard}>
                  <div className={styles.subStepHeader}>
                    <span className={styles.subStepNumber}>04</span>
                    <h3 className={styles.subStepTitle}>명함에 표시될 태그를 생성해주세요 (최대 5개)</h3>
                  </div>
                  <div className={styles.tagEditor}>
                    <input
                      className={styles.tagInput}
                      placeholder="예: 프론트엔드 · React · UX"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <button type="button" className={styles.tagAddButton} onClick={addTag}>
                      + 태그 추가
                    </button>
                  </div>
                  <div className={styles.tagList}>
                    {(formData.tags || []).map((tag) => (
                      <button key={tag} type="button" className={styles.tagChip} onClick={() => removeTag(tag)}>
                        #{tag} ×
                      </button>
                    ))}
                  </div>
                </section>

                <section className={styles.subStepCard}>
                  <div className={styles.subStepHeader}>
                    <span className={styles.subStepNumber}>05</span>
                    <h3 className={styles.subStepTitle}>당신의 페이지를 요약하는 소개글을 써주세요</h3>
                  </div>
                  <textarea
                    name="summaryIntro"
                    className={styles.bioInput}
                    placeholder="당신의 명함에 대해 설명해주세요. (선택)"
                    value={formData.summaryIntro}
                    onChange={handleChange}
                  />
                </section>
              </div>
            )}
          </div>
        </section>

        <div className={styles.navControls}>
          {!isEditMode ? (
            <button
              className={`${styles.navButton} ${styles.navButtonGhost}`}
              type="button"
              onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))}
              disabled={!canGoPrev || isSaving || isHydrating}
            >
              ←
            </button>
          ) : <span />}
          <button
            className={`${styles.navButton} ${styles.navButtonSolid} ${step === 4 ? styles.navButtonDone : ""}`}
            type="button"
            onClick={handleNext}
            disabled={isSaving || isHydrating}
          >
            {isSaving || isHydrating ? "저장 중..." : isEditMode ? "수정 완료" : step === 4 ? "✓" : "→"}
          </button>
        </div>
      </main>
    </div>
  );
}