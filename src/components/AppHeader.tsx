import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/theme/colors';

type Props = {
  title?: string;
  onLeftPress?: () => void;
  onRightPress?: () => void;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
};

export function AppHeader({
  title = 'Sinergy Fleet',
  onLeftPress,
  onRightPress,
  leftIcon = 'menu',
  rightIcon = 'log-out-outline',
}: Props) {
  return (
    <View style={styles.wrapper}>
      {onLeftPress ? (
        <Pressable
          onPress={onLeftPress}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name={leftIcon} size={22} color={colors.white} />
        </Pressable>
      ) : (
        <View style={styles.sideSpacer} />
      )}

      <View style={styles.center}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {onRightPress ? (
        <Pressable
          onPress={onRightPress}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name={rightIcon} size={22} color={colors.white} />
        </Pressable>
      ) : (
        <View style={styles.sideSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    minHeight: 64,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  center: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logo: {
    width: 96,
    height: 28,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideSpacer: {
    width: 42,
    height: 42,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});