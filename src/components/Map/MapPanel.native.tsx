import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import type { MapPanelProps } from './types';

import { colors } from '@/theme/colors';
import { formatDateTime, formatLiters, formatNumber } from '@/utils/format';

const DEFAULT_CENTER = {
  latitude: -38.7402,
  longitude: -72.6186,
};

const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const CLUSTER_CSS_URL =
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
const CLUSTER_JS_URL =
  'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';

const deviceLocationSVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <g transform="translate(0,50) scale(0.1,-0.1)" fill="#ffffff" stroke="none">
      <path d="M185 476 c-69 -31 -104 -103 -91 -189 11 -70 127 -277 156 -277 16 0
      118 165 140 227 36 100 19 173 -52 226 -33 25 -113 32 -153 13z m133 -26 c99
      -61 92 -180 -21 -347 -23 -35 -45 -63 -48 -63 -4 0 -25 28 -47 62 -86 132
      -111 235 -73 296 43 68 125 91 189 52z"/>
      <path d="M202 367 c-28 -30 -28 -68 1 -95 30 -28 68 -28 95 1 28 30 28 68 -1
      95 -30 28 -68 28 -95 -1z m82 -13 c31 -30 9 -84 -34 -84 -24 0 -50 26 -50 50
      0 24 26 50 50 50 10 0 26 -7 34 -16z"/>
    </g>
  </svg>
