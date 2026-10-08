import { useColorScheme } from 'react-native';

import { palette, type Colors } from '@/ui/theme';

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}
