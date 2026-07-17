"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../lib/api";
import { CurrentUser, fetchCurrentUser, logout } from "../lib/auth";
import { getNickname, getParticipantId, setNickname } from "../lib/room-socket";
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
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [leavingActive, setLeavingActive] = useState(false);

  useEffect(() => {
    const savedNickname = getNickname();
    setNicknameInput(savedNickname);
    fetchCurrentUser().then((user) => {
      setCurrentUser(user);
      // Convenience default only - never clobber a nickname the rider
      // already saved from a previous guest session.
      if (user && !savedNickname) setNicknameInput(user.displayName);
    });

    // Surfaced as a dismissible banner rather than an automatic redirect -
    // a silent router.replace() here left riders with no way back to this
    // form at all if the in-room "leave"/"end trip" actions ever failed to
    // reach them (e.g. a rider auto-tossed into a stuck trip had nowhere
    // else to go). The create/join form below always stays visible.
    api<{ room: Room | null }>(`/rooms/active?participantId=${encodeURIComponent(getParticipantId())}`)
      .then(({ room }) => setActiveRoom(room))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isActiveRoomLeader =
    !!activeRoom &&
    ((!!currentUser && activeRoom.leaderUserId === currentUser.id) ||
      (!!activeRoom.leaderParticipantId && activeRoom.leaderParticipantId === getParticipantId()));

  async function handleLeaveActive() {
    setLeavingActive(true);
    try {
      await api("/rooms/active/leave", {
        method: "POST",
        body: JSON.stringify({ participantId: getParticipantId() })
      });
      setActiveRoom(null);
    } catch {
      // Best-effort - the banner just stays up so the rider can retry.
    } finally {
      setLeavingActive(false);
    }
  }

  function handleLogout() {
    logout();
    setCurrentUser(null);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setActiveRoomId(null);
    setCreating(true);
    try {
      setNickname(nickname);
      const room = await api<Room>("/rooms", {
        method: "POST",
        body: JSON.stringify({ name: roomName, nickname, participantId: getParticipantId() })
      });
      router.push(`/rooms/${room.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as { activeRoomId?: string };
        setError(err.message);
        setActiveRoomId(body?.activeRoomId ?? null);
      } else {
        setError(err instanceof ApiError ? err.message : "Tạo phòng thất bại.");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setActiveRoomId(null);
    setJoining(true);
    try {
      setNickname(nickname);
      const room = await api<Room>("/rooms/join", {
        method: "POST",
        body: JSON.stringify({ code, participantId: getParticipantId() })
      });
      router.push(`/rooms/${room.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const body = err.body as { activeRoomId?: string };
        setError(err.message);
        setActiveRoomId(body?.activeRoomId ?? null);
      } else {
        setError(err instanceof ApiError ? err.message : "Không tìm thấy phòng với mã này.");
      }
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
      {activeRoom ? (
        <div className="home-panel" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span>
            Bạn đang có chuyến đi đang hoạt động: <strong>{activeRoom.name}</strong> (mã {activeRoom.code})
          </span>
          <button className="btn" type="button" onClick={() => router.push(`/rooms/${activeRoom.id}`)} style={{ marginLeft: "auto" }}>
            Tiếp tục chuyến đi
          </button>
          <button
            className="link-button"
            type="button"
            onClick={handleLeaveActive}
            disabled={leavingActive}
            style={{ color: "var(--color-error)" }}
          >
            {leavingActive ? "Đang xử lý..." : isActiveRoomLeader ? "Kết thúc chuyến đi" : "Rời nhóm"}
          </button>
        </div>
      ) : null}
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
                {activeRoomId ? (
                  <button type="button" className="link-button" onClick={() => router.push(`/rooms/${activeRoomId}`)}>
                    Quay lại chuyến đi đang hoạt động
                  </button>
                ) : null}
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
                {error ? <p className="error-text">{error}</p> : null}
                {activeRoomId ? (
                  <button type="button" className="link-button" onClick={() => router.push(`/rooms/${activeRoomId}`)}>
                    Quay lại chuyến đi đang hoạt động
                  </button>
                ) : null}
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
