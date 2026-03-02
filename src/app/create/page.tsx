// src/app/create/page.tsx
//
// 명함 생성/수정 페이지 (Step 1~5)
// - 신규 생성 모드: Stepper(1~5)를 따라 단계별로 저장(savePortfolioStep)하며 진행
// - 수정 모드(mode=edit): 기존 명함 데이터를 불러와 한 화면에서 한 번에 수정 후 저장
//
// 핵심 데이터 흐름
// 1) 신규 생성
//    - Step 1 저장 시 portfolioId를 서버에서 받아오고 이후 단계 저장에 사용
//    - Step 2~5는 portfolioId를 전달하며 단계별 업데이트
//    - 마지막 Step 5까지 저장되면 발행 완료로 간주하고 /cards로 이동
// 2) 수정(mode=edit)
//    - 쿼리에서 portfolioId를 받고, getPortfolioShareLink → slug → getPortfolioDetail로 상세 조회
//    - 폼을 서버 값으로 하이드레이션한 뒤 "수정 완료"를 누르면 2~5단계를 모두 순차 저장
//    - 이 코드에서는 수정 모드에서 Step 1 저장 버튼을 누르면 2~5를 한 번에 저장하도록 구성됨
//
// 로컬 스토리지 캐시(이미지)
// - 프로필 이미지: portfolio-images 스토리지에 저장/복원
// - 프로젝트 이미지: project-images 스토리지에 저장/복원
// - 이유: 업로드/저장 과정에서 이미지 URL이 일시적으로 비거나, 수정 모드에서 서버 값과 합칠 때
//         사용자 작업 내용이 유지되도록 하기 위함
//
// 저장 시 주의사항
// - isSaving: 저장 중 중복 클릭 방지
// - isHydrating: 수정 모드에서 초기 데이터 로딩 중 UI 잠금
// - isProfileUploading: 프로필 업로드 중에는 다음 단계 이동 금지(업로드 완료 후 저장이 안전)
//
// 구조상 검토/개선 여지(중요)
// A) 기본 category/subCategory 초기값
//    - 현재 formData 초기값이 DEVELOPMENT/백엔드로 고정되어 있어
//      "아무것도 선택 안한 상태" 요구사항이 있다면 초기값을 빈 값으로 두고 validation으로 강제하는 편이 맞음
// B) 수정 모드에서 savePortfolioStep 호출 순서/정합성
//    - 수정 모드에서 step===1일 때 2~5를 한 번에 저장하는 방식은 UX는 좋지만,
//      서버가 단계별 유효성/상태 머신을 강하게 갖고 있으면 실패할 수 있음
//      (서버 정책이 "반드시 step1→step2→..." 저장이 필요"인지 확인 필요)
// C) URL 정규화(normalizeImageSrc)
//    - 업로드 응답 포맷이 확정되면 불필요한 방어 로직은 줄여도 됨
// D) 프로젝트 링크 저장 포맷
//    - 여러 링크를 \n으로 저장하는 방식은 간단하지만, 추후 API가 배열을 요구하면 변환 필요

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import styles from "./create.module.css";
import {
  getPortfolioDetail,
  getPortfolioShareLink,
  savePortfolioStep,
  PortfolioCategory,
  PortfolioData,
} from "@/lib/api/cards";
import { uploadImage } from "@/lib/api/uploads";
import { getStoredProfile } from "@/lib/auth/profile";

// portfolio-images: portfolioId 단위로 프로필 이미지 URL을 저장/복원하는 로컬 스토리지 유틸
import {
  getPortfolioProfileImage,
  setPortfolioProfileImage,
} from "@/lib/storage/portfolio-images";

// project-images: portfolioId 단위로 프로젝트 이미지 배열을 저장/복원하는 로컬 스토리지 유틸
import {
  getPortfolioProjectImages,
  removePortfolioProjectImage,
  setPortfolioProjectImage,
  setPortfolioProjectImages,
} from "@/lib/storage/project-images";

