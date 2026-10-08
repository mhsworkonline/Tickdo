import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { format12h } from '@/domain/time';
import { Button } from '@/ui/Button';

/**
 * Lets the user choose a clock time (interpreted as IST wall-clock time).
 * Shows "Choose time" until a time is chosen — Tickdo never pre-fills reminder times.
 */
export function TimePickerButton({
  value,
  onChange,
  placeholder,
  accessibilityLabel,
}: {
  value: number | null;
  onChange: (minutes: number) => void;
  placeholder: string;
  accessibilityLabel: string;
}) {
  const [iosOpen, setIosOpen] = useState(false);
  const initial = () => {
    const d = new Date();
    if (value !== null) d.setHours(Math.floor(value / 60), value % 60, 0, 0);
    return d;
  };
  const pick = (d: Date | undefined) => {
    if (d) onChange(d.getHours() * 60 + d.getMinutes());
  };

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial(),
        mode: 'time',
        is24Hour: false,
        onChange: (event, date) => {
          if (event.type === 'set') pick(date);
        },
      });
    } else {
      setIosOpen((o) => !o);
    }
  };

  return (
    <View>
      <Button
        label={value === null ? placeholder : format12h(value)}
        icon={value === null ? 'time-outline' : 'alarm'}
        variant={value === null ? 'secondary' : 'soft'}
        compact
        accessibilityHint={accessibilityLabel}
        onPress={open}
      />
      {iosOpen && Platform.OS === 'ios' ? (
        <DateTimePicker value={initial()} mode="time" display="spinner" onChange={(_, d) => pick(d)} />
      ) : null}
    </View>
  );
}
