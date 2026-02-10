const STORAGE_KEY = "portfolioProjectImages";

type PortfolioProjectImageMap = Record<string, string[]>;

function readMap(): PortfolioProjectImageMap {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as PortfolioProjectImageMap;
  } catch {
    return {};
  }
}

function writeMap(map: PortfolioProjectImageMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function normalizeUrl(url: string) {
  return url.trim();
}

function pruneEmpty(images: string[]) {
  return images.every((item) => !item) ? [] : images;
}

export function getPortfolioProjectImages(portfolioId: number): string[] {
  if (typeof window === "undefined") return [];
  const map = readMap();
  return map[String(portfolioId)] || [];
}

export function getPortfolioProjectImage(portfolioId: number, index: number): string {
  if (typeof window === "undefined") return "";
  const images = getPortfolioProjectImages(portfolioId);
  return images[index] || "";
}

export function setPortfolioProjectImage(portfolioId: number, index: number, imageUrl: string) {
  if (typeof window === "undefined") return;
  const normalized = normalizeUrl(imageUrl);
  const map = readMap();
  const key = String(portfolioId);
  const next = [...(map[key] || [])];
  while (next.length <= index) next.push("");
  next[index] = normalized;
  map[key] = pruneEmpty(next);
  writeMap(map);
}

export function setPortfolioProjectImages(portfolioId: number, images: string[]) {
  if (typeof window === "undefined") return;
  const normalized = images.map((img) => normalizeUrl(img || ""));
  const map = readMap();
  map[String(portfolioId)] = pruneEmpty(normalized);
  writeMap(map);
}

export function removePortfolioProjectImage(portfolioId: number, index: number) {
  if (typeof window === "undefined") return;
  const map = readMap();
  const key = String(portfolioId);
  const current = map[key];
  if (!current) return;
  const next = current.filter((_, idx) => idx !== index);
  if (next.length === 0 || next.every((item) => !item)) {
    delete map[key];
  } else {
    map[key] = next;
  }
  writeMap(map);
}
