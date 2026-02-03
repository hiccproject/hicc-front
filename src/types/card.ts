// src/types/card.ts

export type Card = {
  id: string;
  name: string;
  role?: string;
  intro?: string;
  profileImageUrl?: string; // 필요해지면 사용
};

// [NEW] 포트폴리오 페이지에서 사용하는 데이터 타입 정의
export interface Link {
  title: string;
  url: string;
}

export interface Project {
  title: string;
  projectSummary: string;
  image?: string;
  links: Link[];
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