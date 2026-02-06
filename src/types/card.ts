// src/types/card.ts

// [UPDATED] 프로젝트 데이터 구조 변경
export interface Project {
  projectName: string;
  projectSummary: string;
  projectLink?: string; // 단일 링크 (GitHub 등)
}

export type Card = {
  id: string;
  name: string;
  role?: string;
  intro?: string;
  profileImage?: string;
  projects?: Project[];
};

export interface Link {
  title: string;
  url: string;
}

export interface PortfolioData {
  name: string;
  role: string;
  category: string;
  intro: string;
  email: string;
  phone: string;
  location: string;
  profileImg: string;
  projects: Project[];
}