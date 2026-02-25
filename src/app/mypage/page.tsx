// src/app/mypage/page.tsx (또는 동일 경로 파일)
//
// 마이페이지 화면
// - 사용자 기본 정보(이름/이메일/프로필 이미지)를 보여주고 일부 항목을 수정
// - 비밀번호 변경, 로그아웃, 계정 삭제 기능 제공
// - 초기 화면은 로컬 캐시로 빠르게 표시한 뒤, 서버 /api/mypage 응답으로 값을 갱신
//
// 데이터 소스/동기화 정책
// 1) 로컬 부트스트랩(즉시 표시)
//    - getStoredProfile()에서 name/email/password를 가져와 우선 화면에 반영
//    - localStorage("profileImg")가 있으면 프로필 이미지 미리보기로 사용
// 2) 서버 하이드레이션(정확한 값으로 덮어쓰기)
//    - getMyPage() (GET /api/mypage)로 name/email/picture를 받아 상태를 갱신
//    - picture는 최종 이미지로 profilePreview + localStorage("profileImg")에 동기화
//    - password는 서버 응답에 포함되지 않으므로 기존 로컬 값을 유지
//
// 화면/UX 동작
// - 이름: 인라인 편집(수정/저장/취소)
// - 이메일: 현재 UI에서는 수정 비활성(표시만)
// - 비밀번호: 현재/새 비밀번호 입력 후 changeMemberPassword 호출
// - 프로필 사진: 로컬 미리보기 → 업로드 → 업로드 결과 URL 반영(실패 시 기본 이미지)
// - 계정 삭제: ConfirmModal로 2차 확인 후 deleteMemberAccount 호출
//
// 안전장치
// - mountedRef로 언마운트 이후 setState를 막아 경고/메모리 누수 방지
// - isDeleting 플래그로 계정 삭제 중 중복 클릭 방지
//
// 구현에서 검토/개선 여지(중요)
// A) password 로컬 저장
//    - 비밀번호를 localStorage/로컬 프로필 캐시에 저장하는 구조는 보안상 위험
//    - 가능하면 password는 저장하지 말고, 비밀번호 변경은 입력값만 사용하고 버리는 형태가 안전
// B) 프로필 이미지 업로드 후 서버 반영 여부
//    - 현재는 업로드 결과를 localStorage("profileImg")에만 저장
//    - 백엔드에 "프로필 사진 저장" API가 있다면 업로드 URL을 서버에 PATCH/PUT로 저장해야
//      다른 기기/세션에서도 동일하게 유지됨
// C) normalizeImageSrc
//    - 업로드 응답이 다양한 케이스를 허용해 방어적으로 잘 작성되어 있음
//    - 다만 S3_BASE_URL 조합 로직은 환경변수/백엔드 응답 포맷이 확정되면 단순화 가능

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ConfirmModal from "@/components/ConfirmModal";
import styles from "./mypage.module.css";
import { clearTokens } from "@/lib/auth/tokens";
import {
  changeMemberPassword,
  deleteMemberAccount,
  getMyPage,
  updateMyPageName,
  updateMyPageProfile,
} from "@/lib/api/auth";
import {
  clearStoredProfile,
  getStoredNameForLogin,
  getStoredProfile,
  removeStoredNameForEmail,
  setStoredNameForEmail,
  setStoredProfile,
} from "../../lib/auth/profile";

const DEFAULT_PROFILE_IMG = "/default-avatar.png";

