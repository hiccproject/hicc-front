"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import styles from "./mypage.module.css";
import { clearTokens } from "@/lib/auth/tokens";
import { changeMemberPassword, deleteMemberAccount } from "@/lib/api/auth";
import {
  clearStoredProfile,
  getStoredNameForLogin,
  getStoredProfile,
  removeStoredNameForEmail,
  setStoredNameForEmail,
  setStoredProfile,
} from "../../lib/auth/profile";

export default function MyPage() {
  const router = useRouter();
  
  const [name, setName] = useState("");
  const [emailId, setEmailId] = useState("");
  const [password, setPassword] = useState("");

  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState("");
  
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
  }, []);

  const startEdit = (field: string, value: string) => {
    setEditingField(field);
    if (field === "password") {
      setPasswordData({ current: "", new: "" });
    } else {
      setTempValue(value);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // 폼 제출 시 페이지 새로고침 방지

    if (editingField === "password") {
      if (passwordData.current !== password) {
        alert("현재 비밀번호가 일치하지 않습니다.");
        return;
      }
      if (passwordData.new.length < 8) {
        alert("새 비밀번호는 8자 이상이어야 합니다.");
        return;
      }
      try {
        await changeMemberPassword({
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
        alert("비밀번호가 변경되었습니다.");
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
    if (!confirm("정말로 계정을 삭제하시겠습니까?")) return;

    try {
      await deleteMemberAccount();
      if (emailId) {
        removeStoredNameForEmail(emailId);
      }
      clearTokens();
      clearStoredProfile();
      alert("계정이 삭제되었습니다.");
      router.push("/");
       } catch (error) {
      alert(error instanceof Error ? error.message : "계정 삭제에 실패했습니다.");
    }
  };

  return (
    <div className={styles.bg}>
      <main className={styles.shell}>
        <Header />

        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <div className={styles.profileCircle} />
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
                {editingField === "email" ? (
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
                      <span className={styles.labelName}>이메일</span>
                      <span className={styles.labelValue}>{emailId}</span>
                    </div>
                    <button className={styles.editBtn} onClick={() => startEdit("email", emailId)}>수정</button>
                  </>
                )}
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
                <button className={`${styles.editBtn} ${styles.deleteBtn}`} onClick={handleDeleteAccount}>삭제</button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}