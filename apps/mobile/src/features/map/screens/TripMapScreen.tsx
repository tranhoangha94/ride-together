import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Region, UrlTile } from "react-native-maps";
import { RootStackParamList } from "../../../navigation/types";
import { api } from "../../../core/api/client";
import { getTripSocket } from "../../../core/realtime/socket";
import { getCurrentTripLocation, requestTripLocationPermission, watchTripLocation } from "../../../core/location/locationService";
import { SOSButton } from "../../sos/components/SOSButton";
import { LiveLeafletMap, LiveLeafletMapHandle } from "../components/LiveLeafletMap";
import { MapLegend } from "../components/MapLegend";
import { MemberBottomSheet, MarkerMember } from "../components/MemberBottomSheet";
import { fetchSafetyPointsFromOverpass, SafetyPoint } from "../utils/safetyPoints";

type Props = NativeStackScreenProps<RootStackParamList, "TripMap">;

export function TripMapScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const isDemo = route.params.demo === true;
  const mapRef = useRef<MapView>(null);
  const demoMapRef = useRef<LiveLeafletMapHandle>(null);
  const safetyFetchRef = useRef<{ key: string; timer?: ReturnType<typeof setTimeout> }>({ key: "" });
  const [shareEnabled, setShareEnabled] = useState(false);
  const [safetyPoints, setSafetyPoints] = useState<SafetyPoint[]>([]);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [members, setMembers] = useState<Record<string, MarkerMember>>(
    isDemo
      ? {
          leader: { userId: "Bạn", lat: 10.7769, lng: 106.7009, speed: 42, recordedAt: new Date().toISOString() },
          rider1: { userId: "Rider 1", lat: 10.781, lng: 106.704, speed: 39, recordedAt: new Date().toISOString() },
          rider2: { userId: "Rider 2", lat: 10.771, lng: 106.697, speed: 35, recordedAt: new Date().toISOString() }
        }
      : {}
  );
  const memberList = useMemo(() => Object.values(members), [members]);
  const leader = memberList[0];

  const fetchSafetyPointsForViewport = useCallback(async ({ lat, lng, radius }: { lat: number; lng: number; radius: number }) => {
    const normalizedRadius = Math.min(5000, Math.max(500, Math.round(radius)));
    const key = `${Math.round(lat * 2000)}:${Math.round(lng * 2000)}:${Math.round(normalizedRadius / 500)}`;
    if (safetyFetchRef.current.key === key) return;
    safetyFetchRef.current.key = key;

    if (safetyFetchRef.current.timer) {
      clearTimeout(safetyFetchRef.current.timer);
    }

    safetyFetchRef.current.timer = setTimeout(async () => {
      setSafetyLoading(true);
      try {
        const nearby = await api<SafetyPoint[]>(`/safety-points/nearby?lat=${lat}&lng=${lng}&radius=${normalizedRadius}`);
        if (nearby.length > 0) {
          setSafetyPoints(nearby);
          return;
        }
        setSafetyPoints(await fetchSafetyPointsFromOverpass(lat, lng, normalizedRadius));
      } catch {
        setSafetyPoints(await fetchSafetyPointsFromOverpass(lat, lng, normalizedRadius));
      } finally {
        setSafetyLoading(false);
      }
    }, 450);
  }, []);

  useEffect(() => {
    if (!isDemo) return;

    async function loadDemoLeaderLocation() {
      const granted = await requestTripLocationPermission();
      if (!granted) {
        Alert.alert("Cần quyền vị trí", "Bật GPS để demo đặt bạn làm trưởng đoàn trên bản đồ.");
        return;
      }

      const current = await getCurrentTripLocation();
      const lat = current.coords.latitude;
      const lng = current.coords.longitude;
      const speedKmh = Math.max(0, Math.round((current.coords.speed ?? 0) * 3.6));
      setMembers({
        leader: { userId: "Bạn", lat, lng, speed: speedKmh, recordedAt: new Date().toISOString() },
        rider1: { userId: "Rider 1", lat: lat + 0.0032, lng: lng + 0.0027, speed: 39, recordedAt: new Date().toISOString() },
        rider2: { userId: "Rider 2", lat: lat - 0.0037, lng: lng - 0.0025, speed: 35, recordedAt: new Date().toISOString() }
      });
      await fetchSafetyPointsForViewport({ lat, lng, radius: 1500 });
    }

    void loadDemoLeaderLocation();
  }, [fetchSafetyPointsForViewport, isDemo]);

  useEffect(() => {
    if (isDemo) return;

    async function loadLiveSafetyPoints() {
      const granted = await requestTripLocationPermission();
      if (!granted) return;
      const current = await getCurrentTripLocation();
      await fetchSafetyPointsForViewport({
        lat: current.coords.latitude,
        lng: current.coords.longitude,
        radius: 2000
      });
    }

    void loadLiveSafetyPoints();
  }, [fetchSafetyPointsForViewport, isDemo]);

  useEffect(() => {
    let cleanup = () => {};
    async function connect() {
      if (isDemo) return;
      const granted = await requestTripLocationPermission();
      if (!granted) {
        Alert.alert("Cần quyền vị trí", "Bật GPS để chia sẻ vị trí trong chuyến đi.");
        return;
      }

      const socket = await getTripSocket();
      socket.emit("join_trip_room", { tripId });
      socket.on("member_location_updated", (event) => {
        const userId = event.user?.displayName ?? event.userId ?? event.user?.id;
        if (!userId) return;
        setMembers((current) => ({
          ...current,
          [userId]: {
            userId,
            lat: Number(event.location.lat),
            lng: Number(event.location.lng),
            speed: Number(event.location.speed ?? 0),
            recordedAt: event.location.recordedAt
          }
        }));
      });
      socket.on("member_lagging", () => Alert.alert("Thành viên tụt lại", "Một rider có thể đang bị tụt khỏi đoàn."));
      socket.on("member_offline", () => Alert.alert("Mất kết nối", "Một thành viên đã mất kết nối."));
      socket.on("sos_alert", () => Alert.alert("SOS", "Một thành viên cần hỗ trợ ngay!"));
      cleanup = () => {
        socket.emit("leave_trip_room", { tripId });
        socket.removeAllListeners();
      };
    }
    void connect();
    return cleanup;
  }, [isDemo, tripId]);

  useEffect(() => {
    let subscription: { remove: () => void } | undefined;
    async function startWatch() {
      if (!shareEnabled || isDemo) return;
      const socket = await getTripSocket();
      subscription = await watchTripLocation((location) => {
        socket.emit("location_update", {
          tripId,
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          speed: location.coords.speed ?? 0,
          heading: location.coords.heading ?? 0,
          accuracy: location.coords.accuracy ?? 0,
          recordedAt: new Date(location.timestamp).toISOString()
        });
      });
    }
    void startWatch();
    return () => subscription?.remove();
  }, [isDemo, shareEnabled, tripId]);

  async function centerMe() {
    if (isDemo && leader) {
      demoMapRef.current?.centerOn(leader.lat, leader.lng, 15);
      return;
    }
    const current = await getCurrentTripLocation();
    mapRef.current?.animateToRegion({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02
    });
  }

  async function triggerSos() {
    if (isDemo) {
      Alert.alert("Demo SOS", "Đây là cách cảnh báo SOS sẽ hoạt động trong chuyến đi thật.");
      return;
    }
    const current = await getCurrentTripLocation();
    const socket = await getTripSocket();
    socket.emit("sos_trigger", {
      tripId,
      lat: current.coords.latitude,
      lng: current.coords.longitude,
      message: "Cần hỗ trợ"
    });
  }

  async function toggleShareLocation() {
    const next = !shareEnabled;
    if (isDemo) {
      setShareEnabled(next);
      return;
    }
    await api(`/trips/${tripId}/share-location`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: next })
    });
    setShareEnabled(next);
  }

  function handleLiveRegionChange(region: Region) {
    const radius = Math.max(
      500,
      Math.min(5000, Math.round(Math.max(region.latitudeDelta, region.longitudeDelta) * 111_000 * 0.6))
    );
    void fetchSafetyPointsForViewport({ lat: region.latitude, lng: region.longitude, radius });
  }

  const cameraCount = safetyPoints.filter((point) => point.type === "camera").length;
  const signalCount = safetyPoints.filter((point) => point.type === "traffic_signal").length;

  return (
    <View style={styles.root}>
      {isDemo ? (
        <LiveLeafletMap ref={demoMapRef} members={memberList} safetyPoints={safetyPoints} onViewportChanged={fetchSafetyPointsForViewport} />
      ) : (
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          mapType="none"
          initialRegion={{ latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
          showsUserLocation
          onRegionChangeComplete={handleLiveRegionChange}
        >
          <UrlTile maximumZ={19} tileSize={256} urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {memberList.map((member) => (
            <Marker
              key={member.userId}
              coordinate={{ latitude: member.lat, longitude: member.lng }}
              title={member.userId}
              description={`${Math.round(member.speed ?? 0)} km/h`}
              pinColor="#12B76A"
            />
          ))}
          {safetyPoints.map((point) => (
            <Marker
              key={point.id}
              coordinate={{ latitude: point.lat, longitude: point.lng }}
              title={point.title}
              description={point.description ?? undefined}
              pinColor={point.type === "camera" ? "#D92D20" : "#DC6803"}
            />
          ))}
        </MapView>
      )}

      <View style={styles.topBar}>
        <Pressable style={styles.navButton} onPress={() => navigation.goBack()}>
          <Text style={styles.navText}>← Quay lại</Text>
        </Pressable>
        {isDemo ? <Text style={styles.demoBadge}>Demo</Text> : null}
        <Pressable style={[styles.shareButton, shareEnabled && styles.shareButtonOn]} onPress={toggleShareLocation}>
          <Text style={shareEnabled ? styles.shareTextOn : styles.shareText}>{shareEnabled ? "Đang chia sẻ" : "Chia sẻ vị trí"}</Text>
        </Pressable>
      </View>

      <MapLegend />

      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {safetyLoading ? "Đang tải điểm an toàn..." : `${cameraCount} camera · ${signalCount} đèn`}
        </Text>
      </View>

      <Pressable style={styles.centerButton} onPress={centerMe}>
        <Text style={styles.centerText}>📍 Vị trí tôi</Text>
      </Pressable>
      <SOSButton onPress={triggerSos} />
      <MemberBottomSheet members={memberList} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { position: "absolute", top: 52, left: 16, right: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  navButton: { backgroundColor: "#FFF", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  navText: { fontWeight: "700", color: "#344054" },
  shareButton: { backgroundColor: "#FFF", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  demoBadge: { backgroundColor: "#101828", color: "#FFF", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, overflow: "hidden", fontWeight: "700" },
  shareButtonOn: { backgroundColor: "#027A48" },
  shareText: { color: "#344054", fontWeight: "700", fontSize: 12 },
  shareTextOn: { color: "#FFF", fontWeight: "700", fontSize: 12 },
  statsBar: {
    position: "absolute",
    right: 16,
    top: 112,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  statsText: { fontSize: 11, fontWeight: "600", color: "#475467" },
  centerButton: { position: "absolute", right: 18, bottom: 252, backgroundColor: "#FFF", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10 },
  centerText: { fontWeight: "700", color: "#344054", fontSize: 13 }
});
