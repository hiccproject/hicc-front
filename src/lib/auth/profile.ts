export type MemberProfile = {
  name: string;
  email: string;
  password?: string;
};

const PROFILE_KEY = "memberProfile";
const PROFILE_NAME_MAP_KEY = "memberProfileNameByEmail";

type StoredNameMap = Record<string, string>;

function getStoredNameMap(): StoredNameMap {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(PROFILE_NAME_MAP_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StoredNameMap;
  } catch {
    return {};
  }
}

function setStoredNameMap(map: StoredNameMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_NAME_MAP_KEY, JSON.stringify(map));
}

export function getStoredProfile(): MemberProfile | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MemberProfile;
  } catch {
    return null;
  }
}

export function setStoredProfile(profile: MemberProfile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function setStoredNameForEmail(email: string, name: string) {
  if (typeof window === "undefined") return;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !name.trim()) return;
  const map = getStoredNameMap();
  map[normalizedEmail] = name;
  setStoredNameMap(map);
}

export function removeStoredNameForEmail(email: string) {
  if (typeof window === "undefined") return;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;
  const map = getStoredNameMap();
  if (!(normalizedEmail in map)) return;
  delete map[normalizedEmail];
  setStoredNameMap(map);
}

export function getStoredNameForLogin(identifier: string) {
  if (typeof window === "undefined") return "";
  const normalizedIdentifier = identifier.trim().toLowerCase();
  if (!normalizedIdentifier) return "";
  const map = getStoredNameMap();
  if (normalizedIdentifier.includes("@")) {
    return map[normalizedIdentifier] ?? "";
  }
  const entry = Object.entries(map).find(([email]) => {
    const localPart = email.split("@")[0];
    return localPart === normalizedIdentifier;
  });
  return entry?.[1] ?? "";
}

export function clearStoredProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_KEY);
}

export function clearStoredNameMap() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_NAME_MAP_KEY);
}

export function clearStoredProfileImage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("profileImg");
}
