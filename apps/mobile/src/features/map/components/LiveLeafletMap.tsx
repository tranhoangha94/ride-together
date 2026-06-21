import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { MarkerMember } from "./MemberBottomSheet";
import { SafetyPoint } from "../utils/safetyPoints";

export type { SafetyPoint };

function escapeText(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;"
    };
    return map[char];
  });
}

type ViewportPayload = {
  lat: number;
  lng: number;
  radius: number;
};

export type LiveLeafletMapHandle = {
  centerOn: (lat: number, lng: number, zoom?: number) => void;
};

export const LiveLeafletMap = forwardRef<
  LiveLeafletMapHandle,
  {
    members: MarkerMember[];
    safetyPoints: SafetyPoint[];
    onViewportChanged?: (payload: ViewportPayload) => void;
  }
>(function LiveLeafletMap({ members, safetyPoints, onViewportChanged }, ref) {
  const webViewRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    centerOn(lat: number, lng: number, zoom = 15) {
      webViewRef.current?.injectJavaScript(`
        if (window.map) {
          map.setView([${lat}, ${lng}], ${zoom});
        }
        true;
      `);
    }
  }));

  const html = useMemo(() => {
    const center = members[0] ?? { lat: 10.7769, lng: 106.7009 };
    const markers = members
      .map(
        (member, index) => `
          const icon${index} = L.divIcon({
            className: "rider-marker",
            html: "<div class='pin ${index === 0 ? "leader" : "member"}'>${index === 0 ? "L" : index}</div><div class='pin-label'>${escapeText(member.userId)}</div>",
            iconSize: [74, 58],
            iconAnchor: [37, 29]
          });
          L.marker([${member.lat}, ${member.lng}], { title: "${escapeText(member.userId)}", icon: icon${index} })
          .addTo(map)
          .bindPopup("<strong>${escapeText(member.userId)}</strong><br/>${Math.round(member.speed ?? 0)} km/h");
        `
      )
      .join("\n");
    const boundsPoints = members.map((member) => `[${member.lat}, ${member.lng}]`);

    return `
      <!doctype html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>
            html, body, #map {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
              background: #e7f0ea;
            }
            .leaflet-control-attribution {
              font-size: 10px;
            }
            .rider-marker {
              text-align: center;
            }
            .pin {
              width: 38px;
              height: 38px;
              margin: 0 auto;
              border-radius: 20px;
              border: 3px solid white;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font: 800 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              box-shadow: 0 8px 20px rgba(15, 23, 42, 0.28);
            }
            .pin.leader {
              background: #1570ef;
            }
            .pin.member {
              background: #12b76a;
            }
            .pin-label {
              display: inline-block;
              margin-top: 3px;
              padding: 2px 7px;
              border-radius: 7px;
              background: rgba(255,255,255,0.92);
              color: #101828;
              font: 800 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              white-space: nowrap;
            }
            .safety-marker {
              text-align: center;
            }
            .safety-pin {
              width: 34px;
              height: 34px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              border-radius: 18px;
              border: 2px solid white;
              color: white;
              box-shadow: 0 8px 18px rgba(15, 23, 42, 0.24);
            }
            .safety-pin.signal {
              background: #dc6803;
            }
            .safety-pin.camera {
              background: #d92d20;
            }
            .safety-label {
              display: inline-block;
              max-width: 104px;
              margin-top: 3px;
              padding: 2px 6px;
              overflow: hidden;
              text-overflow: ellipsis;
              border-radius: 7px;
              background: rgba(255,255,255,0.92);
              color: #101828;
              font: 800 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              white-space: nowrap;
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            const map = L.map("map", {
              zoomControl: false,
              attributionControl: true
            }).setView([${center.lat}, ${center.lng}], 15);
            window.map = map;

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              maxZoom: 19,
              attribution: "&copy; OpenStreetMap"
            }).addTo(map);

            const safetyLayer = L.layerGroup().addTo(map);
            const safetyMarkersById = {};

            function escapeHtml(value) {
              return String(value || "").replace(/[&<>"']/g, function(char) {
                return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char];
              });
            }

            function safetyIconHtml(type, title) {
              const isSignal = type === "traffic_signal";
              const icon = isSignal
                ? "<svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'><rect x='8' y='2' width='8' height='20' rx='3' fill='currentColor'/><circle cx='12' cy='7' r='2' fill='#f04438'/><circle cx='12' cy='12' r='2' fill='#fdb022'/><circle cx='12' cy='17' r='2' fill='#12b76a'/></svg>"
                : "<svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'><path d='M4 8.5A2.5 2.5 0 0 1 6.5 6h7A2.5 2.5 0 0 1 16 8.5V9l3.2-1.8A1.2 1.2 0 0 1 21 8.25v7.5a1.2 1.2 0 0 1-1.8 1.05L16 15v.5a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 15.5v-7Z' fill='currentColor'/><circle cx='9.5' cy='12' r='2.4' fill='white'/></svg>";
              return "<div class='safety-pin " + (isSignal ? "signal" : "camera") + "'>" + icon + "</div><div class='safety-label'>" + escapeHtml(title) + "</div>";
            }

            function removeFarSafetyMarkers() {
              const keepBounds = map.getBounds().pad(1.35);
              Object.keys(safetyMarkersById).forEach(function(id) {
                const entry = safetyMarkersById[id];
                if (!keepBounds.contains(entry.latLng)) {
                  safetyLayer.removeLayer(entry.marker);
                  delete safetyMarkersById[id];
                }
              });
            }

            window.setSafetyPoints = function(points) {
              points.forEach(function(point, index) {
                if (safetyMarkersById[point.id]) return;
                const isSignal = point.type === "traffic_signal";
                const safetyIcon = L.divIcon({
                  className: "safety-marker",
                  html: safetyIconHtml(point.type, point.title),
                  iconSize: [92, 52],
                  iconAnchor: [46, 26]
                });
                const marker = L.marker([point.lat, point.lng], { title: point.title, icon: safetyIcon })
                  .addTo(safetyLayer)
                  .bindPopup("<strong>" + escapeHtml(point.title) + "</strong><br/>" + (isSignal ? "Traffic signal" : "Traffic safety camera"));
                safetyMarkersById[point.id] = {
                  marker: marker,
                  latLng: L.latLng(point.lat, point.lng)
                };
              });
              removeFarSafetyMarkers();
            };

            function postViewport() {
              const center = map.getCenter();
              const radius = Math.round(Math.min(5000, Math.max(300, center.distanceTo(map.getBounds().getNorthEast()))));
              window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
                type: "viewport_changed",
                lat: center.lat,
                lng: center.lng,
                radius
              }));
            }

            ${markers}

            const bounds = L.latLngBounds([${boundsPoints.join(",")}]);
            if (bounds.isValid()) {
              map.fitBounds(bounds.pad(0.28));
            }

            map.on("moveend zoomend", function() {
              removeFarSafetyMarkers();
              postViewport();
            });
            window.setSafetyPoints(${JSON.stringify(safetyPoints)});
            setTimeout(postViewport, 700);
          </script>
        </body>
      </html>
    `;
  }, [members]);

  useEffect(() => {
    const payload = JSON.stringify(safetyPoints).replace(/\\/g, "\\\\").replace(/`/g, "\\`");
    webViewRef.current?.injectJavaScript(`
      if (window.setSafetyPoints) {
        window.setSafetyPoints(${payload});
      }
      true;
    `);
  }, [safetyPoints]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type?: string; lat?: number; lng?: number; radius?: number };
      if (payload.type === "viewport_changed" && typeof payload.lat === "number" && typeof payload.lng === "number") {
        onViewportChanged?.({
          lat: payload.lat,
          lng: payload.lng,
          radius: Math.round(payload.radius ?? 800)
        });
      }
    } catch {
      // Ignore malformed WebView messages.
    }
  }

  return (
    <View style={styles.root}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        style={styles.webview}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#E7F0EA"
  },
  webview: {
    flex: 1,
    backgroundColor: "#E7F0EA"
  }
});
