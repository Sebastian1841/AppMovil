import { router } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Screen } from '@/components/Screen';
import { SectionCard } from '@/components/SectionCard';
import { useAuthUser, useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/colors';

export default function ProfileScreen() {
  const user = useAuthUser();
  const signOut = useAuthStore((state) => state.signOut);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const handleSignOut = () => {
    setConfirmVisible(false);
    signOut();
    router.replace('/(auth)/login');
  };

  const openConfirm = () => {
    setConfirmVisible(true);
  };

  return (
    <Screen scroll contentContainerStyle={styles.page}>
      <AppHeader title="Perfil de Usuario" />

      <SectionCard style={styles.profileCard}>
        <Text style={styles.profileKicker}>SINERGY FLEET</Text>
        <Text style={styles.name}>{user?.username || 'Usuario'}</Text>
        <Text style={styles.profileDescription}>
          Cuenta activa dentro de la plataforma.
        </Text>

        <View style={styles.statusPill}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Sesión activa</Text>
        </View>
      </SectionCard>

      <SectionCard style={styles.accountCard}>
        <Text style={styles.sectionTitle}>Cuenta</Text>

        <View style={styles.infoBlock}>
          <View style={styles.row}>
            <Text style={styles.label}>Usuario</Text>
            <Text style={styles.value}>{user?.username || 'Sin dato'}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Estado</Text>
            <Text style={[styles.value, styles.statusValue]}>Sesión activa</Text>
          </View>
        </View>

        <View style={styles.actionBlock}>
          <Text style={styles.actionTitle}>Seguridad</Text>
          <Text style={styles.actionText}>
            Cierra tu sesión actual en este dispositivo.
          </Text>

          <Pressable
            onPress={openConfirm}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </SectionCard>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cerrar sesión</Text>
            <Text style={styles.modalText}>
              ¿Deseas salir de la plataforma Sinergy Fleet?
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setConfirmVisible(false)}
                style={({ pressed }) => [
                  styles.modalSecondary,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.modalSecondaryText}>Cancelar</Text>
              </Pressable>

              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  styles.modalPrimary,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.modalPrimaryText}>Cerrar sesión</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    gap: 16,
  },

  profileCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 32,
    paddingHorizontal: 20,
  },

  profileKicker: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },

  name: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },

  profileDescription: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 6,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.success,
  },

  statusText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },

  accountCard: {
    gap: 16,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },

  infoBlock: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  label: {
    color: colors.textMuted,
    fontSize: 14,
  },

  value: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  statusValue: {
    color: colors.success,
  },

  actionBlock: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },

  actionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },

  actionText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },

  logoutButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },

  logoutText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },

  buttonPressed: {
    opacity: 0.92,
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

  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },

  modalPrimary: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },

  modalPrimaryText: {
    color: colors.white,
    fontWeight: '800',
  },

  modalSecondary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },

  modalSecondaryText: {
    color: colors.white,
    fontWeight: '700',
  },
});