import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { customersRepository } from '@/db/repositories/customers-repository';
import { AppSectionNav } from '@/components/app-section-nav';
import type { Customer } from '@/types/domain';

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'regular' | 'wholesale'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    customersRepository
      .list()
      .then((rows) => {
        if (!mounted) return;
        setCustomers(rows);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      if (typeFilter !== 'all' && customer.type !== typeFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [customer.name, customer.phone, customer.notes]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [customers, search, typeFilter]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f4' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717' }}>Customers</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>Offline customer list synced from the server.</Text>
        <AppSectionNav current="customers" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 12 }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search customer or phone"
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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, marginTop: 10 }}
          >
            {[
              { key: 'all', label: 'All' },
              { key: 'regular', label: 'Regular' },
              { key: 'wholesale', label: 'Wholesale' },
            ].map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setTypeFilter(item.key as typeof typeFilter)}
                style={{
                  borderWidth: 1,
                  borderColor: typeFilter === item.key ? '#16a34a' : '#d6d3d1',
                  backgroundColor: typeFilter === item.key ? '#dcfce7' : '#ffffff',
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: typeFilter === item.key ? '#166534' : '#171717' }}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={{ marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#fafaf9' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#171717' }}>
              {filteredCustomers.length} customers
            </Text>
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color="#16a34a" />
              <Text style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>Loading offline customers...</Text>
            </View>
          ) : filteredCustomers.length > 0 ? (
            filteredCustomers.map((customer, index) => (
              <View
                key={customer.id}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderTopWidth: index === 0 ? 0 : 1,
                  borderTopColor: '#f0ece7',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#171717' }}>{customer.name}</Text>
                    <Text style={{ marginTop: 3, fontSize: 12, color: '#6b7280' }}>
                      {customer.phone || 'No phone'}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      backgroundColor: customer.type === 'wholesale' ? '#dbeafe' : '#f3f4f6',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: customer.type === 'wholesale' ? '#1d4ed8' : '#374151' }}>
                      {customer.type === 'wholesale' ? 'Wholesale' : 'Regular'}
                    </Text>
                  </View>
                </View>

                {customer.notes ? (
                  <Text style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>{customer.notes}</Text>
                ) : null}
              </View>
            ))
          ) : (
            <View style={{ paddingHorizontal: 14, paddingVertical: 18 }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>No customers matched this filter.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
