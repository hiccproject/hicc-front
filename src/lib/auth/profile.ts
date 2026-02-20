// (예: src/lib/auth/profile.ts)
// 목적
// - 로그인/회원가입 UI에서 사용할 "간단한 프로필 캐시"를 localStorage에 저장/조회
// - memberProfile: 마지막으로 저장한 프로필(이름/이메일/옵션 비밀번호)
// - memberProfileNameByEmail: 이메일별 이름 매핑(로그인 화면에서 이름을 자동 채워주는 용도)
//
// 구현에서 특히 중요한 점
// - Next.js 환경에서 SSR 시 window/localStorage 접근하면 에러가 나므로 typeof window 체크가 필수
// - localStorage는 사용자가 지울 수 있고, 형식이 깨질 수 있으므로 JSON.parse는 항상 try/catch로 보호
// - 이메일 키는 대소문자/공백 차이로 중복 저장되기 쉬워서 trim + lowerCase로 정규화한다.

export type MemberProfile = {
  name: string;
  email: string;
  password?: string; // 주의: 비밀번호를 localStorage에 저장하는 것은 보안상 매우 취약할 수 있음(아래 주석 참고)
};

const PROFILE_KEY = "memberProfile";
const PROFILE_NAME_MAP_KEY = "memberProfileNameByEmail";

// StoredNameMap: { "user@example.com": "민서", ... } 형태의 email -> name 매핑
type StoredNameMap = Record<string, string>;

function getStoredNameMap(): StoredNameMap {
  // SSR(서버 렌더링)에서는 window가 없으므로 빈 객체 반환
  if (typeof window === "undefined") return {};

  const raw = localStorage.getItem(PROFILE_NAME_MAP_KEY);
  if (!raw) return {};

  try {
    // 저장된 값이 JSON이 아니거나 깨졌을 수 있으니 안전 파싱
    return JSON.parse(raw) as StoredNameMap;
  } catch {
    // 파싱 실패 시 데이터는 신뢰 불가 → 초기화된 상태로 간주
    return {};
  }
}

function setStoredNameMap(map: StoredNameMap) {
  // 브라우저 환경에서만 localStorage 사용
  if (typeof window === "undefined") return;

  // 객체를 문자열로 직렬화해 저장
  localStorage.setItem(PROFILE_NAME_MAP_KEY, JSON.stringify(map));
}

export function getStoredProfile(): MemberProfile | null {
  // SSR 방어
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;

  try {
    // profile 저장 포맷이 깨졌거나 수동 수정되었을 수 있으니 try/catch 필수
    return JSON.parse(raw) as MemberProfile;
  } catch {
    // 파싱 실패 시 프로필이 없는 것으로 취급
    return null;
  }
}

export function setStoredProfile(profile: MemberProfile) {
  // SSR 방어
  if (typeof window === "undefined") return;

  // 프로필 객체를 JSON으로 저장
  // 중요한 검토 포인트:
  // - profile.password를 저장할 수 있게 열어둔 구조인데,
  //   실제로 저장한다면 XSS나 공유 PC 환경에서 매우 위험하다.
  // - 실무에서는 보통 password는 절대 저장하지 않는다.
  // - 이 필드는 "회원가입 직후 폼 상태 유지" 같은 임시 UX 목적으로만 잠깐 쓰고 즉시 지우는 설계가 안전하다.
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function setStoredNameForEmail(email: string, name: string) {
  // SSR 방어
  if (typeof window === "undefined") return;

  // 이메일은 대소문자/공백 차이로 다른 키로 저장되는 실수가 잦아서 정규화한다.
  const normalizedEmail = email.trim().toLowerCase();

  // 빈 값 방어: 이메일이 없거나 이름이 공백이면 저장하지 않음
  if (!normalizedEmail || !name.trim()) return;

  // 현재 저장된 맵을 읽어와 해당 이메일의 이름을 업데이트
  const map = getStoredNameMap();
  map[normalizedEmail] = name;

  // 변경된 맵 저장
  setStoredNameMap(map);
}

export function removeStoredNameForEmail(email: string) {
  // SSR 방어
  if (typeof window === "undefined") return;

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  // 맵에서 해당 이메일 키를 제거
  const map = getStoredNameMap();
  if (!(normalizedEmail in map)) return;

  delete map[normalizedEmail];
  setStoredNameMap(map);
}

export function getStoredNameForLogin(identifier: string) {
  // 로그인 identifier가 "email"일 수도 있고 "아이디(로컬파트)"일 수도 있다는 가정 하에
  // 둘 다 지원하기 위한 조회 함수
  if (typeof window === "undefined") return "";

  const normalizedIdentifier = identifier.trim().toLowerCase();
  if (!normalizedIdentifier) return "";

  const map = getStoredNameMap();

  // identifier가 이메일이면 그대로 매핑 조회
  if (normalizedIdentifier.includes("@")) {
    return map[normalizedIdentifier] ?? "";
  }

  // identifier가 이메일이 아니라면:
  // - 사용자가 "localPart"만 입력했을 가능성을 고려해서
  // - 저장된 이메일들의 localPart(@ 앞부분)와 비교해 이름을 찾아준다.
  //
  // 구현 검토 포인트:
  // - localPart가 같은 이메일이 여러 개면(예: test@gmail.com, test@naver.com)
  //   첫 번째로 발견된 값이 반환되므로 모호성이 생길 수 있다.
  // - 이런 케이스가 실제로 발생하면 "도메인까지 입력하도록 UI에서 유도"하거나
  //   "최근 로그인한 이메일 우선" 같은 정책이 필요할 수 있다.
  const entry = Object.entries(map).find(([email]) => {
    const localPart = email.split("@")[0];
    return localPart === normalizedIdentifier;
  });

  return entry?.[1] ?? "";
}

export function clearStoredProfile() {
  // 저장된 "memberProfile"만 제거
  // 주의:
  // - name map(PROFILE_NAME_MAP_KEY)은 유지된다.
  // - 즉, 로그아웃해도 이메일별 이름 자동완성 정보는 남는다.
  // - 정책에 따라 로그아웃 시 이름 맵도 같이 지우고 싶으면 별도 clear 함수가 필요하다.
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_KEY);
}