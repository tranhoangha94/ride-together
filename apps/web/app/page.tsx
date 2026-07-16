"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../lib/api";
import { CurrentUser, fetchCurrentUser, logout } from "../lib/auth";
import { getNickname, setNickname } from "../lib/room-socket";
import { Room } from "../lib/types";

export default function Home() {
  const router = useRouter();
  // Seeded empty (not from localStorage) so server and first client render
  // match; the real saved nickname is filled in after mount.
  const [nickname, setNicknameInput] = useState("");
  const [roomName, setRoomName] = useState("");
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    const savedNickname = getNickname();
    setNicknameInput(savedNickname);
    fetchCurrentUser().then((user) => {
      setCurrentUser(user);
      // Convenience default only - never clobber a nickname the rider
      // already saved from a previous guest session.
      if (user && !savedNickname) setNicknameInput(user.displayName);
    });
  }, []);

  function handleLogout() {
    logout();
    setCurrentUser(null);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      setNickname(nickname);
      const room = await api<Room>("/rooms", {
        method: "POST",
        body: JSON.stringify({ name: roomName, nickname })
      });
      router.push(`/rooms/${room.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo phòng thất bại.");
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setJoining(true);
    try {
      setNickname(nickname);
      const room = await api<Room>("/rooms/join", {
        method: "POST",
        body: JSON.stringify({ code })
      });
      router.push(`/rooms/${room.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tìm thấy phòng với mã này.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="home-page">
      <div className="home-account-bar">
        {currentUser ? (
          <>
            <span>Xin chào, {currentUser.displayName}</span>
            <Link href="/history">Lịch sử</Link>
            <Link href="/invites">Lời mời</Link>
            <button type="button" className="link-button" onClick={handleLogout}>
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Đăng nhập</Link>
            <Link href="/register">Đăng ký</Link>
          </>
        )}
      </div>
      <div className="home-grid">
        <div className="home-panel home-brand-panel">
          <div>
            <h1>Phượt Together</h1>
            <p>Theo dõi vị trí cả đoàn trên bản đồ. Không cần tài khoản.</p>
          </div>
          <div className="home-perks">
            <div className="home-perk">
              <svg className="home-perk-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                <path d="M15 9L12.8 12.8L9 15L11.2 11.2L15 9Z" fill="currentColor" />
              </svg>
              <span>Cập nhật vị trí thời gian thực</span>
            </div>
            <div className="home-perk">
              <svg className="home-perk-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.7" />
                <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="17" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.7" />
                <path d="M20.5 20c0-2.6-2-4.8-4.5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span>Kết nối nhóm không giới hạn</span>
            </div>
          </div>
        </div>

        <div className="home-form-stack">
          <div className="home-panel">
            <div className="form-field" style={{ marginBottom: 0 }}>
              <label htmlFor="nickname">Tên của bạn</label>
              <input
                id="nickname"
                value={nickname}
                onChange={(e) => setNicknameInput(e.target.value)}
                placeholder="Vd: Hà, Rider 1..."
                required
              />
            </div>
          </div>

          <div className="home-action-grid">
            <div className="home-panel home-action-card">
              <h2>Tạo phòng mới</h2>
              <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
                <div className="form-field">
                  <label htmlFor="roomName">Tên phòng</label>
                  <input
                    id="roomName"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Vd: Team phượt cuối tuần"
                    required
                  />
                </div>
                {error ? <p className="error-text">{error}</p> : null}
                <button className="btn" type="submit" disabled={creating || !nickname} style={{ width: "100%", marginTop: "auto" }}>
                  {creating ? "Đang tạo..." : "Tạo phòng"}
                </button>
              </form>
            </div>

            <div className="home-panel home-action-card">
              <h2>Tham gia phòng</h2>
              <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
                <div className="form-field">
                  <label htmlFor="code">Mã phòng</label>
                  <input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="6 chữ số"
                    inputMode="numeric"
                    maxLength={6}
                    required
                  />
                </div>
                <button
                  className="btn btn-secondary"
                  type="submit"
                  disabled={joining || !nickname}
                  style={{ width: "100%", marginTop: "auto" }}
                >
                  {joining ? "Đang vào..." : "Tham gia"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
