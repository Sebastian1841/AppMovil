import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/store/authStore';
import { colors } from '@/theme/colors';

const iconByRoute: Record<string, keyof typeof Ionicons.glyphMap> = {
  map: 'map',
  reports: 'bar-chart',
  profile: 'person-circle',
};

const labelByRoute: Record<string, string> = {
  map: 'Mapa',
  reports: 'Reportes',
  profile: 'Perfil',
};

export default function TabsLayout() {
  const user = useAuthStore((state) => state.user);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const insets = useSafeAreaInsets();

  if (!hasHydrated) return null;

  if (!user?.token) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 74 + insets.bottom,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
        },
        tabBarItemStyle: {
          height: 58,
          paddingVertical: 0,
        },
        tabBarIconStyle: {
          margin: 0,
          width: '100%',
          height: 50,
        },
        tabBarIcon: ({ focused, color }) => (
          <View style={styles.tabContent}>
            <Ionicons
              name={iconByRoute[route.name] || 'ellipse'}
              size={22}
              color={color}
            />
            <Text
              numberOfLines={1}
              allowFontScaling={false}
              style={[
                styles.tabLabel,
                {
                  color,
                  fontWeight: focused ? '800' : '700',
                },
              ]}
            >
              {labelByRoute[route.name] || route.name}
            </Text>
          </View>
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: {
          backgroundColor: colors.background,
        },
      })}
    >
      <Tabs.Screen name="map" options={{ title: 'Mapa' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reportes' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: Platform.OS === 'android' ? 14 : 15,
    textAlign: 'center',
    includeFontPadding: false,
  },
});