"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { isLoggedIn } from "../../lib/auth";
import { Room } from "../../lib/types";

type RoomHistoryEntry = {
  room: Room;
  role: "leader" | "member";
  joinedAt: string;
};

export default function HistoryPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<RoomHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    api<RoomHistoryEntry[]>("/users/me/rooms")
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được lịch sử."));
  }, [router]);

  return (
    <main className="auth-shell">
      <Link href="/" className="back-link">
        ← Quay lại
      </Link>
      <div className="card">
        <h2>Lịch sử chuyến đi</h2>
        {error ? <p className="error-text">{error}</p> : null}
        {!error && entries === null ? <p className="hint">Đang tải...</p> : null}
        {entries && entries.length === 0 ? <p className="hint">Bạn chưa tham gia phòng nào.</p> : null}
        {entries?.map(({ room, role, joinedAt }) => (
          <Link
            key={room.id}
            href={`/rooms/${room.id}`}
            className="list-item"
            style={{ display: "flex", color: "inherit", textDecoration: "none" }}
          >
            <div>
              <div>{room.name}</div>
              <div className="hint">
                {role === "leader" ? "Trưởng đoàn" : "Thành viên"} · {new Date(joinedAt).toLocaleDateString("vi-VN")}
              </div>
            </div>
            <span className={`status-pill ${room.started ? "status-active" : "status-draft"}`}>
              {room.started ? "Đã xuất phát" : "Phòng chờ"}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
