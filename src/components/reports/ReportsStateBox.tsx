import { StyleSheet, Text, View } from 'react-native';

import {
  BORDER_SOFT,
  SURFACE_CARD_ALT,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from './reportsTheme';

type Tone = 'default' | 'warning' | 'error';

type ReportsStateBoxProps = {
  badge: string;
  title: string;
  description: string;
  tone?: Tone;
};

export function ReportsStateBox({
  badge,
  title,
  description,
  tone = 'default',
}: ReportsStateBoxProps) {
  return (
    <View style={styles.stateBox}>
      <View
        style={[
          styles.stateBadge,
          tone === 'warning' && styles.stateBadgeWarning,
          tone === 'error' && styles.stateBadgeError,
        ]}
      >
        <Text
          style={[
            styles.stateBadgeText,
            tone === 'warning' && styles.stateBadgeTextWarning,
            tone === 'error' && styles.stateBadgeTextError,
          ]}
        >
          {badge}
        </Text>
      </View>

      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateDescription}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stateBox: {
    minHeight: 136,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER_SOFT,
    backgroundColor: SURFACE_CARD_ALT,
    padding: 16,
    justifyContent: 'center',
  },

  stateBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 12,
    backgroundColor: 'rgba(35, 77, 125, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(35, 77, 125, 0.28)',
  },

  stateBadgeWarning: {
    backgroundColor: 'rgba(255, 159, 67, 0.10)',
    borderColor: 'rgba(255, 159, 67, 0.22)',
  },

  stateBadgeError: {
    backgroundColor: 'rgba(255, 99, 132, 0.10)',
    borderColor: 'rgba(255, 99, 132, 0.20)',
  },

  stateBadgeText: {
    color: TEXT_PRIMARY,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  stateBadgeTextWarning: {
    color: '#ffd08a',
  },

  stateBadgeTextError: {
    color: '#ff9fb3',
  },

  stateTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },

  stateDescription: {
    color: TEXT_SECONDARY,
    fontSize: 13,
    lineHeight: 19,
  },
});