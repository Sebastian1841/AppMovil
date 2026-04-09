import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PositionItem } from '@/types';
import { colors } from '@/theme/colors';
import { formatDateTime, formatNumber, getStatusLabel } from '@/utils/format';

type Props = {
  items: PositionItem[];
  selectedId?: string | null;
  onSelect: (item: PositionItem) => void;
};

export function DeviceList({ items, selectedId, onSelect }: Props) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {items.map((item) => {
        const active = item.id === selectedId;

        return (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item)}
            style={({ pressed }) => [
              styles.card,
              active && styles.cardActive,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.headerRow}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>

              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: active
                      ? colors.accent
                      : item.moving
                        ? colors.success
                        : 'rgba(148, 163, 184, 0.92)',
                  },
                ]}
              >
                <Text style={styles.badgeText}>{getStatusLabel(item.speed)}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Velocidad</Text>
              <Text style={styles.metaValue}>{formatNumber(item.speed, 0)} km/h</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Último reporte</Text>
              <Text style={styles.metaValue}>{formatDateTime(item.lastReport)}</Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>iButton</Text>
              <Text style={styles.metaValue}>{item.ibuttonName || 'Sin dato'}</Text>
            </View>

            {item.address ? (
              <Text style={styles.address} numberOfLines={2}>
                {item.address}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 14,
  },
  card: {
    backgroundColor: 'rgba(9, 18, 36, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  cardActive: {
    borderColor: 'rgba(96, 165, 250, 0.78)',
    backgroundColor: 'rgba(16, 30, 54, 0.92)',
  },
  cardPressed: {
    opacity: 0.94,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 6,
  },
  name: {
    flex: 1,
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  metaLabel: {
    color: 'rgba(226, 232, 240, 0.72)',
    fontSize: 10,
    fontWeight: '600',
  },
  metaValue: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  address: {
    color: 'rgba(226, 232, 240, 0.62)',
    fontSize: 10,
    lineHeight: 14,
  },
});