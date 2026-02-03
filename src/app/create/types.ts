// src/app/create/types.ts

// 프로젝트 하나에 대한 정보
export interface Project {
  projectName: string;
  projectSummary: string;
  projectLink?: string;
}

// 전체 포트폴리오 데이터 구조
export interface PortfolioData {
  // Step 1
  category: string;
  subCategory: string;
  profileImg?: string;
  // Step 2
  email: string;
  phone?: string;
  location?: string;
  // Step 3
  projects: Project[];
  // Step 4
  summaryIntro: string;
  // Step 5 (반드시 대문자)
  layoutType: "CARD" | "LIST" | "GRID";
}

// 진행 단계 타입 (1~5)
export type StepType = 1 | 2 | 3 | 4 | 5;