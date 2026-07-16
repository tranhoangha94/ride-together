"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { isLoggedIn } from "../../lib/auth";
import { Room } from "../../lib/types";

type InviteEntry = {
  invite: { id: string; roomId: string; createdAt: string };
  room?: Room;
};

export default function InvitesPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<InviteEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function load() {
    api<InviteEntry[]>("/users/me/invites")
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tải được lời mời."));
  }

  async function respond(inviteId: string, accept: boolean) {
    setRespondingId(inviteId);
    try {
      const result = await api<{ roomId: string }>(`/invites/${inviteId}/${accept ? "accept" : "decline"}`, { method: "POST" });
      if (accept) {
        router.push(`/rooms/${result.roomId}`);
        return;
      }
      setEntries((current) => current?.filter((e) => e.invite.id !== inviteId) ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không xử lý được lời mời.");
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <main className="auth-shell">
      <a href="/" className="back-link">
        ← Quay lại
      </a>
      <div className="card">
        <h2>Lời mời tham gia phòng</h2>
        {error ? <p className="error-text">{error}</p> : null}
        {!error && entries === null ? <p className="hint">Đang tải...</p> : null}
        {entries && entries.length === 0 ? <p className="hint">Bạn không có lời mời nào.</p> : null}
        {entries?.map(({ invite, room }) => (
          <div key={invite.id} className="list-item">
            <div>
              <div>{room?.name ?? "Phòng"}</div>
              <div className="hint">Mã phòng: {room?.code}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" disabled={respondingId === invite.id} onClick={() => respond(invite.id, true)}>
                Chấp nhận
              </button>
              <button
                className="btn btn-secondary"
                disabled={respondingId === invite.id}
                onClick={() => respond(invite.id, false)}
              >
                Từ chối
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
