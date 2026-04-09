import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import type { MapPanelProps } from './types';

import { colors } from '@/theme/colors';
import { formatDateTime, formatLiters, formatNumber } from '@/utils/format';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function MapPanelNative({ positions, selected, onSelect }: MapPanelProps) {
  const center = selected || positions[0] || null;

  const html = useMemo(() => {
    const payload = positions.map((item) => ({
      id: item.id,
      name: item.name,
      latitude: item.latitude,
      longitude: item.longitude,
      speed: item.speed,
      moving: item.moving,
      lastReport: item.lastReport ?? '',
      ibuttonName: item.ibuttonName ?? '',
      address: item.address ?? '',
      lastFuelDownload: item.lastFuelDownload ?? null,
    }));

    const safePositions = JSON.stringify(payload).replace(/</g, '\\u003c');
    const safeSelectedId = JSON.stringify(selected?.id ?? null);

    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    />
    <style>
      html, body, #map {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #081224;
      }

      .leaflet-container {
        background: #081224;
        font-family: Arial, sans-serif;
      }

      .popup {
        min-width: 180px;
      }

      .popup-title {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 6px;
      }

      .popup-line {
        font-size: 12px;
        color: #334155;
        margin-bottom: 4px;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const positions = ${safePositions};
      const selectedId = ${safeSelectedId};

      const defaultLat = ${center?.latitude ?? -38.7402};
      const defaultLng = ${center?.longitude ?? -72.6186};

      const map = L.map('map', {
        zoomControl: true,
        attributionControl: true,
      }).setView([defaultLat, defaultLng], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const bounds = [];
      let selectedMarker = null;

      function markerColor(item) {
        if (item.id === selectedId) return '${colors.accent}';
        return item.moving ? '${colors.success}' : '${colors.gray}';
      }

      positions.forEach((item) => {
        if (
          typeof item.latitude !== 'number' ||
          Number.isNaN(item.latitude) ||
          typeof item.longitude !== 'number' ||
          Number.isNaN(item.longitude)
        ) {
          return;
        }

        bounds.push([item.latitude, item.longitude]);

        const marker = L.circleMarker([item.latitude, item.longitude], {
          radius: item.id === selectedId ? 10 : 8,
          color: markerColor(item),
          fillColor: markerColor(item),
          fillOpacity: 0.95,
          weight: 2,
        }).addTo(map);

        const popupHtml = \`
          <div class="popup">
            <div class="popup-title">\${item.name || 'Equipo'}</div>
            <div class="popup-line">Velocidad: \${Math.round(Number(item.speed || 0))} km/h</div>
            <div class="popup-line">Último reporte: \${item.lastReport || 'Sin dato'}</div>
            <div class="popup-line">iButton: \${item.ibuttonName || 'Sin dato'}</div>
            <div class="popup-line">Dirección: \${item.address || 'Sin dato'}</div>
          </div>
        \`;

        marker.bindPopup(popupHtml);

        marker.on('click', function () {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: 'select', id: item.id })
            );
          }
        });

        if (item.id === selectedId) {
          selectedMarker = marker;
        }
      });

      if (selectedMarker) {
        selectedMarker.openPopup();
        map.setView(selectedMarker.getLatLng(), 13);
      } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [30, 30] });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      }
    </script>
  </body>
</html>
    `;
  }, [positions, selected]);

  return (
    <View style={styles.wrapper}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        mixedContentMode="always"
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data);
            if (payload?.type === 'select' && payload?.id) {
              const item = positions.find((entry) => entry.id === payload.id);
              if (item) onSelect(item);
            }
          } catch {
            // ignore malformed messages
          }
        }}
      />

      {selected ? (
        <View style={styles.overlay}>
          <Text style={styles.title}>{selected.name}</Text>
          <Text style={styles.meta}>Velocidad: {formatNumber(selected.speed, 0)} km/h</Text>
          <Text style={styles.meta}>Último reporte: {formatDateTime(selected.lastReport)}</Text>
          <Text style={styles.meta}>iButton: {selected.ibuttonName || 'Sin dato'}</Text>
          <Text style={styles.meta}>Dirección: {selected.address || 'Sin dato'}</Text>
          <Text style={styles.meta}>
            Última descarga:{' '}
            {selected.lastFuelDownload != null ? formatLiters(selected.lastFuelDownload) : 'Sin dato'}
          </Text>
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
  overlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: colors.overlay,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: colors.white,
    fontSize: 13,
  },
});