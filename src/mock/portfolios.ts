// src/mock/portfolios.ts

export interface MockPortfolioDetail {
  id: number;
  // [UI용 추가 필드] 실제 API 응답엔 없지만 명함 표시를 위해 Mock에만 추가
  name: string; 
  category: string;
  subCategory: string; // -> Role로 매핑
  profileImg: string | null;
  email: string;
  phone: string;
  location: string;
  projects: {
    projectName: string;
    projectSummary: string;
    projectLink?: string;
  }[];
  summaryIntro: string | null; // -> Intro로 매핑
  layoutType: "CARD" | "LIST" | "GRID";
  updatedAt: string;
  totalViewCount: string | null;
  todayViewCount: string | null;
  owner: boolean;
  status: "DRAFT" | "PUBLISHED";
}

export const MOCK_PORTFOLIOS: MockPortfolioDetail[] = [
  {
    id: 101,
    name: "정원",
    category: "디자인",
    subCategory: "UI/UX Designer",
    profileImg: null, // 이미지 없으면 placeholder 사용
    email: "garden@example.com",
    phone: "010-1111-2222",
    location: "서울시 강남구",
    summaryIntro: "사용자 경험을 최우선으로 생각하는 디자이너입니다.",
    layoutType: "CARD",
    updatedAt: "2026-02-01T10:00:00",
    totalViewCount: "150",
    todayViewCount: "5",
    owner: false,
    status: "PUBLISHED",
    projects: [
      {
        projectName: "E-commerce 앱 리디자인",
        projectSummary: "사용자 구매 전환율 20% 상승 UI 개선",
        projectLink: "https://behance.net/example1",
      },
    ],
  },
  {
    id: 102,
    name: "제정모",
    category: "개발",
    subCategory: "Backend Engineer",
    profileImg: null,
    email: "jejeongmo@example.com",
    phone: "010-3333-4444",
    location: "경기도 성남시",
    summaryIntro: "확장 가능한 API 및 DB 설계를 전문으로 합니다.",
    layoutType: "LIST",
    updatedAt: "2026-02-02T09:30:00",
    totalViewCount: "320",
    todayViewCount: "12",
    owner: false,
    status: "PUBLISHED",
    projects: [
      {
        projectName: "대용량 트래픽 처리 시스템",
        projectSummary: "Kafka 기반 메시지 큐 시스템 구축",
        projectLink: "https://github.com/example/backend",
      },
    ],
  },
  {
    id: 103,
    name: "박준호",
    category: "기획",
    subCategory: "Product Manager",
    profileImg: null,
    email: "junho@example.com",
    phone: "010-5555-6666",
    location: "서울시 마포구",
    summaryIntro: "데이터 기반으로 문제를 정의하고 실행합니다.",
    layoutType: "GRID",
    updatedAt: "2026-01-28T14:20:00",
    totalViewCount: "85",
    todayViewCount: "2",
    owner: false,
    status: "PUBLISHED",
    projects: [],
  },
  {
    id: 104,
    name: "최서연",
    category: "개발",
    subCategory: "iOS Developer",
    profileImg: null,
    email: "seoyeon@example.com",
    phone: "010-7777-8888",
    location: "서울시 송파구",
    summaryIntro: "부드러운 인터랙션과 앱 최적화에 관심이 많습니다.",
    layoutType: "CARD",
    updatedAt: "2026-02-03T11:00:00",
    totalViewCount: "210",
    todayViewCount: "8",
    owner: false,
    status: "PUBLISHED",
    projects: [
      {
        projectName: "건강 관리 iOS 앱",
        projectSummary: "SwiftUI 기반 만보기 및 식단 기록 앱",
      },
    ],
  },
  {
    id: 105,
    name: "오지훈",
    category: "개발",
    subCategory: "DevOps Engineer",
    profileImg: null,
    email: "jihun@example.com",
    phone: "010-9999-0000",
    location: "부산시 해운대구",
    summaryIntro: "안정적인 배포 파이프라인과 인프라를 구축합니다.",
    layoutType: "LIST",
    updatedAt: "2026-02-01T15:45:00",
    totalViewCount: "110",
    todayViewCount: "4",
    owner: false,
    status: "PUBLISHED",
    projects: [
      {
        projectName: "AWS 인프라 자동화",
        projectSummary: "Terraform을 활용한 IaC 적용",
      },
    ],
  },
];
