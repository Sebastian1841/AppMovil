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
import { ReportsCalendarModal } from '@/components/reports/ReportsCalendarModal';
import { ReportsDeviceModal } from '@/components/reports/ReportsDeviceModal';
import { ReportsExportModal } from '@/components/reports/ReportsExportModal';
import { ReportsResults } from '@/components/reports/ReportsResults';
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
import { buildFuelReport, getFuelHistory } from '@/api';
import { useDevices } from '@/hooks/useDevices';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/colors';
import { isoDateDaysAgo, todayIsoDate } from '@/utils/format';

type CalendarTarget = 'from' | 'to' | null;

export default function ReportsScreen() {
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

  const reportQuery = useQuery({
    queryKey: ['fuel-report', identifier, dateFrom, dateTo, user?.username],
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

  const report = useMemo(
    () => buildFuelReport(reportQuery.data ?? []),
    [reportQuery.data]
  );

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

  const handleGenerate = () => {
    if (!identifier) {
      openInfoModal(
        'Equipo requerido',
        'Selecciona un equipo para generar el reporte.'
      );
      return;
    }

    setSubmitted(true);
    reportQuery.refetch();
  };

  const handleExport = (format: 'CSV' | 'PDF') => {
    setExportModalVisible(false);
    openInfoModal(
      `Exportar ${format}`,
      `La exportación ${format} queda preparada para conectarla cuando habilites ese endpoint en backend.`
    );
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

  return (
    <Screen scroll contentContainerStyle={styles.page}>
      <AppHeader title="Reportes de Combustible" />

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Generador de reportes</Text>

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
            onPress={handleGenerate}
            style={({ pressed }) => [
              styles.primaryButtonWide,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Generar informe</Text>
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
            <Text style={styles.secondaryButtonText}>Exportar reporte</Text>
          </Pressable>

          <Pressable
            onPress={handleClear}
            style={({ pressed }) => [
              styles.ghostButtonFlex,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.ghostButtonText}>Limpiar filtros</Text>
          </Pressable>
        </View>
      </View>

      <ReportsResults
        submitted={submitted}
        isFetching={reportQuery.isFetching}
        isError={reportQuery.isError}
        errorMessage={(reportQuery.error as Error)?.message}
        report={report}
        events={reportQuery.data ?? []}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

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