// src/types/card.ts

export interface Project {
  projectName: string;
  projectSummary: string;
  projectLink?: string; // 단일 링크 (GitHub 등)
}

export type Card = {
  id: string;
  name: string;
  username?: string | null;
  role?: string;
  intro?: string;
  profileImage?: string;
  projects?: Project[];
  status?: "DRAFT" | "PUBLISHED";
  isPublic?: boolean;
  isMine?: boolean;
  badge?: string;
  linkHref?: string;
  tags?: string[];
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  category?: string | null;
  subCategory?: string | null;
  progressMode?: "single" | "multiple";
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
