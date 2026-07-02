import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Region } from "react-native-maps";
import { RootStackParamList } from "../../../navigation/types";
import { api } from "../../../core/api/client";
import { getTripSocket } from "../../../core/realtime/socket";
import { getCurrentTripLocation, requestTripLocationPermission, watchTripLocation } from "../../../core/location/locationService";
import { SOSButton } from "../../sos/components/SOSButton";
import { MapLegend } from "../components/MapLegend";
import { NativeTripMap } from "../components/NativeTripMap";
import { MemberBottomSheet, MarkerMember } from "../components/MemberBottomSheet";
import { MemberMarker } from "../components/MemberMarker";
import { SafetyPointMarker } from "../components/SafetyPointMarker";
import { SafetyClusterMarker } from "../components/SafetyClusterMarker";
import { SafetyPointList } from "../components/SafetyPointList";
import { fetchSafetyPointsFromOverpass, SafetyPoint } from "../utils/safetyPoints";
import { adjustMapZoom, centerMapOn, resetMapNorth } from "../utils/mapCamera";
import { clusterSafetyPoints, deltaFromZoomBucket, SafetyCluster, zoomBucketFromDelta } from "../utils/clusterPoints";

type Props = NativeStackScreenProps<RootStackParamList, "TripMap">;

export function TripMapScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const isDemo = route.params.demo === true;
  const mapRef = useRef<MapView>(null);
  const safetyFetchRef = useRef<{ key: string; timer?: ReturnType<typeof setTimeout> }>({ key: "" });
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareUpdating, setShareUpdating] = useState(false);
  const [safetyPoints, setSafetyPoints] = useState<SafetyPoint[]>([]);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [lastRegion, setLastRegion] = useState<Region | null>(null);
  const [showSignals, setShowSignals] = useState(true);
  const [showCameras, setShowCameras] = useState(true);
  const [showSafetyList, setShowSafetyList] = useState(false);
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

  const zoomBucket = useMemo(() => zoomBucketFromDelta(lastRegion?.latitudeDelta ?? 0.08), [lastRegion?.latitudeDelta]);
  const visibleSafetyPoints = useMemo(
    () =>
      safetyPoints.filter((point) =>
        point.type === "camera" ? showCameras : showSignals
      ),
    [safetyPoints, showCameras, showSignals]
  );
  const safetyItems = useMemo(
    () => clusterSafetyPoints(visibleSafetyPoints, deltaFromZoomBucket(zoomBucket)),
    [visibleSafetyPoints, zoomBucket]
  );

  const handleClusterPress = useCallback((cluster: SafetyCluster) => {
    mapRef.current?.animateToRegion(
      {
        latitude: cluster.lat,
        longitude: cluster.lng,
        latitudeDelta: Math.max(0.003, deltaFromZoomBucket(zoomBucket) / 4),
        longitudeDelta: Math.max(0.003, deltaFromZoomBucket(zoomBucket) / 4)
      },
      300
    );
  }, [zoomBucket]);

  const fetchSafetyPointsForViewport = useCallback(async ({ lat, lng, radius }: { lat: number; lng: number; radius: number }) => {
    const normalizedRadius = Math.min(5000, Math.max(800, Math.round(radius)));
    const key = `${Math.round(lat * 2000)}:${Math.round(lng * 2000)}:${Math.round(normalizedRadius / 500)}`;
    if (safetyFetchRef.current.key === key) return;
    safetyFetchRef.current.key = key;

    if (safetyFetchRef.current.timer) {
      clearTimeout(safetyFetchRef.current.timer);
    }

    safetyFetchRef.current.timer = setTimeout(async () => {
      setSafetyLoading(true);
      try {
        const [apiPoints, overpassPoints] = await Promise.all([
          api<SafetyPoint[]>(`/safety-points/nearby?lat=${lat}&lng=${lng}&radius=${normalizedRadius}`).catch(() => [] as SafetyPoint[]),
          fetchSafetyPointsFromOverpass(lat, lng, normalizedRadius)
        ]);
        const merged = new Map<string, SafetyPoint>();
        for (const point of [...apiPoints, ...overpassPoints]) {
          merged.set(point.id, point);
        }
        setSafetyPoints([...merged.values()]);
      } finally {
        setSafetyLoading(false);
      }
    }, 450);
  }, []);

  useEffect(() => {
    if (!isDemo) return;

    async function loadDemoLeaderLocation() {
      const defaultLat = 10.7769;
      const defaultLng = 106.7009;

      async function loadSafetyAt(lat: number, lng: number) {
        await fetchSafetyPointsForViewport({ lat, lng, radius: 2500 });
      }

      async function focusMap(lat: number, lng: number) {
        await centerMapOn(mapRef, lat, lng);
        await loadSafetyAt(lat, lng);
      }

      const granted = await requestTripLocationPermission();
      if (!granted) {
        await focusMap(defaultLat, defaultLng);
        return;
      }

      try {
        const current = await getCurrentTripLocation();
        const lat = current.coords.latitude;
        const lng = current.coords.longitude;
        const speedKmh = Math.max(0, Math.round((current.coords.speed ?? 0) * 3.6));
        setMembers({
          leader: { userId: "Bạn", lat, lng, speed: speedKmh, recordedAt: new Date().toISOString() },
          rider1: { userId: "Rider 1", lat: lat + 0.0032, lng: lng + 0.0027, speed: 39, recordedAt: new Date().toISOString() },
          rider2: { userId: "Rider 2", lat: lat - 0.0037, lng: lng - 0.0025, speed: 35, recordedAt: new Date().toISOString() }
        });
        await focusMap(lat, lng);
      } catch {
        await focusMap(defaultLat, defaultLng);
      }
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
      await centerMapOn(mapRef, leader.lat, leader.lng);
      return;
    }
    const current = await getCurrentTripLocation();
    await centerMapOn(mapRef, current.coords.latitude, current.coords.longitude);
  }

  async function resetNorth() {
    await resetMapNorth(mapRef);
  }

  async function zoomIn() {
    await adjustMapZoom(mapRef, lastRegion, 1);
  }

  async function zoomOut() {
    await adjustMapZoom(mapRef, lastRegion, -1);
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
    setShareEnabled(next);
    setShareUpdating(true);
    try {
      await api(`/trips/${tripId}/share-location`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: next })
      });
    } catch {
      setShareEnabled(!next);
      Alert.alert("Không thể cập nhật", "Bật/tắt chia sẻ vị trí thất bại, vui lòng thử lại.");
    } finally {
      setShareUpdating(false);
    }
  }

  const handleSelectMember = useCallback((member: MarkerMember) => {
    void centerMapOn(mapRef, member.lat, member.lng);
  }, []);

  function handleRegionChange(region: Region) {
    setLastRegion(region);
    const radius = Math.max(
      500,
      Math.min(5000, Math.round(Math.max(region.latitudeDelta, region.longitudeDelta) * 111_000 * 0.6))
    );
    void fetchSafetyPointsForViewport({ lat: region.latitude, lng: region.longitude, radius });
  }

  const cameraCount = visibleSafetyPoints.filter((point) => point.type === "camera").length;
  const signalCount = visibleSafetyPoints.filter((point) => point.type === "traffic_signal").length;

  const handleSelectSafetyPoint = useCallback((point: SafetyPoint) => {
    setShowSafetyList(false);
    void centerMapOn(mapRef, point.lat, point.lng);
  }, []);

  return (
    <View style={styles.root}>
      <NativeTripMap
        ref={mapRef}
        style={styles.map}
        initialRegion={{ latitude: 10.7769, longitude: 106.7009, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        onRegionChangeComplete={handleRegionChange}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetNorth={resetNorth}
        onCenterMe={centerMe}
      >
        {memberList.map((member, index) => (
          <MemberMarker key={member.userId} member={member} isLeader={index === 0} />
        ))}
        {safetyItems.map((item) =>
          item.kind === "point" ? (
            <SafetyPointMarker key={item.point.id} point={item.point} />
          ) : (
            <SafetyClusterMarker key={item.cluster.id} cluster={item.cluster} onPress={handleClusterPress} />
          )
        )}
      </NativeTripMap>

      <View style={styles.topBar}>
        <Pressable
          style={styles.navButton}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.replace("Home"))}
        >
          <Text style={styles.navText}>← Quay lại</Text>
        </Pressable>
        {isDemo ? <Text style={styles.demoBadge}>Demo</Text> : null}
        <Pressable
          style={[styles.shareButton, shareEnabled && styles.shareButtonOn]}
          onPress={toggleShareLocation}
          disabled={shareUpdating}
          accessibilityRole="button"
          accessibilityLabel={shareEnabled ? "Đang chia sẻ vị trí, chạm để tắt" : "Chạm để chia sẻ vị trí"}
        >
          <Text style={shareEnabled ? styles.shareTextOn : styles.shareText}>
            {shareUpdating ? "Đang cập nhật..." : shareEnabled ? "Đang chia sẻ" : "Chia sẻ vị trí"}
          </Text>
        </Pressable>
      </View>

      <MapLegend
        showSignals={showSignals}
        showCameras={showCameras}
        onToggleSignals={() => setShowSignals((v) => !v)}
        onToggleCameras={() => setShowCameras((v) => !v)}
      />

      <Pressable
        style={styles.statsBar}
        onPress={() => setShowSafetyList(true)}
        disabled={safetyLoading || visibleSafetyPoints.length === 0}
        accessibilityRole="button"
        accessibilityLabel="Xem danh sách điểm đèn giao thông và camera gần đây"
      >
        <Text style={styles.statsText}>
          {safetyLoading ? "Đang tải điểm an toàn..." : `${cameraCount} camera · ${signalCount} đèn`}
        </Text>
      </Pressable>

      <SOSButton onPress={triggerSos} />
      <MemberBottomSheet members={memberList} onSelectMember={handleSelectMember} />

      <SafetyPointList
        visible={showSafetyList}
        points={visibleSafetyPoints}
        onClose={() => setShowSafetyList(false)}
        onSelectPoint={handleSelectSafetyPoint}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#E7F0EA" },
  map: { flex: 1, backgroundColor: "#E7F0EA" },
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
  statsText: { fontSize: 11, fontWeight: "600", color: "#475467" }
});
