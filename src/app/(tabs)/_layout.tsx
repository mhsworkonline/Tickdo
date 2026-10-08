import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import type { ColorValue } from 'react-native';

import { MIN_TOUCH_TARGET } from '@/ui/theme';
import { useColors } from '@/ui/use-colors';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.background, minHeight: MIN_TOUCH_TARGET + 16 },
        tabBarLabelStyle: { fontSize: 14, fontWeight: '600' },
        tabBarAllowFontScaling: true,
      }}>
      <Tabs.Screen name="index" options={{ title: t('tabs.today'), tabBarIcon: icon('today-outline') }} />
      <Tabs.Screen name="medicines" options={{ title: t('tabs.medicines'), tabBarIcon: icon('medkit-outline') }} />
      <Tabs.Screen name="log" options={{ title: t('tabs.log'), tabBarIcon: icon('list-outline') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings'), tabBarIcon: icon('settings-outline') }} />
    </Tabs>
  );
}
