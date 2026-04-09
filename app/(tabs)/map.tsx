import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { DeviceList } from '@/components/DeviceList';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { MapPanel } from '@/components/Map';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { usePositions } from '@/hooks/usePositions';
import { colors } from '@/theme/colors';
import { formatDateTime, formatLiters, formatNumber } from '@/utils/format';

const DRAWER_WIDTH = 290;
const HANDLE_WIDTH = 30;

export default function MapScreen() {
  const positionsQuery = usePositions();
  const positions = positionsQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [infoSelectedId, setInfoSelectedId] = useState<string | null>(null);
  const [popupSelectedId, setPopupSelectedId] = useState<string | null>(null);
  const [showDevices, setShowDevices] = useState(false);

  const drawerTranslate = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const selected = useMemo(
    () => positions.find((item) => item.id === selectedId) ?? null,
    [positions, selectedId],
  );

  const infoSelected = useMemo(
    () => positions.find((item) => item.id === infoSelectedId) ?? null,
    [positions, infoSelectedId],
  );

  const total = positions.length;
  const moving = positions.filter((item) => item.moving).length;
  const stopped = total - moving;

  useEffect(() => {
    Animated.spring(drawerTranslate, {
      toValue: showDevices ? 0 : -DRAWER_WIDTH,
      useNativeDriver: true,
      damping: 18,
      stiffness: 180,
      mass: 0.9,
    }).start();
  }, [drawerTranslate, showDevices]);

  const handleMapSelect = (item: (typeof positions)[number]) => {
    const isSameSelected = selectedId === item.id && infoSelectedId === item.id;

    if (isSameSelected) {
      setSelectedId(null);
      setInfoSelectedId(null);
      setPopupSelectedId(null);
      return;
    }

    setSelectedId(item.id);
    setInfoSelectedId(item.id);
    setPopupSelectedId(null);
  };

  const handleDrawerSelect = (item: (typeof positions)[number]) => {
    const isSameSelected = selectedId === item.id;

    if (isSameSelected) {
      setSelectedId(null);
      setInfoSelectedId(null);
      setPopupSelectedId(null);
      setShowDevices(false);
      return;
    }

    setSelectedId(item.id);
    setInfoSelectedId(null);
    setPopupSelectedId(item.id);
    setShowDevices(false);
  };

  const handleCloseInfo = () => {
    setSelectedId(null);
    setInfoSelectedId(null);
    setPopupSelectedId(null);
  };

  const MiniStatCard = ({
    label,
    value,
    tone = 'default',
  }: {
    label: string;
    value: string;
    tone?: 'default' | 'success' | 'accent';
  }) => {
    const valueColor =
      tone === 'success'
        ? colors.success
        : tone === 'accent'
          ? colors.accent
          : colors.text;

    return (
      <View style={styles.miniStatCard}>
        <Text style={styles.miniStatLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.miniStatValue, { color: valueColor }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    );
  };

  return (
    <Screen contentContainerStyle={styles.page}>
      <View style={styles.headerWrap}>
        <AppHeader title="Mapa Operacional" />
      </View>

      {positionsQuery.isLoading ? (
        <View style={styles.centerState}>
          <SectionCard>
            <LoadingState label="Consultando posiciones reales..." />
          </SectionCard>
        </View>
      ) : positionsQuery.isError ? (
        <View style={styles.centerState}>
          <SectionCard>
            <EmptyState
              title="No fue posible cargar el mapa"
              description={(positionsQuery.error as Error)?.message || 'Revisa la API y el login.'}
            />
          </SectionCard>
        </View>
      ) : positions.length === 0 ? (
        <View style={styles.centerState}>
          <SectionCard>
            <EmptyState
              title="Sin posiciones disponibles"
              description="El endpoint /fleet/positions respondió sin datos utilizables."
            />
          </SectionCard>
        </View>
      ) : (
        <View style={styles.mapSection}>
          <View style={styles.mapWrap}>
            <MapPanel
              positions={positions}
              selected={selected}
              popupSelectedId={popupSelectedId}
              onSelect={handleMapSelect}
            />

            <Animated.View
              style={[
                styles.devicesShell,
                { transform: [{ translateX: drawerTranslate }] },
              ]}
            >
              <View style={styles.devicesDrawer}>
                <View style={styles.devicesDrawerHeader}>
                  <Text style={styles.devicesDrawerTitle}>Dispositivos</Text>
                </View>

                <View style={styles.devicesDrawerContent}>
                  <DeviceList
                    items={positions}
                    selectedId={selected?.id}
                    onSelect={handleDrawerSelect}
                  />
                </View>
              </View>

              <Pressable
                onPress={() => setShowDevices((current) => !current)}
                style={({ pressed }) => [
                  styles.devicesHandle,
                  pressed && styles.pressed,
                ]}
              >
                <Ionicons
                  name={showDevices ? 'chevron-back' : 'chevron-forward'}
                  size={18}
                  color={colors.white}
                />
              </Pressable>
            </Animated.View>

            {infoSelected ? (
              <View style={styles.mapInfoOverlay}>
                <View style={styles.mapInfoHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mapInfoLabel}>Equipo seleccionado</Text>
                    <Text style={styles.mapInfoName} numberOfLines={1}>
                      {infoSelected.name}
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleCloseInfo}
                    style={({ pressed }) => [
                      styles.mapInfoCloseButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons name="close" size={16} color={colors.white} />
                  </Pressable>
                </View>

                <Text
                  style={[
                    styles.mapInfoStatus,
                    {
                      backgroundColor: infoSelected.moving
                        ? 'rgba(34, 197, 94, 0.62)'
                        : 'rgba(148, 163, 184, 0.42)',
                    },
                  ]}
                >
                  {infoSelected.moving ? 'En movimiento' : 'Detenido'}
                </Text>

                <View style={styles.mapInfoGrid}>
                  <View style={styles.mapInfoItem}>
                    <Text style={styles.itemLabel}>Velocidad</Text>
                    <Text style={styles.itemValue}>
                      {formatNumber(infoSelected.speed, 0)} km/h
                    </Text>
                  </View>

                  <View style={styles.mapInfoItem}>
                    <Text style={styles.itemLabel}>Último reporte</Text>
                    <Text style={styles.itemValue}>
                      {formatDateTime(infoSelected.lastReport)}
                    </Text>
                  </View>

                  <View style={styles.mapInfoItem}>
                    <Text style={styles.itemLabel}>iButton</Text>
                    <Text style={styles.itemValue}>
                      {infoSelected.ibuttonName || 'Sin dato'}
                    </Text>
                  </View>

                  <View style={styles.mapInfoItem}>
                    <Text style={styles.itemLabel}>Última descarga</Text>
                    <Text style={styles.itemValue}>
                      {infoSelected.lastFuelDownload != null
                        ? formatLiters(infoSelected.lastFuelDownload)
                        : 'Sin dato'}
                    </Text>
                  </View>
                </View>

                {infoSelected.address ? (
                  <Text style={styles.address} numberOfLines={3}>
                    {infoSelected.address}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.refreshRow}>
            <View style={styles.refreshTop}>
              <Pressable
                onPress={() => positionsQuery.refetch()}
                style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
              >
                <Text style={styles.refreshButtonText}>Actualizar</Text>
              </Pressable>

              <View style={styles.miniStatsRow}>
                <MiniStatCard label="Total" value={formatNumber(total)} />
                <MiniStatCard
                  label="Movimiento"
                  value={formatNumber(moving)}
                  tone="success"
                />
                <MiniStatCard
                  label="Detenidos"
                  value={formatNumber(stopped)}
                  tone="accent"
                />
              </View>
            </View>

            <Text style={styles.refreshText}>Actualización automática cada 7 segundos</Text>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flexGrow: 1,
    backgroundColor: '#f7f8fa',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 16,
  },

  headerWrap: {
    padding: 8,
  },

  centerState: {
    flex: 1,
    justifyContent: 'center',
  },

  mapSection: {
    gap: 12,
    paddingTop: 8,
    paddingHorizontal: 8,
  },

  mapWrap: {
    height: 590,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },

  devicesShell: {
    position: 'absolute',
    top: 16,
    bottom: 16,
    left: 0,
    width: DRAWER_WIDTH + HANDLE_WIDTH,
    zIndex: 24,
  },

  devicesDrawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: 'rgba(12,18,32,0.62)',
    borderTopRightRadius: 22,
    borderBottomRightRadius: 22,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

  devicesDrawerHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  devicesDrawerTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },

  devicesDrawerContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  devicesHandle: {
    position: 'absolute',
    left: DRAWER_WIDTH - 2,
    top: 220,
    width: HANDLE_WIDTH,
    height: 72,
    borderTopRightRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },

  mapInfoOverlay: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 300,
    maxWidth: '82%',
    backgroundColor: 'rgba(9, 18, 36, 0.42)',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 15,
  },

  mapInfoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },

  mapInfoLabel: {
    color: 'rgba(191, 219, 254, 0.86)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  mapInfoName: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },

  mapInfoCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },

  mapInfoStatus: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
  },

  mapInfoGrid: {
    gap: 8,
  },

  mapInfoItem: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 14,
    padding: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.025)',
  },

  itemLabel: {
    color: 'rgba(226, 232, 240, 0.82)',
    fontSize: 11,
    marginBottom: 5,
  },

  itemValue: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },

  address: {
    marginTop: 10,
    color: 'rgba(226, 232, 240, 0.8)',
    lineHeight: 18,
    fontSize: 12,
  },

  refreshRow: {
    gap: 8,
    paddingHorizontal: 4,
  },

  refreshTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },

  refreshText: {
    color: colors.textMuted,
    fontSize: 13,
  },

  miniStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginLeft: 'auto',
  },

  miniStatCard: {
    minWidth: 86,
    maxWidth: 96,
    backgroundColor: colors.cardMuted,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },

  miniStatLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 3,
  },

  miniStatValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },

  refreshButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  refreshButtonText: {
    color: colors.white,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});