import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';

type SectionKey = 'sale' | 'products' | 'orders' | 'reports' | 'settings';

const sections: Array<{ key: SectionKey; label: string; href: string }> = [
  { key: 'sale', label: 'Sale', href: '/(main)/sale' },
  { key: 'products', label: 'Products', href: '/(main)/products' },
  { key: 'orders', label: 'Orders', href: '/(main)/orders' },
  { key: 'reports', label: 'Reports', href: '/(main)/reports' },
  { key: 'settings', label: 'Settings', href: '/(main)/settings' },
];

export function AppSectionNav({ current }: { current: SectionKey }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
      {sections.map((section) =>
        section.key === current ? (
          <View
            key={section.key}
            style={{
              borderRadius: 999,
              backgroundColor: '#dcfce7',
              borderWidth: 1,
              borderColor: '#16a34a',
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534' }}>{section.label}</Text>
          </View>
        ) : (
          <Pressable
            key={section.key}
            onPress={() => router.replace(section.href)}
            style={{
              borderRadius: 999,
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: '#d6d3d1',
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#171717' }}>{section.label}</Text>
          </Pressable>
        )
      )}
    </View>
  );
}
