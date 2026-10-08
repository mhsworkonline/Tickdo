import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(active: IconName, inactive: IconName) {
  return function TabIcon({ color, focused }: { color: ColorValue; size: number; focused: boolean }) {
    return <Ionicons name={focused ? active : inactive} color={color} size={26} />;
  };
}

export default function TabsLayout() {
  const { t, i18n } = useTranslation();
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: 68 + insets.bottom,
          paddingTop: 8,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: i18n.language === 'hi' ? { fontSize: 14, fontWeight: '600' } : { fontFamily: fonts.bodySemi, fontSize: 14 },
        tabBarAllowFontScaling: true,
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.today'), tabBarIcon: icon('today', 'today-outline') }} />
      <Tabs.Screen name="medicines" options={{ title: t('tabs.medicines'), tabBarIcon: icon('medkit', 'medkit-outline') }} />
      <Tabs.Screen name="log" options={{ title: t('tabs.log'), tabBarIcon: icon('calendar', 'calendar-outline') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: icon('settings', 'settings-outline') }} />
    </Tabs>
  );
}
