import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { useDevices } from '@/hooks/useDevices';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/colors';
import { buildFuelReport, getFuelHistory } from '@/api';
import {
  formatDateTime,
  formatLiters,
  isoDateDaysAgo,
  todayIsoDate,
} from '@/utils/format';

import { FuelCalendarModal } from '@/components/fuel/FuelCalendarModal';
import { FuelDeviceModal } from '@/components/fuel/FuelDeviceModal';
import { FuelStateBox } from '@/components/fuel/FuelStateBox';
import {
  formatDisplayDate,
  parseIsoDate,
  startOfMonth,
} from '@/components/fuel/fuelDateUtils';
import {
  ACCENT_ORANGE,
  BORDER_SOFT,
  BORDER_STRONG,
  SURFACE_CARD,
  SURFACE_CARD_ALT,
  SURFACE_INPUT,
  SURFACE_PAGE,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from '@/components/fuel/fuelTheme';

type CalendarTarget = 'from' | 'to' | null;

export default function FuelScreen() {
  const user = useAuthStore((state) => state.user);
  const devicesQuery = useDevices();
  const devices = devicesQuery.data ?? [];

  const defaultFrom = isoDateDaysAgo(7);
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
    staleTime: 10_000,
  });

  const events = historyQuery.data ?? [];
  const report = useMemo(() => buildFuelReport(events), [events]);

  const selectedDeviceLabel = useMemo(() => {
    if (!identifier) return 'Selecciona un equipo';

    const found = devices.find((device) => device.identifier === identifier);
    return found ? `${found.name} · ${found.identifier}` : identifier;
  }, [devices, identifier]);

  const selectedCalendarDate = parseIsoDate(
    calendarTarget === 'from' ? dateFrom : dateTo
  );

  const openInfoModal = (title: string, message: string) => {
    setInfoModalTitle(title);
    setInfoModalMessage(message);
    setInfoModalVisible(true);
  };

  const handleSearch = () => {
    if (!identifier) {
      openInfoModal('Falta equipo', 'Debes seleccionar un equipo antes de consultar.');
      return;
    }

    setSubmitted(true);
    historyQuery.refetch();
  };

  const handleClear = () => {
    setIdentifier('');
    setDateFrom(defaultFrom);
    setDateTo(defaultTo);
    setSubmitted(false);
    setDeviceModalVisible(false);
    setCalendarTarget(null);
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

  const renderSummary = () => (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Resumen</Text>

      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Total litros</Text>
          <Text style={[styles.summaryValue, styles.summaryValueAccent]}>
            {submitted && !historyQuery.isError ? formatLiters(report.totalLiters) : '--'}
          </Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Eventos</Text>
          <Text style={styles.summaryValue}>
            {submitted && !historyQuery.isError ? report.totalEvents : '--'}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderEvents = () => {
    if (historyQuery.isFetching) {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Eventos</Text>
          <FuelStateBox
            badge="Cargando"
            title="Consultando descargas"
            description="Estamos obteniendo los eventos reales del rango seleccionado."
          />
        </View>
      );
    }

    if (!submitted) {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Eventos</Text>
          <FuelStateBox
            badge="Pendiente"
            title="Consulta pendiente"
            description="Selecciona un equipo y un rango de fechas para ver los eventos."
            tone="warning"
          />
        </View>
      );
    }

    if (historyQuery.isError) {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Eventos</Text>
          <FuelStateBox
            badge="Error"
            title="No fue posible consultar"
            description={
              (historyQuery.error as Error)?.message ||
              'Revisa el endpoint /variables/{identifier}.'
            }
            tone="error"
          />
        </View>
      );
    }

    if (events.length === 0) {
      return (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Eventos</Text>
          <FuelStateBox
            badge="Vacío"
            title="Sin eventos"
            description="No se encontraron descargas para el equipo y rango seleccionados."
          />
        </View>
      );
    }

    return (
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Eventos</Text>

        <View style={styles.eventsList}>
          {events.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventTopRow}>
                <View style={styles.eventMain}>
                  <Text style={styles.eventLiters}>{formatLiters(event.liters)}</Text>
                  <Text style={styles.eventDate}>{formatDateTime(event.timestamp)}</Text>
                </View>

                <Text style={styles.eventTag}>Descarga</Text>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>IButton</Text>
                  <Text style={styles.metaValue}>{event.ibutton || 'Sin dato'}</Text>
                </View>

                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Nombre iButton</Text>
                  <Text style={styles.metaValue}>{event.ibuttonName || 'Sin dato'}</Text>
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
      <AppHeader title="Descargas de Combustible" />

      <View style={styles.shell}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Filtros</Text>

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

          <View style={styles.actionsRow}>
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Limpiar</Text>
            </Pressable>

            <Pressable
              onPress={handleSearch}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Consultar</Text>
            </Pressable>
          </View>
        </View>

        {renderSummary()}
        {renderEvents()}
      </View>

      <FuelDeviceModal
        visible={deviceModalVisible}
        devices={devices}
        identifier={identifier}
        onClose={() => setDeviceModalVisible(false)}
        onSelect={setIdentifier}
      />

      <FuelCalendarModal
        visible={calendarTarget !== null}
        target={calendarTarget}
        calendarMonth={calendarMonth}
        selectedDate={selectedCalendarDate}
        onClose={() => setCalendarTarget(null)}
        onChangeMonth={setCalendarMonth}
        onPick={handleCalendarPick}
        onPickToday={() => handleCalendarPick(todayIsoDate())}
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

  shell: {
    gap: 12,
    paddingBottom: 24,
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

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },

  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD_ALT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  primaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT_ORANGE,
    backgroundColor: ACCENT_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },

  buttonPressed: {
    opacity: 0.92,
  },

  secondaryButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '800',
  },

  primaryButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },

  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },

  summaryBox: {
    flex: 1,
    minWidth: 150,
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD_ALT,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  summaryLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  summaryValue: {
    color: TEXT_PRIMARY,
    fontSize: 24,
    fontWeight: '900',
  },

  summaryValueAccent: {
    color: ACCENT_ORANGE,
  },

  eventsList: {
    gap: 10,
  },

  eventCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD_ALT,
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