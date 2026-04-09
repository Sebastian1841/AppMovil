import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BORDER_SOFT,
  ACCENT_BLUE,
  SURFACE_CARD,
  SURFACE_CARD_ALT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from './fuelTheme';

type DeviceItem = {
  id: string | number;
  name: string;
  identifier: string;
};

type FuelDeviceModalProps = {
  visible: boolean;
  devices: DeviceItem[];
  identifier: string;
  onClose: () => void;
  onSelect: (identifier: string) => void;
};

export function FuelDeviceModal({
  visible,
  devices,
  identifier,
  onClose,
  onSelect,
}: FuelDeviceModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>Seleccionar equipo</Text>
              <Text style={styles.modalSubtitle}>Elige el dispositivo.</Text>
            </View>

            <Pressable onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalList}
            contentContainerStyle={styles.modalListContent}
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={() => {
                onSelect('');
                onClose();
              }}
              style={[styles.optionItem, !identifier && styles.optionItemActive]}
            >
              <Text style={[styles.optionTitle, !identifier && styles.optionTitleActive]}>
                Selecciona un equipo
              </Text>
              <Text style={styles.optionSubtitle}>Sin dispositivo seleccionado</Text>
            </Pressable>

            {devices.map((device) => {
              const isActive = identifier === device.identifier;

              return (
                <Pressable
                  key={device.id}
                  onPress={() => {
                    onSelect(device.identifier);
                    onClose();
                  }}
                  style={[styles.optionItem, isActive && styles.optionItemActive]}
                >
                  <Text style={[styles.optionTitle, isActive && styles.optionTitleActive]}>
                    {device.name}
                  </Text>
                  <Text style={styles.optionSubtitle}>{device.identifier}</Text>
                </Pressable>
              );
            })}

            {devices.length === 0 && (
              <View style={styles.emptyModalBox}>
                <Text style={styles.emptyModalTitle}>Sin dispositivos</Text>
                <Text style={styles.emptyModalText}>
                  No hay equipos disponibles para seleccionar.
                </Text>
              </View>
            )}
          </ScrollView>
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

  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '78%',
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

  modalList: {
    maxHeight: 420,
  },

  modalListContent: {
    gap: 8,
    paddingBottom: 4,
  },

  optionItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD_ALT,
    padding: 13,
  },

  optionItemActive: {
    borderColor: ACCENT_BLUE,
    backgroundColor: 'rgba(35, 77, 125, 0.18)',
  },

  optionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },

  optionTitleActive: {
    color: '#ffffff',
  },

  optionSubtitle: {
    color: TEXT_SECONDARY,
    fontSize: 12,
  },

  emptyModalBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD_ALT,
    padding: 14,
  },

  emptyModalTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },

  emptyModalText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 18,
  },
});