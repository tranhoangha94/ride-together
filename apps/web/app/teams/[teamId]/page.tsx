"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { RequireAuth } from "../../../lib/require-auth";
import { api, ApiError } from "../../../lib/api";
import { Team, TeamMember, Trip } from "../../../lib/types";

const STATUS_LABEL: Record<Trip["status"], string> = {
  draft: "Chưa bắt đầu",
  active: "Đang diễn ra",
  ended: "Đã kết thúc",
  cancelled: "Đã huỷ"
};

const STATUS_CLASS: Record<Trip["status"], string> = {
  draft: "status-draft",
  active: "status-active",
  ended: "status-ended",
  cancelled: "status-ended"
};

function TeamDetailContent() {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tripName, setTripName] = useState("");
  const [creatingTrip, setCreatingTrip] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [detail, tripList] = await Promise.all([
        api<{ team: Team; members: TeamMember[] }>(`/teams/${teamId}`),
        api<Trip[]>(`/trips?teamId=${teamId}`)
      ]);
      setTeam(detail.team);
      setMembers(detail.members);
      setTrips(tripList);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được team.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function fetchInviteCode() {
    try {
      const res = await api<{ inviteCode: string }>(`/teams/${teamId}/invite`, { method: "POST" });
      setInviteCode(res.inviteCode);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không lấy được mã mời.");
    }
  }

  async function handleCreateTrip(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreatingTrip(true);
    try {
      await api<Trip>("/trips", {
        method: "POST",
        body: JSON.stringify({ teamId, name: tripName })
      });
      setTripName("");
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo room thất bại.");
    } finally {
      setCreatingTrip(false);
    }
  }

  if (loading) {
    return (
      <main>
        <p className="hint">Đang tải...</p>
      </main>
    );
  }

  if (!team) {
    return (
      <main>
        <p className="error-text">{error ?? "Không tìm thấy team."}</p>
      </main>
    );
  }

  return (
    <main>
      <div className="toolbar">
        <div>
          <h1>{team.name}</h1>
          {team.description ? <p className="hint">{team.description}</p> : null}
        </div>
      </div>

      <div className="card">
        <h2>Mã mời team</h2>
        <p className="hint">Chia sẻ mã này để thành viên khác tham gia team (vào Đội của bạn → Tham gia team).</p>
        {inviteCode ? (
          <p>
            <span className="invite-code">{inviteCode}</span>
          </p>
        ) : (
          <button className="btn btn-secondary" onClick={fetchInviteCode}>
            Lấy mã mời
          </button>
        )}
      </div>

      <div className="card">
        <h2>Thành viên ({members.length})</h2>
        {members.map((member) => (
          <div key={member.userId} className="list-item">
            <span>{member.user?.displayName ?? member.userId}</span>
            <span className="hint">{member.role}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Tạo room (chuyến đi) mới</h2>
        <form onSubmit={handleCreateTrip}>
          <div className="form-field">
            <label htmlFor="tripName">Tên chuyến đi</label>
            <input id="tripName" value={tripName} onChange={(e) => setTripName(e.target.value)} required />
          </div>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn" type="submit" disabled={creatingTrip}>
            {creatingTrip ? "Đang tạo..." : "Tạo room"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>Danh sách room</h2>
        {trips.length === 0 ? (
          <p className="hint">Chưa có chuyến đi nào. Tạo room ở trên để bắt đầu.</p>
        ) : (
          trips.map((trip) => (
            <div key={trip.id} className="list-item">
              <div>
                <strong>{trip.name}</strong>{" "}
                <span className={`status-pill ${STATUS_CLASS[trip.status]}`}>{STATUS_LABEL[trip.status]}</span>
              </div>
              <Link href={`/trips/${trip.id}`} className="btn btn-secondary">
                Vào room
              </Link>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

export default function TeamDetailPage() {
  return (
    <RequireAuth>
      <TeamDetailContent />
    </RequireAuth>
  );
}
