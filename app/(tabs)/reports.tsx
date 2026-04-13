import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { buildFuelReport, getFuelHistory } from '@/api';
import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { ReportsCalendarModal } from '@/components/reports/ReportsCalendarModal';
import { ReportsDeviceModal } from '@/components/reports/ReportsDeviceModal';
import { ReportsExportModal } from '@/components/reports/ReportsExportModal';
import {
  formatDisplayDate,
  parseIsoDate,
  startOfMonth,
} from '@/components/reports/reportsDateUtils';
import {
  ACCENT_ORANGE,
  BORDER_SOFT,
  BORDER_STRONG,
  SURFACE_CARD,
  SURFACE_INPUT,
  SURFACE_PAGE,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/components/reports/reportsTheme';
import { useDevices } from '@/hooks/useDevices';
import { exportFuelCsv, exportFuelPdf } from '@/services/exportService';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/colors';
import {
  formatDateTime,
  formatLiters,
  isoDateDaysAgo,
  todayIsoDate,
} from '@/utils/format';

type CalendarTarget = 'from' | 'to' | null;

function splitFormattedDateTime(value?: string) {
  if (!value) {
    return {
      date: '--',
      time: '--',
    };
  }

  const formatted = formatDateTime(value);
  const parts = formatted.split(',');

  if (parts.length >= 2) {
    return {
      date: parts[0]?.trim() || '--',
      time: parts.slice(1).join(',').trim() || '--',
    };
  }

  return {
    date: formatted,
    time: '--',
  };
}

export default function FuelScreen() {
  const user = useAuthStore((state) => state.user);
  const devicesQuery = useDevices();
  const devices = devicesQuery.data ?? [];

  const defaultFrom = isoDateDaysAgo(30);
  const defaultTo = todayIsoDate();

  const [identifier, setIdentifier] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>(defaultFrom);
  const [dateTo, setDateTo] = useState<string>(defaultTo);
  const [submitted, setSubmitted] = useState(false);

  const [deviceModalVisible, setDeviceModalVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(
    startOfMonth(parseIsoDate(defaultTo))
  );
  const [exportModalVisible, setExportModalVisible] = useState(false);

  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoModalTitle, setInfoModalTitle] = useState('');
  const [infoModalMessage, setInfoModalMessage] = useState('');

  const historyQuery = useQuery({
    queryKey: ['fuel-history', identifier, dateFrom, dateTo, user?.username],
    queryFn: () =>
      getFuelHistory({
        token: user!.token,
        identifier,
        dateFrom,
        dateTo,
      }),
    enabled: Boolean(user?.token && identifier && submitted),
    staleTime: 15_000,
  });

  const events = historyQuery.data ?? [];
  const report = useMemo(() => buildFuelReport(events), [events]);

  const selectedDevice = useMemo(() => {
    if (!identifier) return null;
    return devices.find((device) => device.identifier === identifier) ?? null;
  }, [devices, identifier]);

  const selectedDeviceLabel = useMemo(() => {
    if (!identifier) return 'Selecciona un equipo';

    return selectedDevice
      ? `${selectedDevice.name} · ${selectedDevice.identifier}`
      : identifier;
  }, [selectedDevice, identifier]);

  const selectedCalendarDate = parseIsoDate(
    calendarTarget === 'from' ? dateFrom : dateTo
  );

  const firstEventParts = useMemo(
    () => splitFormattedDateTime(report.firstEvent),
    [report.firstEvent]
  );

  const lastEventParts = useMemo(
    () => splitFormattedDateTime(report.lastEvent),
    [report.lastEvent]
  );

  const openInfoModal = (title: string, message: string) => {
    setInfoModalTitle(title);
    setInfoModalMessage(message);
    setInfoModalVisible(true);
  };

  const handleSearch = () => {
    if (!identifier) {
      openInfoModal(
        'Equipo requerido',
        'Selecciona un equipo para consultar.'
      );
      return;
    }

    setSubmitted(true);
    historyQuery.refetch();
  };

  const handleExport = async (format: 'CSV' | 'PDF') => {
    setExportModalVisible(false);

    if (!identifier) {
      openInfoModal(
        'Equipo requerido',
        'Selecciona un equipo antes de exportar.'
      );
      return;
    }

    if (!events.length) {
      openInfoModal(
        'Sin datos',
        'No hay descargas para exportar con los filtros seleccionados.'
      );
      return;
    }

    try {
      const filenameBase = `combustible_${identifier}_${dateFrom}_${dateTo}`;

      const normalizedEvents = events.map((event) => ({
        id: event.id ?? '',
        liters: event.liters ?? 0,
        timestamp: event.timestamp ?? '',
        ibutton: event.ibutton ?? '',
        ibuttonName: event.ibuttonName ?? '',
        address: event.address ?? '',
      }));

      if (format === 'CSV') {
        await exportFuelCsv({
          filename: `${filenameBase}.csv`,
          events: normalizedEvents,
        });

        openInfoModal(
          'Exportación completada',
          'El archivo CSV fue generado correctamente.'
        );
        return;
      }

      await exportFuelPdf({
        filename: `${filenameBase}.pdf`,
        title: 'Combustible',
        deviceName: selectedDevice?.name || identifier,
        identifier,
        dateFrom,
        dateTo,
        report,
        events: normalizedEvents,
      });

      openInfoModal(
        'Exportación completada',
        'El archivo PDF fue generado correctamente.'
      );
    } catch (error) {
      openInfoModal(
        'Error de exportación',
        error instanceof Error
          ? error.message
          : 'No se pudo exportar el archivo.'
      );
    }
  };

  const handleClear = () => {
    setIdentifier('');
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setSubmitted(false);
    setDeviceModalVisible(false);
    setCalendarTarget(null);
    setExportModalVisible(false);
  };

  const openCalendar = (target: Exclude<CalendarTarget, null>) => {
    const baseDate = parseIsoDate(target === 'from' ? dateFrom : dateTo);
    setCalendarMonth(startOfMonth(baseDate));
    setCalendarTarget(target);
  };

  const handleCalendarPick = (nextIso: string) => {
    if (calendarTarget === 'from') {
      setDateFrom(nextIso);
      if (nextIso > dateTo) setDateTo(nextIso);
    }

    if (calendarTarget === 'to') {
      setDateTo(nextIso);
      if (nextIso < dateFrom) setDateFrom(nextIso);
    }

    setCalendarTarget(null);
  };

  const renderOverview = () => {
    if (!submitted || historyQuery.isError || historyQuery.isFetching || events.length === 0) {
      return null;
    }

    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Vista general</Text>

        <View style={styles.overviewHero}>
          <Text style={styles.overviewLabel}>Total del período</Text>
          <Text style={styles.overviewTotal}>{formatLiters(report.totalLiters)}</Text>
          <Text style={styles.overviewText}>
            Consumo consolidado para el rango seleccionado
          </Text>
        </View>

        <View style={styles.overviewGrid}>
          <View style={styles.overviewSmallCard}>
            <Text style={styles.overviewLabel}>Eventos</Text>
            <Text style={styles.overviewNumber}>{report.totalEvents}</Text>
          </View>

          <View style={styles.overviewSmallCard}>
            <Text style={styles.overviewLabel}>Período</Text>
            <Text style={styles.overviewPeriodText}>
              {formatDisplayDate(dateFrom)} - {formatDisplayDate(dateTo)}
            </Text>
          </View>

          <View style={styles.overviewSmallCard}>
            <Text style={styles.overviewLabel}>Primer evento</Text>
            <Text style={styles.overviewDate}>{firstEventParts.date}</Text>
            <Text style={styles.overviewTime}>{firstEventParts.time}</Text>
          </View>

          <View style={styles.overviewSmallCard}>
            <Text style={styles.overviewLabel}>Último evento</Text>
            <Text style={styles.overviewDate}>{lastEventParts.date}</Text>
            <Text style={styles.overviewTime}>{lastEventParts.time}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDownloads = () => {
    if (historyQuery.isFetching) {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Descargas</Text>
          <View style={styles.stateBox}>
            <Text style={styles.stateBadge}>Cargando</Text>
            <Text style={styles.stateTitle}>Consultando descargas</Text>
            <Text style={styles.stateText}>
              Estamos obteniendo los eventos reales del rango seleccionado.
            </Text>
          </View>
        </View>
      );
    }

    if (!submitted) {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Descargas</Text>
          <View style={styles.stateBox}>
            <Text style={styles.stateBadge}>Pendiente</Text>
            <Text style={styles.stateTitle}>Consulta pendiente</Text>
            <Text style={styles.stateText}>
              Selecciona un equipo y un rango de fechas para ver las descargas.
            </Text>
          </View>
        </View>
      );
    }

    if (historyQuery.isError) {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Descargas</Text>
          <View style={styles.stateBox}>
            <Text style={styles.stateBadge}>Error</Text>
            <Text style={styles.stateTitle}>No fue posible consultar</Text>
            <Text style={styles.stateText}>
              {(historyQuery.error as Error)?.message ||
                'Revisa el endpoint de combustible.'}
            </Text>
          </View>
        </View>
      );
    }

    if (events.length === 0) {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Descargas</Text>
          <View style={styles.stateBox}>
            <Text style={styles.stateBadge}>Vacío</Text>
            <Text style={styles.stateTitle}>Sin eventos</Text>
            <Text style={styles.stateText}>
              No se encontraron descargas para el equipo y rango seleccionados.
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Descargas</Text>

        <View style={styles.eventsList}>
          {events.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventTopRow}>
                <View style={styles.eventMain}>
                  <Text style={styles.eventLiters}>
                    {formatLiters(event.liters)}
                  </Text>
                  <Text style={styles.eventDate}>
                    {event.timestamp ? formatDateTime(event.timestamp) : 'Sin fecha'}
                  </Text>
                </View>

                <Text style={styles.eventTag}>Descarga</Text>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>IButton</Text>
                  <Text style={styles.metaValue}>
                    {event.ibutton || 'Sin dato'}
                  </Text>
                </View>

                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Nombre iButton</Text>
                  <Text style={styles.metaValue}>
                    {event.ibuttonName || 'Sin dato'}
                  </Text>
                </View>
              </View>

              <View style={styles.addressRow}>
                <Text style={styles.addressLabel}>Dirección</Text>
                <Text style={styles.addressText}>
                  {event.address || 'Sin dirección disponible'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <Screen scroll contentContainerStyle={styles.page}>
      <AppHeader title="Combustible" />

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Consulta y exportación</Text>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Equipo</Text>

          <Pressable
            onPress={() => setDeviceModalVisible(true)}
            style={({ pressed }) => [
              styles.selectTrigger,
              pressed && styles.fieldPressed,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.selectText,
                !identifier && styles.selectPlaceholder,
              ]}
            >
              {selectedDeviceLabel}
            </Text>

            <Text style={styles.selectChevron}>▾</Text>
          </Pressable>
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>Fecha desde</Text>

            <Pressable
              onPress={() => openCalendar('from')}
              style={({ pressed }) => [
                styles.dateTrigger,
                pressed && styles.fieldPressed,
              ]}
            >
              <View style={styles.dateTriggerContent}>
                <Text style={styles.dateValue}>{formatDisplayDate(dateFrom)}</Text>
                <Text style={styles.dateHint}>Seleccionar fecha</Text>
              </View>

              <Text style={styles.dateAction}>▾</Text>
            </Pressable>
          </View>

          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>Fecha hasta</Text>

            <Pressable
              onPress={() => openCalendar('to')}
              style={({ pressed }) => [
                styles.dateTrigger,
                pressed && styles.fieldPressed,
              ]}
            >
              <View style={styles.dateTriggerContent}>
                <Text style={styles.dateValue}>{formatDisplayDate(dateTo)}</Text>
                <Text style={styles.dateHint}>Seleccionar fecha</Text>
              </View>

              <Text style={styles.dateAction}>▾</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.actionsPrimaryRow}>
          <Pressable
            onPress={handleSearch}
            style={({ pressed }) => [
              styles.primaryButtonWide,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Consultar</Text>
          </Pressable>
        </View>

        <View style={styles.actionsSecondaryRow}>
          <Pressable
            onPress={() => setExportModalVisible(true)}
            style={({ pressed }) => [
              styles.secondaryButtonFlex,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.secondaryButtonText}>Exportar</Text>
          </Pressable>

          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [
              styles.ghostButtonFlex,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.ghostButtonText}>Limpiar</Text>
          </Pressable>
        </View>
      </View>

      {renderOverview()}
      {renderDownloads()}

      <ReportsDeviceModal
        visible={deviceModalVisible}
        devices={devices}
        identifier={identifier}
        onClose={() => setDeviceModalVisible(false)}
        onSelect={setIdentifier}
      />

      <ReportsCalendarModal
        visible={calendarTarget !== null}
        target={calendarTarget}
        calendarMonth={calendarMonth}
        selectedDate={selectedCalendarDate}
        onClose={() => setCalendarTarget(null)}
        onChangeMonth={setCalendarMonth}
        onPick={handleCalendarPick}
        onPickToday={() => handleCalendarPick(todayIsoDate())}
      />

      <ReportsExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        onExport={handleExport}
      />

      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{infoModalTitle}</Text>
            <Text style={styles.modalText}>{infoModalMessage}</Text>

            <Pressable
              onPress={() => setInfoModalVisible(false)}
              style={({ pressed }) => [
                styles.modalPrimary,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.modalPrimaryText}>Aceptar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    gap: 12,
    backgroundColor: SURFACE_PAGE,
  },

  panel: {
    backgroundColor: SURFACE_CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    padding: 14,
  },

  panelTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },

  fieldBlock: {
    marginBottom: 12,
  },

  fieldLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  fieldPressed: {
    opacity: 0.95,
  },

  selectTrigger: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_STRONG,
    backgroundColor: SURFACE_INPUT,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  selectText: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },

  selectPlaceholder: {
    color: TEXT_SECONDARY,
  },

  selectChevron: {
    color: TEXT_SECONDARY,
    fontSize: 15,
    fontWeight: '800',
  },

  dateRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    flexWrap: 'wrap',
  },

  dateField: {
    flex: 1,
    minWidth: 150,
  },

  dateTrigger: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_INPUT,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  dateTriggerContent: {
    flex: 1,
  },

  dateValue: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },

  dateHint: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '600',
  },

  dateAction: {
    color: TEXT_SECONDARY,
    fontSize: 14,
    fontWeight: '800',
  },

  actionsPrimaryRow: {
    marginTop: 2,
    marginBottom: 10,
  },

  actionsSecondaryRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },

  primaryButtonWide: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT_ORANGE,
    backgroundColor: ACCENT_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  secondaryButtonFlex: {
    flex: 1,
    minWidth: 160,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  ghostButtonFlex: {
    flex: 1,
    minWidth: 140,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  buttonPressed: {
    opacity: 0.92,
  },

  primaryButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  secondaryButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '800',
  },

  ghostButtonText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
  },

  overviewHero: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_INPUT,
    padding: 18,
    marginBottom: 12,
  },

  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  overviewSmallCard: {
    flex: 1,
    minWidth: 150,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_INPUT,
    padding: 14,
  },

  overviewLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },

  overviewTotal: {
    color: ACCENT_ORANGE,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },

  overviewText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 20,
  },

  overviewNumber: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '900',
  },

  overviewPeriodText: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 22,
  },

  overviewDate: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },

  overviewTime: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '700',
  },

  stateBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_INPUT,
    padding: 14,
    gap: 6,
  },

  stateBadge: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  stateTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '800',
  },

  stateText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 20,
  },

  eventsList: {
    gap: 10,
  },

  eventCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_INPUT,
    padding: 14,
    gap: 12,
  },

  eventTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
  },

  eventMain: {
    flex: 1,
    minWidth: 180,
  },

  eventLiters: {
    color: ACCENT_ORANGE,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },

  eventDate: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },

  eventTag: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  metaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },

  metaItem: {
    flex: 1,
    minWidth: 150,
  },

  metaLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  metaValue: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },

  addressRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER_SOFT,
  },

  addressLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  addressText: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    lineHeight: 20,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },

  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },

  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },

  modalText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },

  modalPrimary: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },

  modalPrimaryText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
});