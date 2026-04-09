import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { MapPanelProps } from './types';

import { colors } from '@/theme/colors';
import { formatDateTime, formatLiters, formatNumber } from '@/utils/format';

const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const CLUSTER_CSS_URL = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
const CLUSTER_JS_URL = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js';
const DEFAULT_CENTER: [number, number] = [-38.7402, -72.6186];

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

function ensureStylesheet(url: string, attr: string) {
  if (typeof document === 'undefined') return Promise.resolve();

  const existing = document.querySelector(`link[${attr}="true"]`);
  if (existing) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.setAttribute(attr, 'true');
    link.onload = () => resolve();
    link.onerror = () => reject(new Error(`Failed to load stylesheet: ${url}`));
    document.head.appendChild(link);
  });
}

function ensureScript(url: string, attr: string) {
  if (typeof document === 'undefined') return Promise.resolve();

  const existing = document.querySelector(`script[${attr}="true"]`);
  if (existing) {
    if ((existing as HTMLScriptElement).dataset.loaded === 'true') {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load script: ${url}`)),
        { once: true }
      );
    });
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.setAttribute(attr, 'true');
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
    document.body.appendChild(script);
  });
}

function ensureMarkerStyles() {
  if (typeof document === 'undefined') return;

  const existing = document.querySelector('style[data-sg-marker-css="true"]');
  if (existing) return;

  const style = document.createElement('style');
  style.setAttribute('data-sg-marker-css', 'true');
  style.textContent = `
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
  `;
  document.head.appendChild(style);
}

async function ensureLeafletAssets(L: any) {
  await ensureStylesheet(LEAFLET_CSS_URL, 'data-leaflet-web-css');
  await ensureStylesheet(CLUSTER_CSS_URL, 'data-leaflet-markercluster-css');
  ensureMarkerStyles();

  if (typeof L?.markerClusterGroup === 'function') return;

  (window as any).L = L;
  await ensureScript(CLUSTER_JS_URL, 'data-leaflet-markercluster-js');
}

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

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export default function MapPanelWeb({
  positions,
  selected,
  popupSelectedId,
  onSelect,
}: MapPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const leafletLib = require('leaflet');
        await ensureLeafletAssets(leafletLib);
      } catch (error) {
        console.error('Leaflet cluster assets failed to load:', error);
      } finally {
        if (alive) setMounted(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const center = useMemo<[number, number]>(() => {
    if (selected) {
      return [selected.latitude, selected.longitude];
    }

    return DEFAULT_CENTER;
  }, [selected]);

  const shortLabels = useMemo(
    () => buildUniqueDeviceLabels(positions.map((p) => ({ id: p.id, name: p.name }))),
    [positions]
  );

  if (!mounted) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Inicializando mapa web...</Text>
        <Text style={styles.fallbackText}>Cargando Leaflet de forma segura para Expo Web.</Text>
      </View>
    );
  }

  const ReactLeaflet = require('react-leaflet');
  const L = require('leaflet');

  const { MapContainer, TileLayer, useMap } = ReactLeaflet;

  const markerIcon = (
    item: (typeof positions)[number],
    index: number,
    isSelected: boolean
  ) => {
    const isMoving = !!item.moving;

    const mainColor = isSelected
      ? '#ff6600'
      : isMoving
        ? '#16324f'
        : '#5f748d';

    const haloColor = isSelected
      ? 'rgba(255,102,0,0.22)'
      : isMoving
        ? 'rgba(22,50,79,0.18)'
        : 'rgba(95,116,141,0.15)';

    const wrapperSize = isSelected ? 66 : 60;
    const circleSize = isSelected ? 38 : 34;
    const iconSize = isSelected ? 18 : 16;
    const pulseSize = isSelected ? 52 : 46;
    const shortLabel = shortLabels[index] || 'DV';
    const safeTitle = escapeHtml(item.name || 'Dispositivo');

    return L.divIcon({
      className: '',
      html: `
        <div
          title="${safeTitle}"
          style="
            position: relative;
            width: ${wrapperSize}px;
            height: ${wrapperSize + 16}px;
            pointer-events: auto;
          "
        >
          <div
            class="sg-device-marker-pulse"
            style="
              top: 4px;
              width: ${pulseSize}px;
              height: ${pulseSize}px;
              background: ${haloColor};
            "
          ></div>

          <div
            style="
              position: absolute;
              left: 50%;
              top: 7px;
              width: ${circleSize + 12}px;
              height: ${circleSize + 12}px;
              transform: translateX(-50%);
              border-radius: 999px;
              background: ${haloColor};
            "
          ></div>

          <div
            style="
              position: absolute;
              left: 50%;
              top: 12px;
              width: ${circleSize}px;
              height: ${circleSize}px;
              transform: translateX(-50%);
              border-radius: 999px;
              background: ${mainColor};
              border: 3px solid rgba(255,255,255,0.96);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 10px 18px rgba(15, 23, 42, 0.22);
            "
          >
            <div style="width:${iconSize}px;height:${iconSize}px;display:flex;align-items:center;justify-content:center;">
              ${deviceLocationSVG}
            </div>
          </div>

          <div
            style="
              position: absolute;
              left: 50%;
              top: ${circleSize + 28}px;
              width: 12px;
              height: 12px;
              transform: translateX(-50%) rotate(45deg);
              background: ${mainColor};
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
              color: ${mainColor};
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
            ${escapeHtml(shortLabel)}
          </div>
        </div>
      `,
      iconSize: [wrapperSize, wrapperSize + 16],
      iconAnchor: [wrapperSize / 2, wrapperSize + 7],
      popupAnchor: [0, -(wrapperSize - 4)],
    });
  };

  const clusterIcon = (cluster: any) => {
    const count = cluster.getChildCount();
    const size = count >= 100 ? 62 : count >= 10 ? 54 : 48;
    const fontSize = count >= 100 ? 16 : 15;

    return L.divIcon({
      className: '',
      html: `
        <div
          style="
            width:${size}px;
            height:${size}px;
            border-radius:999px;
            background: rgba(255,102,0,0.95);
            color:#ffffff;
            display:flex;
            align-items:center;
            justify-content:center;
            font-weight:900;
            font-size:${fontSize}px;
            border:4px solid rgba(255,255,255,0.95);
            box-shadow: 0 12px 24px rgba(255,102,0,0.28);
          "
        >
          ${count}
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  function buildPopupHtml(item: (typeof positions)[number]) {
    return `
      <div style="min-width:240px;font-family:Arial,sans-serif;">
        <strong style="font-size:15px;">${escapeHtml(item.name)}</strong>
        <div style="margin-top:8px;font-size:13px;">
          <div><strong>Velocidad:</strong> ${formatNumber(item.speed, 0)} km/h</div>
          <div><strong>Último reporte:</strong> ${escapeHtml(formatDateTime(item.lastReport))}</div>
          <div><strong>iButton:</strong> ${escapeHtml(item.ibuttonName || 'Sin dato')}</div>
          <div><strong>Dirección:</strong> ${escapeHtml(item.address || 'Sin dato')}</div>
          <div><strong>Última descarga:</strong> ${escapeHtml(
            item.lastFuelDownload != null ? formatLiters(item.lastFuelDownload) : 'Sin dato'
          )}</div>
        </div>
      </div>
    `;
  }

  function RecenterMap() {
    const map = useMap();

    useEffect(() => {
      if (!selected) return;

      map.flyTo([selected.latitude, selected.longitude], Math.max(map.getZoom(), 12), {
        duration: 0.7,
      });
    }, [map, selected]);

    return null;
  }

  function ClusteredDeviceMarkers() {
    const map = useMap();
    const layerRef = useRef<any>(null);
    const markersRef = useRef<Record<string, any>>({});

    useEffect(() => {
      const supportsCluster = typeof L.markerClusterGroup === 'function';

      const layer = supportsCluster
        ? L.markerClusterGroup({
            showCoverageOnHover: false,
            spiderfyOnMaxZoom: true,
            zoomToBoundsOnClick: true,
            removeOutsideVisibleBounds: true,
            maxClusterRadius: 55,
            chunkedLoading: true,
            iconCreateFunction: clusterIcon,
          })
        : L.layerGroup();

      layerRef.current = layer;
      map.addLayer(layer);

      return () => {
        layer.clearLayers?.();
        map.removeLayer(layer);
        layerRef.current = null;
        markersRef.current = {};
      };
    }, [map]);

    useEffect(() => {
      const layer = layerRef.current;
      if (!layer) return;

      const nextMarkers: any[] = [];
      const nextMarkerMap: Record<string, any> = {};

      positions.forEach((item, index) => {
        if (item.latitude == null || item.longitude == null) return;

        const marker = L.marker([item.latitude, item.longitude], {
          icon: markerIcon(item, index, item.id === selected?.id),
        });

        marker.on('click', () => onSelect(item));
        marker.bindPopup(buildPopupHtml(item), { maxWidth: 280 });

        nextMarkers.push(marker);
        nextMarkerMap[String(item.id)] = marker;
      });

      layer.clearLayers?.();
      if (typeof layer.addLayers === 'function') {
        layer.addLayers(nextMarkers);
      } else {
        nextMarkers.forEach((marker) => layer.addLayer(marker));
      }

      markersRef.current = nextMarkerMap;
    }, [positions, selected?.id, onSelect, shortLabels]);

    useEffect(() => {
      const layer = layerRef.current;
      const markerMap = markersRef.current;
      if (!layer) return;

      Object.values(markerMap).forEach((marker) => marker.closePopup());

      if (!popupSelectedId) return;

      const marker = markerMap[String(popupSelectedId)];
      if (!marker) return;

      if (typeof layer.zoomToShowLayer === 'function') {
        layer.zoomToShowLayer(marker, () => marker.openPopup());
      } else {
        map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 14), { duration: 0.6 });
        setTimeout(() => marker.openPopup(), 200);
      }
    }, [popupSelectedId, map]);

    return null;
  }

  return (
    <View style={styles.wrapper}>
      <MapContainer center={center} zoom={12} scrollWheelZoom style={styles.map as never}>
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterMap />
        <ClusteredDeviceMarkers />
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minHeight: 420,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  map: {
    width: '100%',
    height: '100%',
    minHeight: 420,
    zIndex: 1,
  },
  fallback: {
    flex: 1,
    minHeight: 420,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.card,
  },
  fallbackTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  fallbackText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
});