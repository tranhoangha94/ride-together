"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api, ApiError } from "../../../lib/api";
import { fetchCurrentUser } from "../../../lib/auth";
import { getNickname, getRoomSocket } from "../../../lib/room-socket";
import { PlaceResult } from "../../../lib/geocode";
import { distanceMeters, LAGGING_THRESHOLD_M } from "../../../lib/geo";
import { Destination, LobbyParticipant, ParticipantLocation, Room, SafetyPoint } from "../../../lib/types";
import { CopyCode } from "../../../components/CopyCode";
import { DestinationPicker } from "../../../components/DestinationPicker";
import { TeamPanel } from "../../../components/TeamPanel";

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
  const [activeTab, setActiveTab] = useState<"journey" | "team">("journey");

  const [locations, setLocations] = useState<Record<string, ParticipantLocation>>({});
  const [safetyPoints, setSafetyPoints] = useState<SafetyPoint[]>([]);
  const [sharing, setSharing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser().then((user) => setCurrentUserId(user?.id ?? null));
  }, []);

  const watchIdRef = useRef<number | null>(null);
  const safetyFetchKeyRef = useRef("");
  const safetyFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const isLeader = !!room && nickname === room.leaderNickname;
  // Kick/invite need a real, unspoofable identity check - unlike isLeader
  // above (nickname match, good enough for start/stop/destination), so
  // these features are simply unavailable unless the room's leader was
  // logged in when they created it.
  const canManageMembers = !!room?.leaderUserId && room.leaderUserId === currentUserId;

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
    socket.on("room_stopped", () => {
      setPhase("lobby");
      setStarting(false);
    });
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

    socket.on("member_kicked", (event: { participantId: string; nickname?: string }) => {
      setLobby((current) => {
        const next = { ...current };
        delete next[event.participantId];
        return next;
      });
      setLocations((current) => {
        const next = { ...current };
        delete next[event.participantId];
        return next;
      });
      if (event.participantId === socket.id) {
        window.alert("Bạn đã bị leader đưa ra khỏi phòng.");
        router.push("/");
      }
    });

    return () => {
      socket.emit("leave_room", { roomId });
      socket.off("connect");
      socket.off("lobby_participant_joined");
      socket.off("lobby_participant_left");
      socket.off("room_started");
      socket.off("room_stopped");
      socket.off("destination_updated");
      socket.off("member_location_updated");
      socket.off("member_offline");
      socket.off("sos_alert");
      socket.off("member_kicked");
    };
  }, [nickname, room, roomId, router]);

  function handleStart() {
    setStarting(true);
    const socket = getRoomSocket(nickname);
    socket.emit("start_room", { roomId });
  }

  function handleKickMember(targetParticipantId: string) {
    if (!window.confirm("Đưa thành viên này ra khỏi phòng?")) return;
    const socket = getRoomSocket(nickname);
    socket.emit("kick_member", { roomId, targetParticipantId });
  }

  function handleBackToLobby() {
    if (!window.confirm("Quay lại phòng chờ? Cả đoàn sẽ được đưa về phòng chờ để đổi điểm đến hoặc hủy chuyến.")) return;
    const socket = getRoomSocket(nickname);
    socket.emit("stop_room", { roomId });
  }

  function handleSelectDestination(place: PlaceResult) {
    const socket = getRoomSocket(nickname);
    socket.emit("set_destination", { roomId, label: place.label, lat: place.lat, lng: place.lng });
  }

  // Debounced + deduped by a rounded (lat, lng, radius) key so panning/zooming
  // the map (or the rider moving) can refetch safety points for the new area
  // without re-querying on every tiny move or overlapping in-flight request.
  const fetchSafetyPoints = useCallback((lat: number, lng: number, radius = 2000) => {
    const normalizedRadius = Math.min(5000, Math.max(800, Math.round(radius)));
    const key = `${Math.round(lat * 2000)}:${Math.round(lng * 2000)}:${Math.round(normalizedRadius / 500)}`;
    if (safetyFetchKeyRef.current === key) return;
    safetyFetchKeyRef.current = key;

    if (safetyFetchTimerRef.current) clearTimeout(safetyFetchTimerRef.current);
    safetyFetchTimerRef.current = setTimeout(async () => {
      try {
        const points = await api<SafetyPoint[]>(`/safety-points/nearby?lat=${lat}&lng=${lng}&radius=${normalizedRadius}`);
        setSafetyPoints(points);
      } catch {
        // Best-effort; the map still works without safety points.
      }
    }, 450);
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
        fetchSafetyPoints(position.coords.latitude, position.coords.longitude);

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

  // Keep the screen awake while sharing location, so a rider glancing at
  // the map mid-ride doesn't have the phone auto-lock and silently stop
  // GPS updates. The Wake Lock is released by the browser whenever the tab
  // is hidden (app-switch, real screen lock), so it must be re-requested on
  // the next "visible" event rather than only once.
  useEffect(() => {
    if (!sharing || !("wakeLock" in navigator)) return;

    let cancelled = false;

    async function acquireWakeLock() {
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (cancelled) {
          sentinel.release();
          return;
        }
        wakeLockRef.current = sentinel;
      } catch {
        // Not fatal (e.g. tab not visible yet) - sharing still works, the screen may just sleep normally.
      }
    }

    acquireWakeLock();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !wakeLockRef.current) acquireWakeLock();
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [sharing]);

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
            Mã phòng: <CopyCode code={room.code} /> — chia sẻ mã này cho cả đoàn.
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
  const leaderLocation = memberList.find((m) => m.nickname === room.leaderNickname);
  const hasLaggingMember = leaderLocation
    ? memberList.some((m) => m.nickname !== room.leaderNickname && distanceMeters(leaderLocation, m) >= LAGGING_THRESHOLD_M)
    : false;

  return (
    <div className="room-shell">
      <div className="tab-bar">
        {isLeader ? (
          <button
            className="room-back-btn"
            onClick={handleBackToLobby}
            aria-label="Quay lại phòng chờ"
            title="Quay lại phòng chờ"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M19 12H5M5 12L11 6M5 12L11 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
        <button
          className={`tab-btn ${activeTab === "journey" ? "active" : ""}`}
          onClick={() => setActiveTab("journey")}
        >
          Hành trình
        </button>
        <button className={`tab-btn ${activeTab === "team" ? "active" : ""}`} onClick={() => setActiveTab("team")}>
          Team
          {hasLaggingMember ? <span className="tab-alert-dot" /> : null}
        </button>
      </div>

      {activeTab === "journey" ? (
        <RoomMap
          center={center}
          members={memberList}
          leaderNickname={room.leaderNickname}
          safetyPoints={safetyPoints}
          selfId={selfId}
          destination={destination}
          onViewportChange={fetchSafetyPoints}
        />
      ) : (
        <TeamPanel
          room={room}
          destination={destination}
          isLeader={isLeader}
          onSelectDestination={handleSelectDestination}
          members={memberList}
          sharing={sharing}
          onToggleSharing={sharing ? stopSharing : startSharing}
          locationError={locationError}
          onTriggerSos={triggerSos}
          selfId={selfId}
          canManageMembers={canManageMembers}
          onKickMember={handleKickMember}
        />
      )}
    </div>
  );
}
