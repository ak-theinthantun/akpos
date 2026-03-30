import { View, Text } from 'react-native';

export function DataStatusCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string }>;
}) {
  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#171717', marginBottom: 6 }}>{title}</Text>
      {rows.map((row) => (
        <Text key={row.label} style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>
          {row.label}: <Text style={{ fontWeight: '700', color: '#171717' }}>{row.value}</Text>
        </Text>
      ))}
    </View>
  );
}
