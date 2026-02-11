"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import ConfirmModal from "@/components/ConfirmModal";
import styles from "./mypage.module.css";
import { clearTokens } from "@/lib/auth/tokens";
import { changeMemberPassword, deleteMemberAccount } from "@/lib/api/auth";
import { uploadImage } from "@/lib/api/uploads";
import {
  clearStoredProfile,
  getStoredNameForLogin,
  getStoredProfile,
  removeStoredNameForEmail,
  setStoredNameForEmail,
  setStoredProfile,
} from "../../lib/auth/profile";

type UploadImageResponse =
  | string
  | {
      data?: string;
      url?: string;
      imageUrl?: string;
    };

const DEFAULT_PROFILE_IMG = "/default-avatar.png";
const S3_BASE_URL = process.env.NEXT_PUBLIC_S3_BASE_URL ?? "";

function normalizeImageSrc(payload: UploadImageResponse): string {
  if (!payload) return "";

  const raw = typeof payload === "string" ? payload : payload?.imageUrl ?? payload?.url ?? payload?.data ?? "";
  const normalized = raw.trim();

  if (!normalized) return "";

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }

  const matchedUrl = normalized.match(/https?:\/\/\S+/)?.[0];
  if (matchedUrl) {
    return matchedUrl;
  }

  if (S3_BASE_URL) {
    return `${S3_BASE_URL.replace(/\/$/, "")}/${normalized.replace(/^\//, "")}`;
  }

  return "";
}

export default function MyPage() {
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [password, setPassword] = useState("");
  const [profilePreview, setProfilePreview] = useState(DEFAULT_PROFILE_IMG);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
  });

  useEffect(() => {
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
  }, []);

  const startEdit = (field: string, value: string) => {
    setEditingField(field);
    if (field === "password") {
      setPasswordData({ current: "", new: "" });
    } else {
      setTempValue(value);
    }
  };

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const localPreview = URL.createObjectURL(file);
    setProfilePreview(localPreview);

    try {
      const uploaded = (await uploadImage(file)) as UploadImageResponse;
      const uploadedUrl = normalizeImageSrc(uploaded);
      const finalUrl = uploadedUrl || DEFAULT_PROFILE_IMG;

      setProfilePreview(finalUrl);
      localStorage.setItem("profileImg", finalUrl);
      alert("사진이 변경되었습니다.");
    } catch (error) {
      console.error(error);
      setProfilePreview(DEFAULT_PROFILE_IMG);
      localStorage.setItem("profileImg", DEFAULT_PROFILE_IMG);
      alert("이미지 업로드에 실패하여 기본 이미지가 사용됩니다.");
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // 폼 제출 시 페이지 새로고침 방지

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
        alert(error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다.");
        return;
      }
    } else if (editingField === "name") {
      setName(tempValue);
      if (emailId) {
        setStoredNameForEmail(emailId, tempValue);
      }
      setStoredProfile({ name: tempValue, email: emailId, password });
    } else if (editingField === "email") {
      setEmailId(tempValue);
      if (name) {
        setStoredNameForEmail(tempValue, name);
      }
      setStoredProfile({ name, email: tempValue, password });
    }

    setEditingField(null);
  };

  const handleLogout = () => {
    clearTokens();
    clearStoredProfile();
    alert("로그아웃 되었습니다.");
    router.push("/");
  };

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
      alert(error instanceof Error ? error.message : "계정 삭제에 실패했습니다.");
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
          <aside className={styles.sidebar}>
            <div className={styles.profileCircle}>
              <img
                src={profilePreview || DEFAULT_PROFILE_IMG}
                alt="프로필 이미지"
                className={styles.profileImage}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_PROFILE_IMG;
                }}
              />
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

          <section className={styles.content}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>개인정보</h3>
              
              {/* 이름 수정 */}
              <div className={styles.infoItem}>
                {editingField === "name" ? (
                  <form className={styles.editBlock} onSubmit={handleSave}>
                    <input 
                      className={styles.inputBar} 
                      value={tempValue} 
                      onChange={(e) => setTempValue(e.target.value)}
                      autoFocus 
                    />
                    <div className={styles.editActions}>
                      <button type="submit" className={styles.saveBtn}>저장</button>
                      <button type="button" className={styles.cancelBtn} onClick={() => setEditingField(null)}>취소</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className={styles.infoLabel}>
                      <span className={styles.labelName}>이름</span>
                      <span className={styles.labelValue}>{name}</span>
                    </div>
                    <button className={styles.editBtn} onClick={() => startEdit("name", name)}>수정</button>
                  </>
                )}
              </div>

              {/* 이메일 수정 */}
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>
                  <span className={styles.labelName}>이메일</span>
                  <span className={styles.labelValue}>{emailId}</span>
                </div>
              </div>

              {/* 비밀번호 수정 */}
              <div className={styles.infoItem}>
                {editingField === "password" ? (
                  <form className={styles.editBlock} onSubmit={handleSave}>
                    <input 
                      type="password"
                      className={styles.inputBar} 
                      placeholder="현재 비밀번호 입력"
                      value={passwordData.current}
                      onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                      autoFocus
                    />
                    <input 
                      type="password"
                      className={styles.inputBar} 
                      placeholder="새 비밀번호 입력"
                      value={passwordData.new}
                      onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                    />
                    <div className={styles.editActions}>
                      <button type="submit" className={styles.saveBtn}>저장</button>
                      <button type="button" className={styles.cancelBtn} onClick={() => setEditingField(null)}>취소</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className={styles.infoLabel}>
                      <span className={styles.labelName}>비밀번호</span>
                      <span className={styles.labelValue}>********</span>
                    </div>
                    <button className={styles.editBtn} onClick={() => startEdit("password", "")}>수정</button>
                  </>
                )}
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>계정 관리</h3>
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}><span className={styles.labelName}>로그아웃</span></div>
                <button className={styles.editBtn} onClick={handleLogout}>로그아웃</button>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.infoLabel}>
                  <span className={styles.labelName}>계정 삭제</span>
                  <span className={styles.labelValue}>영구적으로 계정을 삭제합니다.</span>
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
