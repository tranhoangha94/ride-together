"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../lib/api";
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

  useEffect(() => {
    setNicknameInput(getNickname());
  }, []);

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
    <main className="auth-shell">
      <div className="card">
        <h2>Ride Together</h2>
        <p className="hint">Theo dõi vị trí cả đoàn trên bản đồ. Không cần tài khoản.</p>
        <div className="form-field">
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

      <div className="card">
        <h2>Tạo phòng mới</h2>
        <form onSubmit={handleCreate}>
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
          <button className="btn" type="submit" disabled={creating || !nickname} style={{ width: "100%" }}>
            {creating ? "Đang tạo..." : "Tạo phòng"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Tham gia phòng</h2>
        <form onSubmit={handleJoin}>
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
          <button className="btn btn-secondary" type="submit" disabled={joining || !nickname} style={{ width: "100%" }}>
            {joining ? "Đang vào..." : "Tham gia"}
          </button>
        </form>
      </div>
    </main>
  );
}