// 레이아웃 선택 Step에서 미리보기로 보여줄 뷰 컴포넌트들
import CardView from "@/app/portfolio/components/CardView";
import ListView from "@/app/portfolio/components/ListView";
import GridView from "@/app/portfolio/components/GridView";
import type { PortfolioDetail } from "@/app/portfolio/page";

// Step: 생성/수정 플로우 단계(1~5)
type Step = 1 | 2 | 3 | 4 | 5;

// StepMeta: 스텝퍼/헤더에 사용할 UI 메타
type StepMeta = {
  id: Step;
  label: string;
  headline: string;
};

// 업로드 응답이 다양한 형태로 올 수 있어 유니온 타입으로 처리
type UploadImageResponse =
  | string
  | {
      data?: string;
      url?: string;
      imageUrl?: string;
    };

// S3_BASE_URL: 업로드 응답이 "키"만 올 때 URL로 조합하기 위한 base
const S3_BASE_URL = process.env.NEXT_PUBLIC_S3_BASE_URL ?? "";

type CategoryOption = {
  value: PortfolioCategory;
  label: string;
  jobs: string[];
};

const DEFAULT_PROFILE_IMG = "/default-avatar.png";

// 직군/서브직군(직무) 선택 옵션
const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: "DEVELOPMENT",
    label: "IT·개발",
    jobs: ["백엔드", "프론트엔드", "풀스택", "모바일", "DevOps", "데이터 엔지니어"],
  },
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

// 신규 생성 모드에서만 사용하는 Stepper/헤드라인 구성
const steps: StepMeta[] = [
  { id: 1, label: "직군 선택", headline: "직군을 선택해주세요" },
  { id: 2, label: "추가 정보 입력", headline: "추가 정보를 입력해주세요" },
  { id: 3, label: "프로젝트 첨부", headline: "프로젝트를 첨부해주세요" },
  { id: 4, label: "태그와 소개글 입력", headline: "명함 태그와 소개글을 입력해주세요" },
  { id: 5, label: "레이아웃 선택", headline: "명함 디자인을 선택해주세요 (예시 이미지)" },
];

// Step 5 레이아웃 선택 화면에서 보여줄 예시 데이터
// - 실제 저장되는 데이터가 아니라 UI 미리보기 용도
const PREVIEW_PORTFOLIO: PortfolioDetail = {
  id: 0,
  category: "DEVELOPMENT",
  subCategory: "프론트엔드",
  profileImg: null,
  email: "hello@example.com",
  phone: "010-1234-5678",
  location: "Seoul",
  projects: [
    {
      title: "One Page Me",
      projectSummary: "개인의 명함을 한 페이지로 구성하는 서비스.",
      image: null,
      links: [{ title: "homepage", url: "https://example.com" }],
    },
    {
      title: "Portfolio Kit",
      projectSummary: "포트폴리오 템플릿을 빠르게 만드는 도구.",
      image: null,
      links: [{ title: "docs", url: "https://example.com/docs" }],
    },
  ],
  summaryIntro: "안녕하세요! 프론트엔드 개발자입니다.",
  layoutType: "CARD",
  tags: ["React", "UI"],
  updatedAt: new Date().toISOString(),
  totalViewCount: 1280,
  todayViewCount: 32,
  username: "OnePage",
  owner: false,
};

