"use client";

import { PlaceResult } from "../lib/geocode";
import { distanceMeters, LAGGING_THRESHOLD_M } from "../lib/geo";
import { Destination, ParticipantLocation, Room } from "../lib/types";
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
  onTriggerSos
}: Props) {
  const leader = members.find((m) => m.nickname === room.leaderNickname);

  return (
    <div className="team-panel">
      <div className="card">
        <h2>{room.name}</h2>
        <p className="hint">
          Mã phòng: <span className="invite-code">{room.code}</span>
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
              </div>
            );
          })
        )}
      </div>

      <button className="btn btn-danger" onClick={onTriggerSos} style={{ width: "100%" }}>
        Gửi SOS
      </button>
    </div>
  );
}