export default function MyPage() {
  const router = useRouter();

  // 기본 사용자 정보 상태
  const [name, setName] = useState("");
  const [emailId, setEmailId] = useState("");

  // password는 화면에 직접 노출하진 않지만, 기존 구조상 로컬 캐시에 저장/유지됨
  // 실제 운영 환경에서는 저장하지 않는 방향이 안전함
  const [password, setPassword] = useState("");

  // profilePreview: 사이드바 프로필 이미지 미리보기 src
  const [profilePreview, setProfilePreview] =
    useState(DEFAULT_PROFILE_IMG);

  // file input을 버튼으로 트리거하기 위한 ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // editingField: 현재 편집 중인 필드(name/password 등)
  const [editingField, setEditingField] = useState<string | null>(null);

  // tempValue: name 같은 단일 입력 편집용 임시 값
  const [tempValue, setTempValue] = useState("");

  // 계정 삭제 확인 모달 상태
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // 계정 삭제 진행 중 여부(중복 요청 방지)
  const [isDeleting, setIsDeleting] = useState(false);

  // 비밀번호 변경 입력값 묶음
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
  });

  // mountedRef: 언마운트 이후 setState 방지용
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // 로컬 캐시에서 빠르게 화면을 채우는 단계
    // - UI가 즉시 차도록 하고, 이후 서버 응답으로 덮어쓴다
    const bootstrapFromLocal = () => {
      const profile = getStoredProfile();
      if (profile) {
        if (profile.email && profile.name?.trim()) {
          setStoredNameForEmail(profile.email, profile.name);
        }

        const storedName = getStoredNameForLogin(profile.email ?? "");
        setName(storedName || profile.name || "");
        setEmailId(profile.email ?? "");
        setPassword(profile.password ?? "");
      }

      const savedProfileImg = localStorage.getItem("profileImg");
      if (savedProfileImg?.trim()) {
        setProfilePreview(savedProfileImg);
      }
    };

    // 서버에서 실제 최신 마이페이지 데이터를 받아 덮어쓰는 단계
    const hydrateFromServer = async () => {
      try {
        const data = await getMyPage();

        if (!mountedRef.current) return;

        const serverName = (data?.name ?? "").trim();
        const serverEmail = (data?.email ?? "").trim();
        const serverPicture = (data?.picture ?? "").trim();

        if (serverEmail && serverName) {
          setStoredNameForEmail(serverEmail, serverName);
        }

        setName(serverName);
        setEmailId(serverEmail);

        // 서버 응답에 password가 없으므로 기존 로컬 값만 유지
        const existing = getStoredProfile();
        setPassword(existing?.password ?? "");

        // picture가 없으면 기본 이미지 사용
        const finalImg = serverPicture || DEFAULT_PROFILE_IMG;
        setProfilePreview(finalImg);
        localStorage.setItem("profileImg", finalImg);

        // 로컬 프로필 캐시도 서버 값으로 동기화
        setStoredProfile({
          name: serverName,
          email: serverEmail,
          password: existing?.password ?? "",
        });
      } catch (e) {
        // 서버 실패 시 로컬 값으로 화면 유지
        console.error("[mypage] GET /api/mypage failed:", e);
      }
    };

    bootstrapFromLocal();
    hydrateFromServer();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 편집 시작
  // - password 편집이면 입력값 2개(current/new) 초기화
  // - 나머지는 tempValue에 기존 값을 넣어 인라인 편집으로 사용
  const startEdit = (field: string, value: string) => {
    setEditingField(field);
    if (field === "password") {
      setPasswordData({ current: "", new: "" });
    } else {
      setTempValue(value);
    }
  };

  // 프로필 사진 업로드
  // 1) 선택 직후 로컬 미리보기(blob URL)로 즉시 반영
  // 2) 업로드 성공 시 업로드 URL로 교체 + localStorage에 저장
  // 3) 실패 시 기본 이미지로 되돌리고 안내
  const handleProfileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setProfilePreview(localPreview);

    try {
      const response = await updateMyPageProfile(file);

      const refreshed = await getMyPage().catch(() => null);
      const serverPicture = refreshed?.picture?.trim() ?? "";
      const finalUrl = serverPicture || DEFAULT_PROFILE_IMG;

      setProfilePreview(finalUrl);
      localStorage.setItem("profileImg", finalUrl);

      alert(response?.message ?? "프로필 사진이 변경되었습니다.");

      if (response?.redirectUrl) {
        router.push(response.redirectUrl);
      }
    } catch (error) {
      console.error(error);
      setProfilePreview(DEFAULT_PROFILE_IMG);
      localStorage.setItem("profileImg", DEFAULT_PROFILE_IMG);
      alert(
        error instanceof Error
          ? error.message
          : "프로필 사진 변경에 실패했습니다."
      );
    } finally {
      URL.revokeObjectURL(localPreview);
      e.target.value = "";
    }
  };

  // 저장 버튼(또는 form submit) 처리
  // - editingField에 따라 비밀번호 변경 / 이름 변경 등을 분기
  // - 비밀번호는 서버 API 호출(changeMemberPassword) 필요
  // - 이름은 현재 코드상 로컬 캐시만 갱신(서버 반영 API가 없다면 이 형태가 맞음)
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (editingField === "password") {
      if (!passwordData.current.trim()) {
        alert("현재 비밀번호를 입력해주세요.");
        return;
      }
      if (passwordData.new.length < 8) {
        alert("새 비밀번호는 8자 이상이어야 합니다.");
        return;
      }

      try {
        const response = await changeMemberPassword({
          currentPassword: passwordData.current,
          newPassword: passwordData.new,
        });

        setPassword(passwordData.new);
        setStoredProfile({
          name,
          email: emailId,
          password: passwordData.new,
        });

        setPasswordData({ current: "", new: "" });

        alert(response?.message ?? "비밀번호가 변경되었습니다.");

        if (response?.redirectUrl) {
          router.push(response.redirectUrl);
        }
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "비밀번호 변경에 실패했습니다."
        );
        return;
      }
    } else if (editingField === "name") {
      const nextName = tempValue.trim();
      if (!nextName) {
        alert("이름을 입력해주세요.");
        return;
      }

      try {
        const response = await updateMyPageName(nextName);
        setName(nextName);

        if (emailId) {
          setStoredNameForEmail(emailId, nextName);
        }

        setStoredProfile({ name: nextName, email: emailId, password });

        alert(response?.message ?? "정보가 수정되었습니다.");
        if (response?.redirectUrl) {
          router.push(response.redirectUrl);
        }
      } catch (error) {
        alert(
          error instanceof Error ? error.message : "이름 수정에 실패했습니다."
        );
        return;
      }
    } else if (editingField === "email") {
      // 현재 UI에서는 이메일 수정 폼이 없지만,
      // 로직은 남아있어 확장 시 사용할 수 있는 상태
      setEmailId(tempValue);

      if (name) {
        setStoredNameForEmail(tempValue, name);
      }

      setStoredProfile({ name, email: tempValue, password });
    }

    setEditingField(null);
  };

  // 로그아웃
  // - 토큰 + 로컬 프로필 캐시 제거 후 홈으로 이동
  const handleLogout = () => {
    clearTokens();
    clearStoredProfile();
    alert("로그아웃 되었습니다.");
    router.push("/");
  };

  // 계정 삭제
  // - 중복 클릭 방지(isDeleting)
  // - 성공 시 이름 캐시/토큰/로컬 프로필을 정리하고 redirect
  const handleDeleteAccount = async () => {
    if (isDeleting) return;

    setIsDeleting(true);

    try {
      const response = await deleteMemberAccount();

      const redirectUrl = response?.redirectUrl ?? "/";
      const message = response?.message ?? "계정이 삭제되었습니다.";

      if (emailId) {
        removeStoredNameForEmail(emailId);
      }

      clearTokens();
      clearStoredProfile();

      alert(message);
      router.push(redirectUrl);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : "계정 삭제에 실패했습니다."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.bg}>
      <div className={styles.headerWrap}>
        <Header />
      </div>

      <main className={styles.shell}>
        <div className={styles.body}>
          {/* 사이드바: 프로필 이미지 + 이름/이메일 */}
          <aside className={styles.sidebar}>
            <div className={styles.profileCircle}>
              <img
                src={profilePreview || DEFAULT_PROFILE_IMG}
                alt="프로필 이미지"
                className={styles.profileImage}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    DEFAULT_PROFILE_IMG;
                }}
              />

              {/* 파일 input은 숨기고, 버튼으로 클릭을 트리거 */}
              <input
                type="file"
                accept="image/*"
                className={styles.hiddenFileInput}
                onChange={handleProfileUpload}
                ref={fileInputRef}
              />

              <button
                type="button"
                className={styles.profileEdit}
                onClick={() => fileInputRef.current?.click()}
                aria-label="프로필 사진 변경"
              >
                ✎
              </button>
            </div>

            <h2 className={styles.userName}>{name}</h2>
            <p className={styles.userEmail}>{emailId}</p>
          </aside>

          {/* 본문: 개인정보/계정 관리 */}
          <section className={styles.content}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>개인정보</h3>

              {/* 이름 수정 */}
              <div className={styles.infoItem}>
                {editingField === "name" ? (
                  <form
                    className={styles.editBlock}
                    onSubmit={handleSave}
                  >
                    <input
                      className={styles.inputBar}
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      autoFocus
                    />
                    <div className={styles.editActions}>
                      <button
                        type="submit"
                        className={styles.saveBtn}
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => setEditingField(null)}
                      >
                        취소
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className={styles.infoLabel}>
                      <span className={styles.labelName}>이름</span>
                      <span className={styles.labelValue}>{name}</span>
                    </div>
                    <button
                      className={styles.editBtn}
                      onClick={() => startEdit("name", name)}
                    >
                      수정
                    </button>
                  </>
                )}
              </div>

              {/* 이메일: 표시만(현재 UI는 수정 없음) */}
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>
                  <span className={styles.labelName}>이메일</span>
                  <span className={styles.labelValue}>{emailId}</span>
                </div>
              </div>

              {/* 비밀번호 수정 */}
              <div className={styles.infoItem}>
                {editingField === "password" ? (
                  <form
                    className={styles.editBlock}
                    onSubmit={handleSave}
                  >
                    <input
                      type="password"
                      className={styles.inputBar}
                      placeholder="현재 비밀번호 입력"
                      value={passwordData.current}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          current: e.target.value,
                        })
                      }
                      autoFocus
                    />
                    <input
                      type="password"
                      className={styles.inputBar}
                      placeholder="새 비밀번호 입력"
                      value={passwordData.new}
                      onChange={(e) =>
                        setPasswordData({
                          ...passwordData,
                          new: e.target.value,
                        })
                      }
                    />
                    <div className={styles.editActions}>
                      <button
                        type="submit"
                        className={styles.saveBtn}
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        className={styles.cancelBtn}
                        onClick={() => setEditingField(null)}
                      >
                        취소
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className={styles.infoLabel}>
                      <span className={styles.labelName}>비밀번호</span>
                      <span className={styles.labelValue}>********</span>
                    </div>
                    <button
                      className={styles.editBtn}
                      onClick={() => startEdit("password", "")}
                    >
                      수정
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>계정 관리</h3>

              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>
                  <span className={styles.labelName}>로그아웃</span>
                </div>
                <button
                  className={styles.editBtn}
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </div>

              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>
                  <span className={styles.labelName}>계정 삭제</span>
                  <span className={styles.labelValue}>
                    영구적으로 계정을 삭제합니다.
                  </span>
                </div>
                <button
                  className={`${styles.editBtn} ${styles.deleteBtn}`}
                  onClick={() => setDeleteConfirmOpen(true)}
                  disabled={isDeleting}
                >
                  삭제
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* 계정 삭제 확인 모달 */}
      <ConfirmModal
        open={deleteConfirmOpen}
        title="계정 삭제"
        message="정말로 계정을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다."
        confirmText={isDeleting ? "삭제 중..." : "삭제"}
        cancelText="취소"
        onCancel={() => {
          if (isDeleting) return;
          setDeleteConfirmOpen(false);
        }}
        onConfirm={async () => {
          await handleDeleteAccount();
          setDeleteConfirmOpen(false);
        }}
      />
    </div>
  );
}
