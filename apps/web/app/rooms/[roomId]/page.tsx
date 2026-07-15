"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api, ApiError } from "../../../lib/api";
import { getNickname, getRoomSocket } from "../../../lib/room-socket";
import { PlaceResult } from "../../../lib/geocode";
import { Destination, LobbyParticipant, ParticipantLocation, Room, SafetyPoint } from "../../../lib/types";
import { DestinationPicker } from "../../../components/DestinationPicker";

const RoomMap = dynamic(() => import("../../../components/RoomMap").then((m) => m.RoomMap), { ssr: false });

const DEFAULT_CENTER = { lat: 21.0285, lng: 105.8542 };

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const router = useRouter();
  const nickname = getNickname();

  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"lobby" | "map">("lobby");
  const [lobby, setLobby] = useState<Record<string, LobbyParticipant>>({});
  const [starting, setStarting] = useState(false);
  const [destination, setDestination] = useState<Destination | null>(null);

  const [locations, setLocations] = useState<Record<string, ParticipantLocation>>({});
  const [safetyPoints, setSafetyPoints] = useState<SafetyPoint[]>([]);
  const [sharing, setSharing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const safetyFetchedRef = useRef(false);
  const isLeader = !!room && nickname === room.leaderNickname;

  useEffect(() => {
    if (!nickname) {
      router.replace("/");
      return;
    }
    api<Room>(`/rooms/${roomId}`)
      .then((r) => {
        setRoom(r);
        if (r.started) setPhase("map");
        if (r.destinationLat != null && r.destinationLng != null) {
          setDestination({ label: r.destinationLabel ?? "", lat: r.destinationLat, lng: r.destinationLng });
        }
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Không tìm thấy phòng."));
  }, [roomId, nickname, router]);

  useEffect(() => {
    if (!nickname || !room) return;
    const socket = getRoomSocket(nickname);
    setSelfId(socket.id ?? null);

    function join() {
      socket.emit(
        "join_room",
        { roomId },
        (res: { ok: boolean; started?: boolean; lobby?: LobbyParticipant[]; destination?: Destination | null }) => {
          if (!res.ok) return;
          if (res.started) setPhase("map");
          if (res.destination) setDestination(res.destination);
          if (res.lobby) {
            setLobby((current) => {
              const next = { ...current };
              for (const p of res.lobby!) next[p.participantId] = p;
              next[socket.id!] = { participantId: socket.id!, nickname };
              return next;
            });
          }
        }
      );
    }

    socket.on("connect", () => {
      setSelfId(socket.id ?? null);
      join();
    });
    join();

    socket.on("lobby_participant_joined", (p: LobbyParticipant) => {
      setLobby((current) => ({ ...current, [p.participantId]: p }));
    });

    socket.on("lobby_participant_left", (p: LobbyParticipant) => {
      setLobby((current) => {
        const next = { ...current };
        delete next[p.participantId];
        return next;
      });
    });

    socket.on("room_started", () => setPhase("map"));
    socket.on("destination_updated", (d: Destination) => setDestination(d));

    socket.on("member_location_updated", (event: ParticipantLocation) => {
      setLocations((current) => ({ ...current, [event.participantId]: event }));
    });

    socket.on("member_offline", (event: { participantId: string }) => {
      setLocations((current) => {
        const next = { ...current };
        delete next[event.participantId];
        return next;
      });
    });

    socket.on("sos_alert", (event: { nickname: string }) => {
      window.alert(`SOS! ${event.nickname} cần hỗ trợ ngay.`);
    });

    return () => {
      socket.emit("leave_room", { roomId });
      socket.off("connect");
      socket.off("lobby_participant_joined");
      socket.off("lobby_participant_left");
      socket.off("room_started");
      socket.off("destination_updated");
      socket.off("member_location_updated");
      socket.off("member_offline");
      socket.off("sos_alert");
    };
  }, [nickname, room, roomId]);

  function handleStart() {
    setStarting(true);
    const socket = getRoomSocket(nickname);
    socket.emit("start_room", { roomId });
  }

  function handleSelectDestination(place: PlaceResult) {
    const socket = getRoomSocket(nickname);
    socket.emit("set_destination", { roomId, label: place.label, lat: place.lat, lng: place.lng });
  }

  const fetchSafetyPoints = useCallback(async (lat: number, lng: number) => {
    if (safetyFetchedRef.current) return;
    safetyFetchedRef.current = true;
    try {
      const points = await api<SafetyPoint[]>(`/safety-points/nearby?lat=${lat}&lng=${lng}&radius=2000`);
      setSafetyPoints(points);
    } catch {
      // Best-effort; the map still works without safety points.
    }
  }, []);

  const startSharing = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocationError("Trình duyệt này không hỗ trợ định vị.");
      return;
    }
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSharing(true);
        void fetchSafetyPoints(position.coords.latitude, position.coords.longitude);

        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const socket = getRoomSocket(nickname);
            socket.emit("location_update", {
              roomId,
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              speed: pos.coords.speed ?? 0,
              heading: pos.coords.heading ?? 0,
              accuracy: pos.coords.accuracy ?? 0,
              recordedAt: new Date().toISOString()
            });
          },
          () => setLocationError("Mất quyền truy cập vị trí."),
          { enableHighAccuracy: true, maximumAge: 5000 }
        );
      },
      () => setLocationError("Bạn cần cho phép truy cập vị trí để chia sẻ với đoàn.")
    );
  }, [fetchSafetyPoints, nickname, roomId]);

  const stopSharing = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
  }, []);

  // Share as soon as the trip actually starts - no separate toggle to remember to hit.
  useEffect(() => {
    if (phase === "map") startSharing();
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function triggerSos() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const socket = getRoomSocket(nickname);
      socket.emit("sos_trigger", {
        roomId,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        message: "Cần hỗ trợ"
      });
      window.alert("Đã gửi tín hiệu SOS tới cả phòng.");
    });
  }

  if (error) {
    return (
      <main className="auth-shell">
        <div className="card">
          <p className="error-text">{error}</p>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main>
        <p className="hint">Đang vào phòng...</p>
      </main>
    );
  }

  if (phase === "lobby") {
    const participants = Object.values(lobby);
    return (
      <main className="auth-shell">
        <button className="back-link" onClick={() => router.push("/")}>
          ← Quay lại
        </button>
        <div className="card">
          <h2>{room.name}</h2>
          <p className="hint">
            Mã phòng: <span className="invite-code">{room.code}</span> — chia sẻ mã này cho cả đoàn.
          </p>
        </div>

        <DestinationPicker destination={destination} canEdit={isLeader} onSelect={handleSelectDestination} />

        <div className="card">
          <h2>Đã vào phòng ({participants.length})</h2>
          {participants.map((p) => (
            <div key={p.participantId} className="list-item">
              <span>{p.nickname}</span>
              {p.nickname === room.leaderNickname ? <span className="hint">leader</span> : null}
            </div>
          ))}
        </div>
        {isLeader ? (
          <button className="btn" onClick={handleStart} disabled={starting} style={{ width: "100%" }}>
            {starting ? "Đang xuất phát..." : "Xuất phát"}
          </button>
        ) : (
          <p className="hint" style={{ textAlign: "center" }}>
            Đang chờ leader bấm xuất phát...
          </p>
        )}
      </main>
    );
  }

  const memberList = Object.values(locations);
  const center = memberList[0] ? { lat: memberList[0].lat, lng: memberList[0].lng } : DEFAULT_CENTER;

  return (
    <div className="room-layout">
      <RoomMap
        center={center}
        members={memberList}
        leaderNickname={room.leaderNickname}
        safetyPoints={safetyPoints}
        selfId={selfId}
        destination={destination}
      />

      <div className="room-sidebar">
        <div className="card">
          <h2>{room.name}</h2>
          <p className="hint">
            Mã phòng: <span className="invite-code">{room.code}</span>
          </p>
        </div>

        <DestinationPicker destination={destination} canEdit={isLeader} onSelect={handleSelectDestination} />

        <div className="card">
          <button
            className={`btn ${sharing ? "" : "btn-secondary"}`}
            onClick={sharing ? stopSharing : startSharing}
            style={{ width: "100%" }}
          >
            {sharing ? "Đang chia sẻ vị trí (chạm để tắt)" : "Chia sẻ vị trí của tôi"}
          </button>
          {locationError ? <p className="error-text">{locationError}</p> : null}
        </div>

        <div className="card">
          <h2>Thành viên ({memberList.length})</h2>
          {memberList.length === 0 ? (
            <p className="hint">Chưa có ai chia sẻ vị trí.</p>
          ) : (
            memberList.map((member) => (
              <div key={member.participantId} className="member-row">
                <span
                  className="member-dot"
                  style={{ background: member.nickname === room.leaderNickname ? "#1570EF" : "#12B76A" }}
                />
                <div style={{ flex: 1 }}>
                  <div>{member.nickname}</div>
                  <div className="hint">{Math.round(member.speed ?? 0)} km/h</div>
                </div>
              </div>
            ))
          )}
        </div>

        <button className="btn btn-danger" onClick={triggerSos} style={{ width: "100%" }}>
          Gửi SOS
        </button>
      </div>
    </div>
  );
}
