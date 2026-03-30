import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native';
import { AppSectionNav } from '@/components/app-section-nav';
import { suppliersRepository } from '@/db/repositories/suppliers-repository';
import type { Supplier } from '@/types/domain';

export default function SuppliersScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    suppliersRepository
      .list()
      .then((rows) => {
        if (!mounted) return;
        setSuppliers(rows);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.name, supplier.phone, supplier.notes].join(' ').toLowerCase().includes(query)
    );
  }, [suppliers, search]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f4' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717' }}>Suppliers</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Offline supplier list synced from the server.</Text>
        <AppSectionNav current="suppliers" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 12 }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search supplier or phone"
            placeholderTextColor="#a8a29e"
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#d6d3d1',
              backgroundColor: '#fafaf9',
              paddingHorizontal: 12,
              paddingVertical: 10,
              fontSize: 14,
              color: '#171717',
            }}
          />
        </View>

        <View style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#fafaf9' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#171717' }}>
              {filteredSuppliers.length} suppliers
            </Text>
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#16a34a" />
              <Text style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>Loading offline suppliers...</Text>
            </View>
          ) : filteredSuppliers.length > 0 ? (
            filteredSuppliers.map((supplier, index) => (
              <View
                key={supplier.id}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: '#f0ece7',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#171717' }}>{supplier.name}</Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>{supplier.phone || 'No phone'}</Text>
                {supplier.notes ? (
                  <Text style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>{supplier.notes}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <View style={{ paddingHorizontal: 14, paddingVertical: 18 }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>No suppliers matched this search.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
