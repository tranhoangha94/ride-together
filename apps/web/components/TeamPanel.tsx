"use client";

import { FormEvent, useState } from "react";
import { api, ApiError } from "../lib/api";
import { PlaceResult } from "../lib/geocode";
import { distanceMeters, LAGGING_THRESHOLD_M } from "../lib/geo";
import { Destination, ParticipantLocation, Room } from "../lib/types";
import { CopyCode } from "./CopyCode";
import { DestinationPicker } from "./DestinationPicker";

type Props = {
  room: Room;
  destination: Destination | null;
  isLeader: boolean;
  onSelectDestination: (place: PlaceResult) => void;
  members: ParticipantLocation[];
  sharing: boolean;
  onToggleSharing: () => void;
  locationError: string | null;
  onTriggerSos: () => void;
  selfId?: string | null;
  canManageMembers?: boolean;
  onKickMember?: (targetParticipantId: string) => void;
};

export function TeamPanel({
  room,
  destination,
  isLeader,
  onSelectDestination,
  members,
  sharing,
  onToggleSharing,
  locationError,
  onTriggerSos,
  selfId,
  canManageMembers,
  onKickMember
}: Props) {
  const leader = members.find((m) => m.nickname === room.leaderNickname);
  const [inviteValue, setInviteValue] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setInviteError(null);
    setInviteMessage(null);
    setInviting(true);
    try {
      await api(`/rooms/${room.id}/invite`, { method: "POST", body: JSON.stringify({ emailOrPhone: inviteValue }) });
      setInviteMessage("Đã gửi lời mời.");
      setInviteValue("");
    } catch (err) {
      setInviteError(err instanceof ApiError ? err.message : "Không gửi được lời mời.");
    } finally {
      setInviting(false);
    }
  }

  return (
    <div className="team-panel">
      <div className="card">
        <h2>{room.name}</h2>
        <p className="hint">
          Mã phòng: <CopyCode code={room.code} />
        </p>
      </div>

      <DestinationPicker destination={destination} canEdit={isLeader} onSelect={onSelectDestination} />

      <div className="card">
        <button className={`btn ${sharing ? "" : "btn-secondary"}`} onClick={onToggleSharing} style={{ width: "100%" }}>
          {sharing ? "Đang chia sẻ vị trí (chạm để tắt)" : "Chia sẻ vị trí của tôi"}
        </button>
        {locationError ? <p className="error-text">{locationError}</p> : null}
      </div>

      <div className="card">
        <h2>Thành viên ({members.length})</h2>
        {members.length === 0 ? (
          <p className="hint">Chưa có ai chia sẻ vị trí.</p>
        ) : (
          members.map((member) => {
            const isLeaderRow = member.nickname === room.leaderNickname;
            const distanceFromLeader = !isLeaderRow && leader ? distanceMeters(leader, member) : null;
            const isLagging = distanceFromLeader != null && distanceFromLeader >= LAGGING_THRESHOLD_M;

            const canKick = canManageMembers && !isLeaderRow && member.participantId !== selfId;

            return (
              <div key={member.participantId} className="member-row">
                <span className={`member-dot ${isLeaderRow ? "leader" : isLagging ? "lagging" : "member"}`} />
                <div style={{ flex: 1 }}>
                  <div>{member.nickname}</div>
                  <div className="hint">
                    {Math.round(member.speed ?? 0)} km/h
                    {distanceFromLeader != null ? ` · cách leader ${(distanceFromLeader / 1000).toFixed(1)} km` : ""}
                  </div>
                </div>
                {isLagging ? <span className="warning-pill">Đang tụt lại</span> : null}
                {canKick ? (
                  <button className="link-button" style={{ color: "var(--color-error)" }} onClick={() => onKickMember?.(member.participantId)}>
                    Kick
                  </button>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      {canManageMembers ? (
        <div className="card">
          <h2>Mời qua email/SĐT</h2>
          <form onSubmit={handleInvite} style={{ display: "flex", gap: 8 }}>
            <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
              <input
                value={inviteValue}
                onChange={(e) => setInviteValue(e.target.value)}
                placeholder="Email hoặc số điện thoại"
                required
              />
            </div>
            <button className="btn" type="submit" disabled={inviting}>
              {inviting ? "Đang gửi..." : "Mời"}
            </button>
          </form>
          {inviteError ? <p className="error-text">{inviteError}</p> : null}
          {inviteMessage ? <p className="hint">{inviteMessage}</p> : null}
        </div>
      ) : null}

      <button className="btn btn-danger" onClick={onTriggerSos} style={{ width: "100%" }}>
        Gửi SOS
      </button>
    </div>
  );
}
