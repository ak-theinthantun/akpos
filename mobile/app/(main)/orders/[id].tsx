import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { salesRepository } from '@/db/repositories/sales-repository';
import type { Sale } from '@/types/domain';

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()} Ks`;
}

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const [sale, setSale] = useState<Sale | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!params.id || typeof params.id !== 'string') {
      setIsLoading(false);
      return;
    }

    salesRepository.getById(params.id)
      .then((result) => {
        if (mounted) setSale(result);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [params.id]);

  const itemCount = useMemo(
    () => sale?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [sale]
  );
  const balanceDue = useMemo(
    () => sale ? Math.max(0, sale.total - sale.amountPaid) : 0,
    [sale]
  );

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f4' }}>
        <ActivityIndicator color="#16a34a" />
        <Text style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>Loading order...</Text>
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f4', padding: 16, justifyContent: 'center' }}>
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 18 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#171717' }}>Order not found</Text>
          <Text style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>This sale is not available in local storage.</Text>
          <Pressable onPress={() => router.replace('/(main)/orders')} style={{ marginTop: 14, borderRadius: 12, backgroundColor: '#16a34a', paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>Back to Orders</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f4' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717' }}>Order Detail</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>{sale.receiptNo}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', overflow: 'hidden' }}>
          <View style={{ paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#fafaf9' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#171717', textAlign: 'center' }}>AKPOS</Text>
            <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>Local receipt preview</Text>
          </View>

          <View style={{ padding: 14, gap: 6 }}>
            <DetailRow label="Receipt" value={sale.receiptNo} />
            <DetailRow label="Date" value={`${sale.date} ${sale.time}`} />
            <DetailRow label="Items" value={String(itemCount)} />
            <DetailRow label="Payment" value={sale.paymentMethod === 'debt' ? 'Credit Sale' : 'Cash'} />
            <DetailRow label="Status" value={sale.status} />
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: '#e7e5e4', padding: 14 }}>
            {sale.items.map((item, index) => (
              <View key={`${item.productId}-${index}`} style={{ paddingBottom: 10, marginBottom: 10, borderBottomWidth: index === sale.items.length - 1 ? 0 : 1, borderBottomColor: '#f1f5f9' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#171717' }}>{item.productName}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>{item.quantity} x {formatCurrency(item.unitPrice)}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#171717' }}>{formatCurrency(item.total)}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: '#e7e5e4', padding: 14, gap: 6, backgroundColor: '#fafaf9' }}>
            <DetailRow label="Subtotal" value={formatCurrency(sale.subtotal)} />
            <DetailRow label="Total" value={formatCurrency(sale.total)} />
            <DetailRow label="Paid" value={formatCurrency(sale.amountPaid)} />
            <DetailRow label="Change" value={formatCurrency(sale.change)} />
            {balanceDue > 0 ? <DetailRow label="Balance Due" value={formatCurrency(balanceDue)} /> : null}
          </View>
        </View>
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderTopColor: '#e7e5e4', backgroundColor: '#ffffff', padding: 16 }}>
        <Pressable onPress={() => router.replace('/(main)/orders')} style={{ borderRadius: 12, backgroundColor: '#16a34a', paddingVertical: 13, alignItems: 'center' }}>
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>Back to Orders</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ fontSize: 12, color: '#6b7280' }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#171717', flexShrink: 1, textAlign: 'right' }}>{value}</Text>
    </View>
  );
}
