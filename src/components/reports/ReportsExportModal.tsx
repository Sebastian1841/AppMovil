import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  BORDER_SOFT,
  SURFACE_CARD,
  SURFACE_CARD_ALT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from './reportsTheme';

type ReportsExportModalProps = {
  visible: boolean;
  onClose: () => void;
  onExport: (format: 'CSV' | 'PDF') => void;
};

export function ReportsExportModal({
  visible,
  onClose,
  onExport,
}: ReportsExportModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />

        <View style={styles.exportModalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderText}>
              <Text style={styles.modalTitle}>Exportar reporte</Text>
              <Text style={styles.modalSubtitle}>
                Selecciona el formato de exportación.
              </Text>
            </View>

            <Pressable onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.exportOptions}>
            <Pressable onPress={() => onExport('CSV')} style={styles.exportOption}>
              <Text style={styles.exportOptionTitle}>CSV</Text>
              <Text style={styles.exportOptionText}>
                Exportación tabular para análisis y planillas.
              </Text>
            </Pressable>

            <Pressable onPress={() => onExport('PDF')} style={styles.exportOption}>
              <Text style={styles.exportOptionTitle}>PDF</Text>
              <Text style={styles.exportOptionText}>
                Documento listo para compartir o presentar.
              </Text>
            </Pressable>
          </View>

          <Pressable onPress={onClose} style={styles.exportCancelButton}>
            <Text style={styles.exportCancelButtonText}>Cancelar</Text>
          </Pressable>
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

  exportModalCard: {
    width: '100%',
    maxWidth: 360,
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

  exportOptions: {
    gap: 10,
    marginBottom: 12,
  },

  exportOption: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD_ALT,
    padding: 14,
  },

  exportOptionTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },

  exportOptionText: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    lineHeight: 18,
  },

  exportCancelButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  exportCancelButtonText: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    fontWeight: '800',
  },
});