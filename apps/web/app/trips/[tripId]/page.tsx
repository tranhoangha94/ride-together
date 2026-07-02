"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { RequireAuth } from "../../../lib/require-auth";
import { useAuth } from "../../../lib/auth-context";
import { api, ApiError } from "../../../lib/api";
import { getTripSocket } from "../../../lib/socket";
import { MemberLocation, SafetyPoint, Trip, TripMember } from "../../../lib/types";

const RoomMap = dynamic(() => import("../../../components/RoomMap").then((m) => m.RoomMap), { ssr: false });

const DEFAULT_CENTER = { lat: 21.0285, lng: 105.8542 };

const STATUS_LABEL: Record<Trip["status"], string> = {
  draft: "Chưa bắt đầu",
  active: "Đang diễn ra",
  ended: "Đã kết thúc",
  cancelled: "Đã huỷ"
};

function TripRoomContent() {
  const params = useParams<{ tripId: string }>();
  const tripId = params.tripId;
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [roster, setRoster] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const [shareEnabled, setShareEnabled] = useState(false);
  const [locations, setLocations] = useState<Record<string, MemberLocation>>({});
  const [safetyPoints, setSafetyPoints] = useState<SafetyPoint[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const safetyFetchedRef = useRef(false);

  const isMember = !!user && roster.some((m) => m.userId === user.id);
  const isLeader = !!user && trip?.leaderId === user.id;

  const loadTrip = useCallback(async () => {
    setLoading(true);
    try {
      const detail = await api<{ trip: Trip; members: TripMember[] }>(`/trips/${tripId}`);
      setTrip(detail.trip);
      setRoster(detail.members);
      const mine = detail.members.find((m) => m.userId === user?.id);
      if (mine) setShareEnabled(mine.shareLocationEnabled);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không tải được room.");
    } finally {
      setLoading(false);
    }
  }, [tripId, user?.id]);

  useEffect(() => {
    void loadTrip();
  }, [loadTrip]);

  // Socket connection + realtime member locations
  useEffect(() => {
    if (!isMember) return;
    const socket = getTripSocket();
    socket.emit("join_trip_room", { tripId });

    socket.on("member_location_updated", (event: any) => {
      const userId = event.userId ?? event.user?.id;
      const displayName = event.user?.displayName ?? userId;
      if (!userId) return;
      setLocations((current) => ({
        ...current,
        [userId]: {
          userId,
          displayName,
          lat: Number(event.location.lat),
          lng: Number(event.location.lng),
          speed: Number(event.location.speed ?? 0),
          recordedAt: event.location.recordedAt
        }
      }));
    });

    socket.on("sos_alert", (event: any) => {
      window.alert(`SOS! ${event.user?.displayName ?? "Một thành viên"} cần hỗ trợ ngay.`);
    });

    return () => {
      socket.emit("leave_trip_room", { tripId });
      socket.off("member_location_updated");
      socket.off("sos_alert");
    };
  }, [isMember, tripId]);

  // Fetch safety points once we know roughly where we are
  const fetchSafetyPoints = useCallback(async (lat: number, lng: number) => {
    if (safetyFetchedRef.current) return;
    safetyFetchedRef.current = true;
    try {
      const points = await api<SafetyPoint[]>(`/safety-points/nearby?lat=${lat}&lng=${lng}&radius=2000`);
      setSafetyPoints(points);
    } catch {
      // Safety point data is best-effort; ignore failures.
    }
  }, []);

  async function handleJoin() {
    setJoining(true);
    setError(null);
    try {
      await api(`/trips/${tripId}/join`, { method: "POST", body: JSON.stringify({}) });
      await loadTrip();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tham gia room thất bại.");
    } finally {
      setJoining(false);
    }
  }

  async function handleStart() {
    await api(`/trips/${tripId}/start`, { method: "PATCH" });
    await loadTrip();
  }

  async function handleEnd() {
    await api(`/trips/${tripId}/end`, { method: "PATCH" });
    await loadTrip();
  }

  function stopWatch() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  async function toggleShareLocation() {
    const next = !shareEnabled;
    setLocationError(null);

    if (!next) {
      stopWatch();
      setShareEnabled(false);
      await api(`/trips/${tripId}/share-location`, { method: "PATCH", body: JSON.stringify({ enabled: false }) });
      return;
    }

    if (!("geolocation" in navigator)) {
      setLocationError("Trình duyệt này không hỗ trợ định vị.");
      return;
    }

    // Trigger the browser permission prompt (or surface a denial) before flipping the toggle on.
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setShareEnabled(true);
        await api(`/trips/${tripId}/share-location`, { method: "PATCH", body: JSON.stringify({ enabled: true }) });
        void fetchSafetyPoints(position.coords.latitude, position.coords.longitude);

        const socket = getTripSocket();
        const selfLocation: MemberLocation = {
          userId: user!.id,
          displayName: user!.displayName,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed ?? 0,
          recordedAt: new Date().toISOString()
        };
        setLocations((current) => ({ ...current, [user!.id]: selfLocation }));
        socket.emit("location_update", {
          tripId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed: position.coords.speed ?? 0,
          heading: position.coords.heading ?? 0,
          accuracy: position.coords.accuracy ?? 0,
          recordedAt: new Date().toISOString()
        });

        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const socketRef = getTripSocket();
            setLocations((current) => ({
              ...current,
              [user!.id]: {
                userId: user!.id,
                displayName: user!.displayName,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                speed: pos.coords.speed ?? 0,
                recordedAt: new Date().toISOString()
              }
            }));
            socketRef.emit("location_update", {
              tripId,
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
  }

  async function triggerSos() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const socket = getTripSocket();
      socket.emit("sos_trigger", {
        tripId,
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        message: "Cần hỗ trợ"
      });
      window.alert("Đã gửi tín hiệu SOS tới cả đoàn.");
    });
  }

  useEffect(() => stopWatch, []);

  if (loading) {
    return (
      <main>
        <p className="hint">Đang tải room...</p>
      </main>
    );
  }

  if (!trip) {
    return (
      <main>
        <p className="error-text">{error ?? "Không tìm thấy room."}</p>
      </main>
    );
  }

  if (!isMember) {
    return (
      <main className="auth-shell">
        <div className="card">
          <h2>{trip.name}</h2>
          <p className="hint">Bạn chưa ở trong room này. Tham gia để xem vị trí cả đoàn.</p>
          {error ? <p className="error-text">{error}</p> : null}
          <button className="btn" onClick={handleJoin} disabled={joining}>
            {joining ? "Đang tham gia..." : "Tham gia room"}
          </button>
        </div>
      </main>
    );
  }

  const memberList = Object.values(locations);
  const center = memberList[0] ? { lat: memberList[0].lat, lng: memberList[0].lng } : DEFAULT_CENTER;

  return (
    <div className="room-layout">
      <RoomMap center={center} members={memberList} leaderId={trip.leaderId} safetyPoints={safetyPoints} />

      <div className="room-sidebar">
        <div className="card">
          <h2>{trip.name}</h2>
          <span className="status-pill status-active">{STATUS_LABEL[trip.status]}</span>
          {isLeader ? (
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              {trip.status === "draft" ? (
                <button className="btn" onClick={handleStart}>
                  Bắt đầu chuyến đi
                </button>
              ) : null}
              {trip.status === "active" ? (
                <button className="btn btn-secondary" onClick={handleEnd}>
                  Kết thúc
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="card">
          <button className={`btn ${shareEnabled ? "" : "btn-secondary"}`} onClick={toggleShareLocation} style={{ width: "100%" }}>
            {shareEnabled ? "Đang chia sẻ vị trí (chạm để tắt)" : "Chia sẻ vị trí của tôi"}
          </button>
          {locationError ? <p className="error-text">{locationError}</p> : null}
        </div>

        <div className="card">
          <h2>Thành viên ({roster.length})</h2>
          {roster.map((member) => {
            const live = locations[member.userId];
            return (
              <div key={member.userId} className="member-row">
                <span
                  className="member-dot"
                  style={{ background: member.userId === trip.leaderId ? "#1570EF" : "#12B76A" }}
                />
                <div style={{ flex: 1 }}>
                  <div>{member.user?.displayName ?? member.userId}</div>
                  <div className="hint">{live ? `${Math.round(live.speed ?? 0)} km/h` : "Chưa chia sẻ vị trí"}</div>
                </div>
              </div>
            );
          })}
        </div>

        <button className="btn btn-danger" onClick={triggerSos} style={{ width: "100%" }}>
          Gửi SOS
        </button>
      </div>
    </div>
  );
}

export default function TripRoomPage() {
  return (
    <RequireAuth>
      <TripRoomContent />
    </RequireAuth>
  );
}