`;

function normalizeDeviceBaseLabel(name: string | undefined, index: number) {
  const cleaned = String(name || `D${index + 1}`)
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();

  return cleaned.slice(0, 2) || `D${index + 1}`;
}

function buildUniqueDeviceLabels(
  devices: Array<{ id: string | number; name?: string | null }>
) {
  const used = new Map<string, number>();

  return devices.map((dev, index) => {
    const base = normalizeDeviceBaseLabel(dev?.name ?? undefined, index);
    const count = (used.get(base) || 0) + 1;
    used.set(base, count);

    if (count === 1) return base;
    if (base.length === 1) return `${base}${count}`.slice(0, 3);
    return `${base[0]}${count}`;
  });
}

function isValidCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

type NativeMapPayload = {
  positions: Array<{
    id: string | number;
    name: string;
    latitude: number | null | undefined;
    longitude: number | null | undefined;
    moving: boolean | null | undefined;
    address: string;
    ibuttonName: string;
    shortLabel: string;
    speedLabel: string;
    lastReportLabel: string;
    lastFuelDownloadLabel: string;
  }>;
  selectedId: string | number | null;
  popupSelectedId: string | number | null;
  center: {
    latitude: number;
    longitude: number;
  } | null;
};

export default function MapPanelNative({
  positions,
  selected,
  popupSelectedId,
  onSelect,
}: MapPanelProps) {
  const webViewRef = useRef<WebView>(null);
  const lastInjectedPayloadRef = useRef('');
  const [webViewReady, setWebViewReady] = useState(false);
  const [webViewNonce, setWebViewNonce] = useState(0);
  const [lastCrash, setLastCrash] = useState<string | null>(null);

  const center = selected || positions[0] || null;

  const shortLabels = useMemo(
    () => buildUniqueDeviceLabels(positions.map((p) => ({ id: p.id, name: p.name }))),
    [positions]
  );

  const payload = useMemo<NativeMapPayload>(() => {
    return {
      positions: positions.map((item, index) => ({
        id: item.id,
        name: item.name ?? 'Dispositivo',
        latitude: item.latitude,
        longitude: item.longitude,
        moving: item.moving,
        address: item.address ?? '',
        ibuttonName: item.ibuttonName ?? '',
        shortLabel: shortLabels[index] || 'DV',
        speedLabel: `${formatNumber(item.speed, 0)} km/h`,
        lastReportLabel: item.lastReport ? formatDateTime(item.lastReport) : 'Sin dato',
        lastFuelDownloadLabel:
          item.lastFuelDownload != null ? formatLiters(item.lastFuelDownload) : 'Sin dato',
      })),
      selectedId: selected?.id ?? null,
      popupSelectedId: popupSelectedId ?? null,
      center:
        center && isValidCoordinate(center.latitude) && isValidCoordinate(center.longitude)
          ? {
              latitude: center.latitude,
              longitude: center.longitude,
            }
          : null,
    };
  }, [positions, selected?.id, popupSelectedId, center, shortLabels]);

  const html = useMemo(
    () => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <link rel="stylesheet" href="${LEAFLET_CSS_URL}" />
    <link rel="stylesheet" href="${CLUSTER_CSS_URL}" />
    <style>
      html, body, #map {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #081224;
        overflow: hidden;
      }

      .leaflet-container {
        background: #081224;
        font-family: Arial, sans-serif;
      }

      .leaflet-control-attribution {
        display: none;
      }

      @keyframes sgMarkerPulse {
        0% {
          transform: translateX(-50%) scale(0.92);
          opacity: 0.55;
        }
        70% {
          transform: translateX(-50%) scale(1.22);
          opacity: 0;
        }
        100% {
          transform: translateX(-50%) scale(1.22);
          opacity: 0;
        }
      }

      .sg-device-marker-pulse {
        position: absolute;
        left: 50%;
        border-radius: 999px;
        animation: sgMarkerPulse 1.85s ease-out infinite;
        will-change: transform, opacity;
        pointer-events: none;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>

    <script src="${LEAFLET_CSS_URL.replace('/leaflet.css', '/leaflet.js')}"></script>
    <script src="${CLUSTER_JS_URL}"></script>
    <script>
      (function () {
        const DEFAULT_LAT = ${DEFAULT_CENTER.latitude};
        const DEFAULT_LNG = ${DEFAULT_CENTER.longitude};
        const deviceLocationSVG = ${JSON.stringify(deviceLocationSVG)};

        let map = null;
        let layer = null;
        let markerMap = Object.create(null);
        let markerDataMap = Object.create(null);
        let lastPositionsKey = '';
        let currentSelectedId = null;
        let hasFittedOnce = false;

        function sendMessage(payload) {
          try {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify(payload));
            }
          } catch (error) {}
        }

        function safeText(value) {
          return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        }

        function sameId(a, b) {
          return String(a ?? '') === String(b ?? '');
        }

        function positionsKey(positions) {
          return positions
            .map((item) =>
              [
                item.id,
                item.latitude,
                item.longitude,
                item.name,
                item.moving,
                item.address,
                item.ibuttonName,
                item.shortLabel,
                item.speedLabel,
                item.lastReportLabel,
                item.lastFuelDownloadLabel,
              ].join('|')
            )
            .join('||');
        }

        function markerColors(item, isSelected) {
          const isMoving = !!item.moving;

          return {
            main: isSelected
              ? '#ff6600'
              : isMoving
                ? '#16324f'
                : '#5f748d',
            halo: isSelected
              ? 'rgba(255,102,0,0.22)'
              : isMoving
                ? 'rgba(22,50,79,0.18)'
                : 'rgba(95,116,141,0.15)',
          };
        }

        function popupHtml(item) {
          return \`
            <div style="min-width:240px;font-family:Arial,sans-serif;">
              <strong style="font-size:15px;">\${safeText(item.name || 'Dispositivo')}</strong>
              <div style="margin-top:8px;font-size:13px;">
                <div><strong>Velocidad:</strong> \${safeText(item.speedLabel || '0 km/h')}</div>
                <div><strong>Último reporte:</strong> \${safeText(item.lastReportLabel || 'Sin dato')}</div>
                <div><strong>iButton:</strong> \${safeText(item.ibuttonName || 'Sin dato')}</div>
                <div><strong>Dirección:</strong> \${safeText(item.address || 'Sin dato')}</div>
                <div><strong>Última descarga:</strong> \${safeText(item.lastFuelDownloadLabel || 'Sin dato')}</div>
              </div>
            </div>
          \`;
        }

        function buildMarkerIcon(item, isSelected) {
          const colors = markerColors(item, isSelected);
          const wrapperSize = isSelected ? 66 : 60;
          const circleSize = isSelected ? 38 : 34;
          const iconSize = isSelected ? 18 : 16;
          const pulseSize = isSelected ? 52 : 46;
          const shortLabel = safeText(item.shortLabel || 'DV');
          const safeTitle = safeText(item.name || 'Dispositivo');

          return L.divIcon({
            className: '',
            html: \`
              <div
                title="\${safeTitle}"
                style="
                  position: relative;
                  width: \${wrapperSize}px;
                  height: \${wrapperSize + 16}px;
                  pointer-events: auto;
                "
              >
                <div
                  class="sg-device-marker-pulse"
                  style="
                    top: 4px;
                    width: \${pulseSize}px;
                    height: \${pulseSize}px;
                    background: \${colors.halo};
                  "
                ></div>

                <div
                  style="
                    position: absolute;
                    left: 50%;
                    top: 7px;
                    width: \${circleSize + 12}px;
                    height: \${circleSize + 12}px;
                    transform: translateX(-50%);
                    border-radius: 999px;
                    background: \${colors.halo};
                  "
                ></div>

                <div
                  style="
                    position: absolute;
                    left: 50%;
                    top: 12px;
                    width: \${circleSize}px;
                    height: \${circleSize}px;
                    transform: translateX(-50%);
                    border-radius: 999px;
                    background: \${colors.main};
                    border: 3px solid rgba(255,255,255,0.96);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 10px 18px rgba(15, 23, 42, 0.22);
                  "
                >
                  <div style="width:\${iconSize}px;height:\${iconSize}px;display:flex;align-items:center;justify-content:center;">
                    \${deviceLocationSVG}
                  </div>
                </div>

                <div
                  style="
                    position: absolute;
                    left: 50%;
                    top: \${circleSize + 28}px;
                    width: 12px;
                    height: 12px;
                    transform: translateX(-50%) rotate(45deg);
                    background: \${colors.main};
                    border-bottom-right-radius: 3px;
                  "
                ></div>

                <div
                  style="
                    position: absolute;
                    left: 50%;
                    bottom: 0;
                    transform: translateX(-50%);
                    min-width: 26px;
                    height: 19px;
                    padding: 0 6px;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.96);
                    color: \${colors.main};
                    font-size: 9px;
                    font-weight: 900;
                    letter-spacing: 0.3px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 6px 14px rgba(15, 23, 42, 0.14);
                    border: 1px solid rgba(15,23,42,0.05);
                  "
                >
                  \${shortLabel}
                </div>
              </div>
            \`,
            iconSize: [wrapperSize, wrapperSize + 16],
            iconAnchor: [wrapperSize / 2, wrapperSize + 7],
            popupAnchor: [0, -(wrapperSize - 4)],
          });
        }

        function createClusterIcon(cluster) {
          const count = cluster.getChildCount();
          const size = count >= 100 ? 62 : count >= 10 ? 54 : 48;
          const fontSize = count >= 100 ? 16 : 15;

          return L.divIcon({
            className: '',
            html: \`
              <div
                style="
                  width:\${size}px;
                  height:\${size}px;
                  border-radius:999px;
                  background: rgba(255,102,0,0.95);
                  color:#ffffff;
                  display:flex;
                  align-items:center;
                  justify-content:center;
                  font-weight:900;
                  font-size:\${fontSize}px;
                  border:4px solid rgba(255,255,255,0.95);
                  box-shadow: 0 12px 24px rgba(255,102,0,0.28);
                "
              >
                \${count}
              </div>
            \`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          });
        }

        function ensureMap(center) {
          if (map) return;

          const lat = typeof center?.latitude === 'number' ? center.latitude : DEFAULT_LAT;
          const lng = typeof center?.longitude === 'number' ? center.longitude : DEFAULT_LNG;

          map = L.map('map', {
            zoomControl: true,
            attributionControl: false,
            zoomAnimation: false,
            fadeAnimation: false,
            markerZoomAnimation: false,
            preferCanvas: true,
          }).setView([lat, lng], 11);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            updateWhenIdle: true,
            updateWhenZooming: false,
            keepBuffer: 0,
          }).addTo(map);

          layer =
            typeof L.markerClusterGroup === 'function'
              ? L.markerClusterGroup({
                  showCoverageOnHover: false,
                  spiderfyOnMaxZoom: true,
                  zoomToBoundsOnClick: true,
                  removeOutsideVisibleBounds: true,
                  animate: false,
                  maxClusterRadius: 55,
                  chunkedLoading: true,
                  iconCreateFunction: createClusterIcon,
                })
              : L.layerGroup();

          layer.addTo(map);

          sendMessage({
            type: 'debug',
            stage: 'html_loaded',
            clusterEnabled: typeof L.markerClusterGroup === 'function',
          });
        }

        function closeAllPopups() {
          Object.keys(markerMap).forEach((key) => {
            const marker = markerMap[key];
            if (marker) marker.closePopup();
          });
        }

        function syncMarkerVisuals() {
          Object.keys(markerMap).forEach((key) => {
            const marker = markerMap[key];
            const item = markerDataMap[key];
            if (!marker || !item) return;

            marker.setIcon(buildMarkerIcon(item, sameId(item.id, currentSelectedId)));
            marker.setPopupContent(popupHtml(item));
          });
        }

        function focusMarkerById(id, options) {
          const key = String(id ?? '');
          const marker = markerMap[key];
          const item = markerDataMap[key];

          if (!marker || !item) return false;

          currentSelectedId = item.id;
          syncMarkerVisuals();

          const open = function () {
            closeAllPopups();

            if (options?.openPopup) {
              marker.openPopup();
            }

            if (options?.notify) {
              sendMessage({ type: 'select', id: item.id });
            }
          };

          if (options?.center) {
            if (typeof layer?.zoomToShowLayer === 'function') {
              layer.zoomToShowLayer(marker, function () {
                if (map && typeof options?.zoom === 'number' && map.getZoom() < options.zoom) {
                  map.setView(marker.getLatLng(), options.zoom, { animate: false });
                }
                open();
              });
            } else {
              if (map) {
                map.setView(marker.getLatLng(), Math.max(map.getZoom(), options?.zoom || 13), {
                  animate: false,
                });
              }
              open();
            }
          } else {
            open();
          }

          return true;
        }

        function rebuildMarkers(positions) {
          if (!layer) return [];

          layer.clearLayers();
          markerMap = Object.create(null);
          markerDataMap = Object.create(null);

          const nextMarkers = [];
          const bounds = [];

          positions.forEach((item) => {
            if (
              typeof item.latitude !== 'number' ||
              Number.isNaN(item.latitude) ||
              typeof item.longitude !== 'number' ||
              Number.isNaN(item.longitude)
            ) {
              return;
            }

            const marker = L.marker([item.latitude, item.longitude], {
              icon: buildMarkerIcon(item, sameId(item.id, currentSelectedId)),
              keyboard: false,
            });

            marker.bindPopup(popupHtml(item), { maxWidth: 280 });

            marker.on('click', function () {
              focusMarkerById(item.id, {
                openPopup: false,
                center: true,
                zoom: 13,
                notify: true,
              });
            });

            nextMarkers.push(marker);
            markerMap[String(item.id)] = marker;
            markerDataMap[String(item.id)] = item;
            bounds.push([item.latitude, item.longitude]);
          });

          if (typeof layer.addLayers === 'function') {
            layer.addLayers(nextMarkers);
          } else {
            nextMarkers.forEach((marker) => layer.addLayer(marker));
          }

          sendMessage({
            type: 'debug',
            stage: 'markers_created',
            positionsCount: positions.length,
            boundsCount: bounds.length,
          });

          return bounds;
        }

        function fitMapToBounds(bounds) {
          if (!map) return;

          if (bounds.length > 1) {
            map.fitBounds(bounds, {
              padding: [20, 20],
              animate: false,
              maxZoom: 13,
            });

            sendMessage({
              type: 'debug',
              stage: 'fit_bounds',
              boundsCount: bounds.length,
            });
            hasFittedOnce = true;
            return;
          }

          if (bounds.length === 1) {
            map.setView(bounds[0], 12, { animate: false });

            sendMessage({
              type: 'debug',
              stage: 'single_point_centered',
              boundsCount: bounds.length,
            });
            hasFittedOnce = true;
            return;
          }

          map.setView([DEFAULT_LAT, DEFAULT_LNG], 11, { animate: false });
          hasFittedOnce = true;
        }

        function updateMap(payload) {
          ensureMap(payload?.center || null);

          const positions = Array.isArray(payload?.positions) ? payload.positions : [];
          const selectedId = payload?.selectedId ?? null;
          const popupSelectedId = payload?.popupSelectedId ?? null;

          const nextPositionsKey = positionsKey(positions);
          const positionsChanged = nextPositionsKey !== lastPositionsKey;

          if (positionsChanged) {
            lastPositionsKey = nextPositionsKey;
            const bounds = rebuildMarkers(positions);

            if (selectedId != null) {
              currentSelectedId = selectedId;
              syncMarkerVisuals();
              closeAllPopups();
            } else {
              currentSelectedId = null;
              syncMarkerVisuals();
              closeAllPopups();
            }

            if (popupSelectedId != null) {
              focusMarkerById(popupSelectedId, {
                openPopup: true,
                center: true,
                zoom: 14,
                notify: false,
              });
              return;
            }

            if (!hasFittedOnce && selectedId == null) {
              fitMapToBounds(bounds);
            }

            return;
          }

          if (popupSelectedId != null) {
            focusMarkerById(popupSelectedId, {
              openPopup: true,
              center: true,
              zoom: 14,
              notify: false,
            });
            return;
          }

          if (selectedId != null) {
            currentSelectedId = selectedId;
            syncMarkerVisuals();
            closeAllPopups();
            return;
          }

          currentSelectedId = null;
          syncMarkerVisuals();
          closeAllPopups();
        }

        window.updateMapData = function (payload) {
          try {
            updateMap(payload || {});
          } catch (error) {
            sendMessage({
              type: 'debug',
              stage: 'update_error',
              message: String(error && error.message ? error.message : error),
            });
          }
        };

        document.addEventListener('DOMContentLoaded', function () {
          ensureMap(null);
        });
      })();
    </script>
  </body>
</html>
  `,
    []
  );

  const injectMapData = useCallback(() => {
    if (!webViewReady || !webViewRef.current) return;

    const serializedPayload = JSON.stringify(payload);
    if (serializedPayload === lastInjectedPayloadRef.current) return;

    lastInjectedPayloadRef.current = serializedPayload;

    webViewRef.current.injectJavaScript(`
      try {
        if (window.updateMapData) {
          window.updateMapData(${serializedPayload});
        }
      } catch (error) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'debug',
            stage: 'inject_error',
            message: String(error && error.message ? error.message : error)
          }));
        }
      }
      true;
    `);
  }, [payload, webViewReady]);

  useEffect(() => {
    injectMapData();
  }, [injectMapData]);

  return (
    <View style={styles.wrapper}>
      <WebView
        ref={webViewRef}
        key={`leaflet-native-${webViewNonce}`}
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled={false}
        startInLoadingState
        mixedContentMode="always"
        setSupportMultipleWindows={false}
        onLoadEnd={() => {
          setWebViewReady(true);
          setLastCrash(null);
          lastInjectedPayloadRef.current = '';
        }}
        onError={(event) => {
          console.log('WEBVIEW ERROR', event.nativeEvent);
        }}
        onHttpError={(event) => {
          console.log('WEBVIEW HTTP ERROR', event.nativeEvent);
        }}
        onRenderProcessGone={(event) => {
          console.log('WEBVIEW RENDER PROCESS GONE', event.nativeEvent);
          setWebViewReady(false);
          setLastCrash('Renderer crash. didCrash=' + String(event.nativeEvent.didCrash));
          lastInjectedPayloadRef.current = '';
          setWebViewNonce((prev) => prev + 1);
        }}
        onMessage={(event) => {
          try {
            const payloadMessage = JSON.parse(event.nativeEvent.data);
            console.log('WEBVIEW MESSAGE', payloadMessage);

            if (payloadMessage?.type === 'select' && payloadMessage?.id != null) {
              const item = positions.find(
                (entry) => String(entry.id) === String(payloadMessage.id)
              );
              if (item) onSelect(item);
            }
          } catch {
            console.log('Malformed WebView message', event.nativeEvent.data);
          }
        }}
      />

      {lastCrash ? (
        <View style={styles.crashBadge}>
          <Text style={styles.crashBadgeText}>{lastCrash}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minHeight: 420,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  map: {
    flex: 1,
    minHeight: 420,
    backgroundColor: colors.card,
  },
  crashBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 102, 0, 0.92)',
  },
  crashBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});