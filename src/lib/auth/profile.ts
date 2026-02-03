export type MemberProfile = {
  name: string;
  email: string;
  password?: string;
};

const PROFILE_KEY = "memberProfile";

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

export function clearStoredProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_KEY);
}
