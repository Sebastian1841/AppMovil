import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  addMonths,
  buildCalendarDays,
  isSameDay,
  isSameMonth,
  isToday,
  MONTH_NAMES,
  toIsoDate,
  WEEK_DAYS,
} from './fuelDateUtils';
import {
  ACCENT_BLUE,
  ACCENT_ORANGE,
  BORDER_SOFT,
  SURFACE_CARD,
  SURFACE_CARD_ALT,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from './fuelTheme';

type FuelCalendarModalProps = {
  visible: boolean;
  target: 'from' | 'to' | null;
  calendarMonth: Date;
  selectedDate: Date;
  onClose: () => void;
  onChangeMonth: (nextMonth: Date) => void;
  onPick: (isoDate: string) => void;
  onPickToday: () => void;
};

export function FuelCalendarModal({
  visible,
  target,
  calendarMonth,
  selectedDate,
  onClose,
  onChangeMonth,
  onPick,
  onPickToday,
}: FuelCalendarModalProps) {
  const calendarDays = buildCalendarDays(calendarMonth);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View style={styles.calendarCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>
                {target === 'from' ? 'Fecha desde' : 'Fecha hasta'}
              </Text>
              <Text style={styles.modalSubtitle}>Selecciona una fecha.</Text>
            </View>

            <Pressable onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.calendarNav}>
            <Pressable
              onPress={() => onChangeMonth(addMonths(calendarMonth, -1))}
              style={styles.calendarNavButton}
            >
              <Text style={styles.calendarNavButtonText}>‹</Text>
            </Pressable>

            <Text style={styles.calendarMonthLabel}>
              {MONTH_NAMES[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
            </Text>

            <Pressable
              onPress={() => onChangeMonth(addMonths(calendarMonth, 1))}
              style={styles.calendarNavButton}
            >
              <Text style={styles.calendarNavButtonText}>›</Text>
            </Pressable>
          </View>

          <View style={styles.calendarWeekRow}>
            {WEEK_DAYS.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.calendarWeekText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day) => {
              const iso = toIsoDate(day);
              const selected = isSameDay(day, selectedDate);
              const outsideMonth = !isSameMonth(day, calendarMonth);
              const today = isToday(day);

              return (
                <Pressable
                  key={iso}
                  onPress={() => onPick(iso)}
                  style={[
                    styles.dayCell,
                    outsideMonth && styles.dayCellOutsideMonth,
                    selected && styles.dayCellSelected,
                    today && !selected && styles.dayCellToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      outsideMonth && styles.dayTextOutsideMonth,
                      selected && styles.dayTextSelected,
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.calendarFooter}>
            <Pressable onPress={onClose} style={styles.footerSecondaryButton}>
              <Text style={styles.footerSecondaryButtonText}>Cancelar</Text>
            </Pressable>

            <Pressable onPress={onPickToday} style={styles.footerPrimaryButton}>
              <Text style={styles.footerPrimaryButtonText}>Hoy</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },

  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 8, 15, 0.74)',
  },

  calendarCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD,
    padding: 14,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },

  modalHeaderText: {
    flex: 1,
  },

  modalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 3,
  },

  modalSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 17,
  },

  modalClose: {
    color: TEXT_SECONDARY,
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 4,
  },

  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  calendarNavButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD_ALT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarNavButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 17,
  },

  calendarMonthLabel: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '800',
  },

  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  calendarWeekText: {
    width: '13.2%',
    textAlign: 'center',
    color: TEXT_MUTED,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  dayCell: {
    width: '13.2%',
    aspectRatio: 1,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: SURFACE_CARD_ALT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },

  dayCellOutsideMonth: {
    opacity: 0.32,
  },

  dayCellSelected: {
    backgroundColor: ACCENT_ORANGE,
    borderColor: ACCENT_ORANGE,
  },

  dayCellToday: {
    borderColor: ACCENT_BLUE,
  },

  dayText: {
    color: TEXT_PRIMARY,
    fontSize: 12,
    fontWeight: '700',
  },

  dayTextOutsideMonth: {
    color: TEXT_MUTED,
  },

  dayTextSelected: {
    color: '#ffffff',
  },

  calendarFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  footerSecondaryButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD_ALT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerSecondaryButtonText: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '800',
  },

  footerPrimaryButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT_ORANGE,
    backgroundColor: ACCENT_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footerPrimaryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
  },
});