// 업로드 응답을 실제 img src로 정규화
// - URL이면 그대로 사용
// - 텍스트에 URL이 섞여 있으면 추출
// - 키만 있으면 S3_BASE_URL과 조합
function normalizeImageSrc(payload: UploadImageResponse): string {
  if (!payload) return "";

  const raw =
    typeof payload === "string"
      ? payload
      : payload?.imageUrl ?? payload?.url ?? payload?.data ?? "";

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

// 카테고리에 맞는 직무 목록 반환
function getJobsByCategory(category: PortfolioCategory) {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.jobs ?? ["기타"];
}

export default function CreatePage() {
  // 개발 환경에서만 페이지 로드 로그를 찍어 디버깅을 쉽게 함
  if (process.env.NODE_ENV !== "production") {
    console.log("CREATE PAGE LOADED - 2026-02-06 v2");
  }

  const router = useRouter();
  const searchParams = useSearchParams();

  // step: 현재 진행 단계(신규 생성 모드에서만 의미가 큼)
  const [step, setStep] = useState<Step>(1);

  // portfolioId: Step 1 저장 시 서버에서 생성되는 명함 ID
  // 이후 단계 저장/수정에서 반드시 필요
  const [portfolioId, setPortfolioId] = useState<number | null>(null);

  // 저장/로딩 상태 플래그들
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const [isProfileUploading, setIsProfileUploading] = useState(false);

  // profilePreview: 프로필 이미지 미리보기(로컬 blob 또는 업로드 URL)
  const [profilePreview, setProfilePreview] = useState<string>(DEFAULT_PROFILE_IMG);

  // profileName: 화면 상단 프로필 카드에 표시할 이름(로그인 프로필에서 가져옴)
  const [profileName, setProfileName] = useState("회원");

  // 태그 입력 인풋 상태
  const [tagInput, setTagInput] = useState("");

  // 프로젝트 이미지 미리보기 배열
  // - formData.projects[i].projectImg 값과 같이 움직이되,
  //   업로드 직후 blob preview를 보여주는 목적도 있음
  const [projectImagePreviews, setProjectImagePreviews] = useState<string[]>([""]);

  // formData: 생성/수정 폼의 단일 소스 오브 트루스
  // - step별로 일부 필드만 저장하지만, 전체를 한 곳에 보관
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

  // edit 모드: ?mode=edit 로 진입
  const isEditMode = searchParams.get("mode") === "edit";

  // requestedStep: 쿼리로 step을 강제할 수 있음(?step=3 등)
  const requestedStep = Number(searchParams.get("step") || "1");

  // 쿼리에서 portfolioId/step을 읽어 초기 상태를 맞춤
  // - 수정 모드에서 특정 step부터 진입시키거나, 포트폴리오를 지정할 수 있음
  useEffect(() => {
    const qsPortfolioId = Number(searchParams.get("portfolioId") || "0");
    const normalizedStep =
      requestedStep >= 1 && requestedStep <= 5 ? (requestedStep as Step) : 1;

    if (qsPortfolioId > 0) {
      setPortfolioId(qsPortfolioId);
      setStep(normalizedStep);
    }
  }, [requestedStep, searchParams]);

  // 수정 모드일 때 기존 명함 데이터를 불러와 폼을 채움
  // - portfolioId → shareLink(slug) → detail 조회 순서
  // - 프로젝트 이미지는 서버 값 + 로컬 캐시를 index 기준으로 병합
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

        // 로컬에 임시 저장된 프로젝트 이미지가 있으면 우선 병합
        const localProjectImages = portfolioId ? getPortfolioProjectImages(portfolioId) : [];

        const mergedProjects =
          detail.projects && detail.projects.length > 0
            ? detail.projects.map((project, index) => ({
                projectName: project.projectName || "",
                projectSummary: project.projectSummary || "",
                projectLink: project.projectLink || "",
                projectImg: project.projectImg || localProjectImages[index] || "",
              }))
            : null;

        // 서버 값으로 폼 데이터 하이드레이션
        setFormData((prev) => ({
          ...prev,
          category: detail.category || prev.category,
          subCategory: detail.subCategory || prev.subCategory,
          profileImg: detail.profileImg || prev.profileImg,
          email: detail.email || "",
          phone: detail.phone || "",
          location: detail.location || "",
          projects: mergedProjects ?? prev.projects,
          summaryIntro: detail.summaryIntro || "",
          tags: detail.tags || [],
          layoutType: detail.layoutType || prev.layoutType,
        }));

        // 프로필 이미지는 서버 값이 없을 때 로컬 캐시로 보강
        const fallbackProfileImg = portfolioId ? getPortfolioProfileImage(portfolioId) : "";
        const resolvedProfileImg = detail.profileImg || fallbackProfileImg || "";
        if (resolvedProfileImg) {
          setProfilePreview(resolvedProfileImg);
          setFormData((prev) => ({ ...prev, profileImg: resolvedProfileImg }));
        }

        // 병합된 프로젝트 이미지들을 로컬 캐시에도 다시 저장해둬서
        // 새로고침/재진입 시 동일하게 복원되도록 함
        if (portfolioId && mergedProjects) {
          const nextImages = mergedProjects.map((project) => project.projectImg || "");
          setPortfolioProjectImages(portfolioId, nextImages);
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

  // 로그인 프로필에서 이름을 가져와 프로필 카드에 표시
  // - "회원" 대신 실제 이름이 있으면 반영
  useEffect(() => {
    const profile = getStoredProfile();
    if (profile?.name?.trim()) {
      setProfileName(profile.name.trim());
    }
  }, []);

  // formData.projects의 projectImg 변화에 따라 미리보기 배열을 동기화
  // - 서버 하이드레이션/업로드 후에도 UI 미리보기가 맞도록 유지
  useEffect(() => {
    setProjectImagePreviews((prev) => {
      const next = formData.projects.map((project, index) => project.projectImg || prev[index] || "");
      return next.length > 0 ? next : [""];
    });
  }, [formData.projects]);

  // 공용 input/textarea/select 변경 핸들러
  // - name 속성에 맞춰 formData의 같은 키를 업데이트
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 카테고리 변경 시 해당 카테고리의 첫 직무를 기본 선택으로 맞춤
  // - 서브카테고리 옵션이 카테고리에 종속되어 있으므로 같이 업데이트
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCategory = e.target.value as PortfolioCategory;
    const nextJobs = getJobsByCategory(nextCategory);

    setFormData((prev) => ({
      ...prev,
      category: nextCategory,
      subCategory: nextJobs[0] ?? "기타",
    }));
  };

  // 프로젝트 필드 업데이트(배열 인덱스 기반)
  const handleProjectChange = (index: number, field: string, value: string) => {
    const newProjects = [...formData.projects];
    newProjects[index] = { ...newProjects[index], [field]: value };
    setFormData((prev) => ({ ...prev, projects: newProjects }));
  };

  // 프로필 이미지 업로드
  // - blob preview를 먼저 보여주고, 업로드 성공 시 URL로 교체
  // - portfolioId가 있으면 로컬 캐시에도 저장하여 새로고침 시 복원 가능
  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setProfilePreview(localPreview);
    setIsProfileUploading(true);

    try {
      const uploaded = (await uploadImage(file)) as UploadImageResponse;
      const uploadedUrl = normalizeImageSrc(uploaded);
      const finalUrl = uploadedUrl || DEFAULT_PROFILE_IMG;

      setFormData((prev) => ({ ...prev, profileImg: finalUrl }));

      if (portfolioId) {
        setPortfolioProfileImage(portfolioId, finalUrl);
      }
    } catch (error) {
      console.error(error);
      setFormData((prev) => ({ ...prev, profileImg: DEFAULT_PROFILE_IMG }));
      alert("이미지 업로드에 실패하여 기본 이미지가 사용됩니다.");
    } finally {
      setIsProfileUploading(false);
    }
  };

  // 태그 추가
  // - 공백 제거 후 빈 값은 무시
  // - 최대 5개 제한
  // - 중복 태그는 무시
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

  // 태그 삭제
  const removeTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: (prev.tags || []).filter((item) => item !== tag) }));
  };

  // 프로젝트 추가
  // - 빈 프로젝트 한 개를 추가하고, 미리보기 배열도 동일하게 확장
  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      projects: [...prev.projects, { projectName: "", projectSummary: "", projectLink: "", projectImg: "" }],
    }));
    setProjectImagePreviews((prev) => [...prev, ""]);
  };

  // 프로젝트 삭제
  // - 최소 1개는 유지(전체 삭제 방지)
  // - portfolioId가 있으면 로컬 캐시에서도 해당 인덱스 제거
  const removeProject = (index: number) => {
    setFormData((prev) => {
      if (prev.projects.length === 1) return prev;
      return { ...prev, projects: prev.projects.filter((_, i) => i !== index) };
    });

    setProjectImagePreviews((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });

    if (portfolioId) {
      removePortfolioProjectImage(portfolioId, index);
    }
  };

  // projectLink는 여러 개를 \n으로 저장하는 구조
  // - UI에서는 배열처럼 다루고, 저장 시 다시 문자열로 합침
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

  // 프로젝트 이미지 업로드
  // - 선택 직후 blob preview 표시 → 업로드 성공 시 URL 반영
  // - portfolioId가 있으면 로컬 캐시에도 저장
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

      if (portfolioId) {
        setPortfolioProjectImage(portfolioId, index, uploadedUrl);
      }
    } catch (error) {
      console.error(error);
      handleProjectChange(index, "projectImg", "");
      alert("프로젝트 이미지 업로드에 실패했습니다.");
    }
  };

  // 저장 payload로 변환할 프로젝트 목록 생성
  // - 링크는 개행 기준 문자열로 저장하되, 공백/빈 줄을 정리
  // - 프로젝트가 완전히 비어있으면 payload에서 제외(불필요한 빈 프로젝트 저장 방지)
  // - 이미지 URL이 비어있으면 로컬 캐시에서 보강
  const buildProjectPayloads = () => {
    const localProjectImages = portfolioId ? getPortfolioProjectImages(portfolioId) : [];

    return formData.projects
      .map((project, index) => {
        const normalizedLinks = getProjectLinks(project.projectLink)
          .map((link) => link.trim())
          .filter(Boolean)
          .join("\n");

        return {
          ...project,
          projectImg: project.projectImg || localProjectImages[index] || "",
          projectLink: normalizedLinks,
        };
      })
      .filter((project) => {
        return Boolean(
          project.projectName?.trim() ||
          project.projectSummary?.trim() ||
          project.projectLink?.trim() ||
          project.projectImg?.trim()
        );
      });
  };

  // 이메일 유효성 검사(간단 정규식)
  const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // 다음 단계 저장 및 이동
  // - step별로 body를 다르게 만들어 savePortfolioStep 호출
  // - step 1에서 portfolioId가 생성되면 상태에 저장
  // - 수정 모드에서 step 1 저장을 누르면 2~5까지 한 번에 저장하고 종료
  const handleNext = async () => {
    if (isSaving) return;

    // 프로필 업로드 중에는 profileImg가 확정되지 않을 수 있으므로 이동을 막음
    if (isProfileUploading) {
      alert("프로필 이미지 업로드 중입니다. 업로드 완료 후 다시 시도해주세요.");
      return;
    }

    setIsSaving(true);

    try {
      if (process.env.NODE_ENV !== "production") {
        console.log("HANDLE NEXT formData", formData);
      }

      let body = {};

      // 단계별 payload 구성
      if (step === 1) {
        body = {
          category: formData.category,
          subCategory: formData.subCategory,
          profileImg: formData.profileImg || DEFAULT_PROFILE_IMG,
        };
      } else if (step === 2) {
        const normalizedEmail = formData.email.trim();

        // 이메일은 필수
        if (!normalizedEmail) {
          alert("이메일은 필수 입력 항목입니다.");
          return;
        }

        if (!isValidEmail(normalizedEmail)) {
          alert("이메일 형식을 다시 확인해주세요.");
          return;
        }

        body = {
          email: normalizedEmail,
          phone: formData.phone?.trim() || null,
          location: formData.location?.trim() || null,
        };
      } else if (step === 3) {
        body = {
          projects: buildProjectPayloads(),
        };
      } else if (step === 4) {
        body = {
          summaryIntro: formData.summaryIntro,
          tags: formData.tags || [],
        };
      } else {
        body = {
          layoutType: formData.layoutType,
        };
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("PAGE body", body);
      }

      // step 저장 API 호출
      const res = await savePortfolioStep(step, body, portfolioId);

      // Step 1에서 서버가 생성한 portfolioId를 반환하면 저장
      let nextPortfolioId = portfolioId;
      if (step === 1 && res.data) {
        nextPortfolioId = res.data;
        setPortfolioId(res.data);

        // Step 1에서 선택한 프로필 이미지를 로컬 캐시에 저장
        if (formData.profileImg) {
          setPortfolioProfileImage(res.data, formData.profileImg);
        }
      }

      // 수정 모드: step1 버튼을 "전체 수정 완료"로 사용
      // - 2~5를 순차적으로 저장하고 /cards로 이동
      if (isEditMode && nextPortfolioId) {
        if (step === 1) {
          if (!formData.email.trim()) {
            alert("이메일은 필수 입력 항목입니다.");
            return;
          }
          if (!isValidEmail(formData.email.trim())) {
            alert("이메일 형식을 다시 확인해주세요.");
            return;
          }

          await savePortfolioStep(
            2,
            {
              email: formData.email.trim(),
              phone: formData.phone?.trim() || null,
              location: formData.location?.trim() || null,
            },
            nextPortfolioId
          );

          await savePortfolioStep(
            3,
            {
              projects: buildProjectPayloads(),
            },
            nextPortfolioId
          );

          await savePortfolioStep(
            4,
            {
              summaryIntro: formData.summaryIntro,
              tags: formData.tags || [],
            },
            nextPortfolioId
          );

          await savePortfolioStep(5, { layoutType: formData.layoutType }, nextPortfolioId);

          alert("명함이 수정되었습니다!");
          router.push("/cards");
          return;
        }
      }

      // 신규 생성: 다음 스텝으로 이동
      if (step < 5) {
        setStep((prev) => (prev + 1) as Step);
        window.scrollTo(0, 0);
      } else {
        // 마지막 단계 저장 완료 → 발행 완료 처리
        if (!nextPortfolioId) {
          throw new Error("명함 ID가 없습니다.");
        }
        alert("명함 발행이 완료되었습니다!");
        router.push("/cards");
      }
    } catch (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다. 입력을 확인해주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  // UI 보조 계산들
  // - edit 모드에서는 Stepper 대신 "한 번에 수정" 형태로 문구를 바꿈
  const stepHeadline = useMemo(
    () => (isEditMode ? "명함 정보를 한 번에 수정해주세요" : steps.find((s) => s.id === step)?.headline ?? ""),
    [isEditMode, step]
  );

  const stepNumber = useMemo(
    () => (isEditMode ? "EDIT" : String(step).padStart(2, "0")),
    [isEditMode, step]
  );

  // 신규 생성일 때만 이전 버튼 활성화(수정 모드는 단일 완료 버튼만 사용)
  const canGoPrev = step > 1 && !isEditMode;

  // subCategory 옵션은 category에 종속
  const subCategoryOptions = useMemo(() => getJobsByCategory(formData.category), [formData.category]);

  // 프로필 카드 UI(여러 step에서 반복 사용)
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
    <div className={`${styles.bg} ${isEditMode ? styles.bgEdit : ""}`}>
      <div className={styles.headerWrap}>
        <Header />
      </div>

      <main className={`${styles.shell} ${isEditMode ? styles.shellEdit : ""}`}>
        <section className={`${styles.body} ${isEditMode ? styles.bodySingle : ""}`}>
          {/* 신규 생성 모드에서만 Stepper 표시 */}
          {!isEditMode && (
             <>
              {/* 모바일 전용: 상단 가로 진행바 */}
              <div className={styles.mobileStepper} aria-label="생성 진행 단계">
                <div className={styles.mobileProgress}>
                  {steps.map((s) => (
                    <div
                      key={s.id}
                      className={`${styles.mobileProgressSeg} ${s.id <= step ? styles.mobileProgressSegActive : ""}`}
                    />
                  ))}
                </div>
              </div>

              {/* 데스크톱 전용: 기존 세로 Stepper 유지 */}
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
            </>
          )}

          <div className={`${styles.content} ${isEditMode ? styles.contentEdit : ""}`}>
            {/* 신규 생성 모드에서 step 4는 자체 헤더 구조를 쓰므로 제외 */}
            {!isEditMode && step !== 4 && (
              <div className={`${styles.stepHeader} ${isEditMode ? styles.stepHeaderEdit : ""}`}>
                <span className={styles.stepNumber}>{stepNumber}</span>
                <h2 className={styles.stepHeadline}>{stepHeadline}</h2>
              </div>
            )}

            {/* Step 1: 직군 선택(신규 생성에서만 보여줌) */}
            {step === 1 && !isEditMode && (
              <div className={styles.stepPanel}>
                {profileEditor}
                <div className={styles.formRow}>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleCategoryChange}
                    className={styles.selectBox}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={handleChange}
                    className={styles.selectBox}
                  >
                    {subCategoryOptions.map((job) => (
                      <option key={job} value={job}>
                        {job}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Step 2: 추가 정보 입력(신규 step2 + 수정 모드에서 항상 노출) */}
            {(step === 2 || isEditMode) && (
              <div className={styles.stepPanelColumn}>
                {isEditMode && (
                  <div className={`${styles.stepHeader} ${styles.stepHeaderEdit}`}>
                    <span className={styles.stepNumber}>01</span>
                    <h2 className={styles.stepHeadline}>추가 정보를 입력해주세요</h2>
                  </div>
                )}

                {/* ✅ Step2에서는 profileEditor/직군선택 UI 제거 */}
                <div className={`${styles.stepPanel} ${styles.step2Panel}`}>
                  <div className={`${styles.formStack} ${styles.step2FormStack}`}>
                    <div className={styles.fieldGroup}>
                      <div className={styles.fieldLabel}>이메일 (필수)</div>
                      <input
                        name="email"
                        className={styles.textInputWide}
                        value={formData.email}
                        onChange={handleChange}
                        placeholder=""  // 스샷처럼 라벨이 위에 있으니 비워도 됨
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <div className={styles.fieldLabel}>전화번호 (선택)</div>
                      <input
                        name="phone"
                        className={styles.textInputWide}
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder=""
                      />
                    </div>

                    <div className={styles.fieldGroup}>
                      <div className={styles.fieldLabel}>위치 (선택)</div>
                      <input
                        name="location"
                        className={styles.textInputWide}
                        value={formData.location}
                        onChange={handleChange}
                        placeholder=""
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: 프로젝트 첨부 */}
            {(step === 3 || isEditMode) && (
              <div className={styles.stepPanelColumn}>
                {isEditMode && (
                  <div className={`${styles.stepHeader} ${styles.stepHeaderEdit}`}>
                    <span className={styles.stepNumber}>02</span>
                    <h2 className={styles.stepHeadline}>프로젝트를 첨부해주세요</h2>
                  </div>
                )}

                <div className={styles.projectPanel}>
                  {formData.projects.map((proj, idx) => (
                    <div key={idx} className={styles.projectCard}>
                      {/* 최소 1개 유지 정책 때문에 removeProject 내부에서 방어 */}
                      <button
                        className={styles.deleteProjectButton}
                        type="button"
                        onClick={() => removeProject(idx)}
                      >
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

                      {/* 프로젝트 이미지 업로드 */}
                      <label className={styles.photoDrop}>
                        <input
                          type="file"
                          accept="image/*"
                          className={styles.hiddenFileInput}
                          onChange={(e) => handleProjectImageChange(idx, e)}
                        />

                        {projectImagePreviews[idx] ? (
                          <img
                            src={projectImagePreviews[idx]}
                            alt="프로젝트 미리보기"
                            className={styles.projectPreviewImage}
                          />
                        ) : (
                          <>
                            <span className={styles.photoIcon}>🖼️</span>
                            <span>이미지를 첨부해 주세요. (선택)</span>
                          </>
                        )}
                      </label>

                      {/* 프로젝트 링크 입력(여러 줄) */}
                      <div className={styles.projectLinksWrap}>
                        {getProjectLinks(proj.projectLink).map((link, linkIdx) => (
                          <div key={`${idx}-${linkIdx}`} className={styles.projectLinkRow}>
                            <input
                              className={styles.projectLinkInput}
                              placeholder="링크를 붙여넣어 주세요."
                              value={link}
                              onChange={(e) => handleProjectLinkChange(idx, linkIdx, e.target.value)}
                            />

                            <button
                              type="button"
                              className={styles.projectLinkIconButton}
                              onClick={() => addProjectLink(idx)}
                              aria-label="링크 추가"
                            >
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
              </div>
            )}

            {/* Step 4: 태그/소개글 */}
            {(step === 4 || isEditMode) && (
              <div className={styles.bioPanel}>
                <section className={styles.subStepCard}>
                  <div className={styles.subStepHeader}>
                    <span className={styles.subStepNumber}>{isEditMode ? "03" : "04-1"}</span>
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
                      <button
                        key={tag}
                        type="button"
                        className={styles.tagChip}
                        onClick={() => removeTag(tag)}
                      >
                        #{tag} ×
                      </button>
                    ))}
                  </div>
                </section>

                <section className={styles.subStepCard}>
                  <div className={styles.subStepHeader}>
                    <span className={styles.subStepNumber}>{isEditMode ? "04" : "04-2"}</span>
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

            {/* Step 5: 레이아웃 선택 */}
            {(step === 5 || isEditMode) && (
              <div className={styles.layoutPanel}>
                {isEditMode && (
                  <div className={`${styles.stepHeader} ${styles.stepHeaderEdit}`}>
                    <span className={styles.stepNumber}>05</span>
                    <h2 className={styles.stepHeadline}>명함 디자인을 선택해주세요 (예시 이미지)</h2>
                  </div>
                )}

                <div className={styles.layoutGrid}>
                  {[
                    { value: "CARD", label: "카드형", desc: "정보를 카드처럼 한 눈에 보여줘요." },
                    { value: "LIST", label: "리스트형", desc: "내용을 순서대로 자연스럽게 보여줘요." },
                    { value: "GRID", label: "그리드형", desc: "프로젝트를 타일처럼 강조해요." },
                  ].map((option) => {
                    const isSelected = formData.layoutType === option.value;

                    // 각 레이아웃별 예시 프리뷰를 렌더링
                    const preview =
                      option.value === "CARD" ? (
                        <CardView data={PREVIEW_PORTFOLIO} canViewStats={false} />
                      ) : option.value === "LIST" ? (
                        <ListView data={PREVIEW_PORTFOLIO} isOwner={false} />
                      ) : (
                        <GridView data={PREVIEW_PORTFOLIO} isOwner={false} />
                      );

                    return (
                      <div
                        key={option.value}
                        className={`${styles.layoutOption} ${isSelected ? styles.layoutOptionActive : ""}`}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          setFormData((prev) => ({
                            ...prev,
                            layoutType: option.value as PortfolioData["layoutType"],
                          }));
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setFormData((prev) => ({
                              ...prev,
                              layoutType: option.value as PortfolioData["layoutType"],
                            }));
                          }
                        }}
                      >
                        <div className={styles.layoutPreviewFrame}>
                          <div className={styles.layoutPreviewCanvas}>{preview}</div>
                        </div>
                        <div className={styles.layoutMeta}>
                          <span className={styles.layoutTitle}>{option.label}</span>
                          <span className={styles.layoutDesc}>{option.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 하단 네비게이션 버튼(신규 생성: 이전/다음, 수정: 완료) */}
        <div className={`${styles.navControls} ${isEditMode ? styles.navControlsFloating : ""}`}>
          {!isEditMode ? (
            <button
              className={`${styles.navButton} ${styles.navButtonGhost} ${styles.navButtonWide}`}
              type="button"
              onClick={() => {
                if (step === 1) router.push("/"); // ✅ 모바일 스샷처럼 "취소" 느낌
                else setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
              }}
              disabled={isSaving || isHydrating}
            >
              <span className={styles.navIcon}>←</span>
              <span className={styles.navText}>{step === 1 ? "취소" : "이전"}</span>
            </button>
          ) : null}

          <button
            className={`${styles.navButton} ${styles.navButtonSolid} ${styles.navButtonWide} ${
              isEditMode ? styles.navButtonDone : ""
            }`}
            type="button"
            onClick={handleNext}
            disabled={isSaving || isHydrating}
          >
            <span className={styles.navIcon}>
              {isSaving || isHydrating ? "" : isEditMode ? "✓" : step === 5 ? "✓" : "→"}
            </span>
            <span className={styles.navText}>
              {isSaving || isHydrating ? "저장 중..." : isEditMode ? "수정 완료" : step === 5 ? "완료" : "다음"}
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}