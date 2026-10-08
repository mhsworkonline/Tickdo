import { useColorScheme } from 'react-native';

import { medicineColors, palette, type Colors } from '@/ui/theme';

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? palette.dark : palette.light;
}

export function useMedicineColor(index: number): { bg: string; fg: string } {
  const set = useColorScheme() === 'dark' ? medicineColors.dark : medicineColors.light;
  const [bg, fg] = set[Math.abs(index) % set.length] ?? set[0];
  return { bg, fg };
}
