import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '@/theme/colors';

type Props = {
  dateFrom: string;
  dateTo: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
};

export function DateRangeFields({ dateFrom, dateTo, onChangeFrom, onChangeTo }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.field}>
        <Text style={styles.label}>Fecha desde</Text>
        <TextInput
          value={dateFrom}
          onChangeText={onChangeFrom}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Fecha hasta</Text>
        <TextInput
          value={dateTo}
          onChangeText={onChangeTo}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          autoCapitalize="none"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  field: {
    flex: 1,
    minWidth: 180,
    gap: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
});
