const STORAGE_KEY = "portfolioProfileImages";

type PortfolioImageMap = Record<string, string>;

function readMap(): PortfolioImageMap {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PortfolioImageMap;
  } catch {
    return {};
  }
}

function writeMap(map: PortfolioImageMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getPortfolioProfileImage(portfolioId: number): string {
  if (typeof window === "undefined") return "";
  const map = readMap();
  return map[String(portfolioId)] || "";
}

export function setPortfolioProfileImage(portfolioId: number, imageUrl: string) {
  if (typeof window === "undefined") return;
  const normalized = imageUrl.trim();
  if (!normalized) return;
  const map = readMap();
  map[String(portfolioId)] = normalized;
  writeMap(map);
}

export function removePortfolioProfileImage(portfolioId: number) {
  if (typeof window === "undefined") return;
  const map = readMap();
  const key = String(portfolioId);
  if (!(key in map)) return;
  delete map[key];
  writeMap(map);
}
