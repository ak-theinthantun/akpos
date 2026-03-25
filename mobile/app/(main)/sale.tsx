import { View, Text, Pressable, ScrollView } from 'react-native';

const placeholderProducts = [
  { id: '1', name: 'Coca Cola', price: '1,200 Ks' },
  { id: '2', name: 'Lays Chips', price: '650 Ks' },
  { id: '3', name: 'Shampoo', price: '4,500 Ks' },
  { id: '4', name: 'Noodle Pack', price: '900 Ks' },
];

export default function SaleScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f4' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717' }}>AKPOS Sale</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Expo mobile scaffold for the offline POS flow.</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {placeholderProducts.map(product => (
            <Pressable
              key={product.id}
              style={{
                width: '48%',
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#d6d3d1',
                borderRadius: 10,
                padding: 10,
              }}
            >
              <View style={{ aspectRatio: 1, backgroundColor: '#f5f5f4', marginBottom: 8, borderRadius: 8 }} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#171717' }}>{product.name}</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: '#16a34a', fontWeight: '600' }}>{product.price}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderTopColor: '#e7e5e4', backgroundColor: '#ffffff', padding: 16 }}>
        <Pressable style={{ borderRadius: 14, backgroundColor: '#16a34a', paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>Review Cart</Text>
        </Pressable>
      </View>
    </View>
  );
}
