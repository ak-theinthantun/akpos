import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { clearCartDraft, getCartDraft, type CartDraft } from '@/store/cart-draft-store';
import { getStoredSession } from '@/store/session-store';
import { salesRepository } from '@/db/repositories/sales-repository';
import { syncQueueRepository } from '@/db/repositories/sync-queue-repository';
import { generateId } from '@/utils/ids';

function formatCurrency(amount: number) {
  return `${amount.toLocaleString()} Ks`;
}

export default function CartReviewScreen() {
  const [draft, setDraft] = useState<CartDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');
  const [amountReceived, setAmountReceived] = useState('');

  useEffect(() => {
    let mounted = true;

    getCartDraft()
      .then((nextDraft) => {
        if (mounted) {
          setDraft(nextDraft);
          setAmountReceived(String(nextDraft?.total ?? 0));
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const itemCount = useMemo(
    () => draft?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
    [draft]
  );
  const total = draft?.total ?? 0;
  const amountReceivedNumber = Math.max(0, Number(amountReceived || 0));
  const remaining = Math.max(0, total - amountReceivedNumber);
  const change = Math.max(0, amountReceivedNumber - total);
  const isCreditSale = !!draft?.customer && remaining > 0;
  const canSaveSale = !!draft && draft.items.length > 0 && (draft.customer ? amountReceivedNumber >= 0 : amountReceivedNumber >= total);

  async function handleSaveSale() {
    if (!draft || draft.items.length === 0 || !canSaveSale) return;

    const session = await getStoredSession();
    const now = new Date();
    const saleId = generateId('sale');
    const receiptNo = `M-${Date.now().toString().slice(-6)}`;
    const paymentMethod: 'cash' | 'debt' = isCreditSale ? 'debt' : 'cash';
    const sale = {
      id: saleId,
      receiptNo,
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString(),
      sessionId: null,
      customerId: draft.customer?.id ?? null,
      staffId: session.userId ?? 'u1',
      subtotal: draft.total,
      discount: 0,
      total: draft.total,
      paymentMethod,
      amountPaid: amountReceivedNumber,
      change,
      status: 'completed' as const,
      items: draft.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        variantLabel: null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
        total: item.total,
      })),
      paymentHistory: [],
    };

    await salesRepository.save(sale);
    await syncQueueRepository.enqueue({
      id: generateId('queue'),
      entityType: 'sale',
      entityId: sale.id,
      operation: 'sale.create',
      payloadJson: JSON.stringify({
        sale,
        saleItems: sale.items,
        payments: [],
        stockMovements: [],
      }),
      deviceId: session.deviceId ?? 'android-dev-1',
      status: 'pending',
      retryCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      syncedAt: null,
      lastError: null,
    });

    await clearCartDraft();
    setSaveMessage(`Saved ${receiptNo} locally and queued for sync.`);
    setTimeout(() => {
      router.replace('/(main)/orders');
    }, 900);
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f4' }}>
        <ActivityIndicator color="#16a34a" />
        <Text style={{ marginTop: 10, fontSize: 13, color: '#6b7280' }}>Loading cart review...</Text>
      </View>
    );
  }

  if (!draft || draft.items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f4', padding: 16, justifyContent: 'center' }}>
        <View style={{ borderRadius: 16, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 18 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#171717' }}>Cart is empty</Text>
          <Text style={{ marginTop: 6, fontSize: 13, color: '#6b7280' }}>Go back to the Sale screen and add products first.</Text>
          <Pressable onPress={() => router.replace('/(main)/sale')} style={{ marginTop: 14, borderRadius: 12, backgroundColor: '#16a34a', paddingVertical: 12, alignItems: 'center' }}>
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>Back to Sale</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f4' }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e7e5e4', backgroundColor: '#ffffff' }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#171717' }}>Cart Review</Text>
        <Text style={{ marginTop: 4, fontSize: 13, color: '#6b7280' }}>{itemCount} items ready for local save.</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 24 }}>
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 14, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280' }}>Customer</Text>
          <Text style={{ marginTop: 6, fontSize: 15, fontWeight: '700', color: '#171717' }}>
            {draft.customer ? `${draft.customer.name} • ${draft.customer.type}` : 'Walk-in customer'}
          </Text>
          {!draft.customer ? (
            <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>Walk-in requires full payment.</Text>
          ) : (
            <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>Registered customer can use credit sale.</Text>
          )}
        </View>

        {draft.items.map((item) => (
          <View key={item.productId} style={{ borderRadius: 14, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', padding: 14, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#171717' }}>{item.productName}</Text>
                <Text style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>{item.quantity} x {formatCurrency(item.unitPrice)}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#16a34a' }}>{formatCurrency(item.total)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderTopColor: '#e7e5e4', backgroundColor: '#ffffff', padding: 16 }}>
        {saveMessage ? (
          <Text style={{ marginBottom: 10, fontSize: 12, color: '#166534', fontWeight: '600', textAlign: 'center' }}>{saveMessage}</Text>
        ) : null}
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 6 }}>Amount Received</Text>
        <TextInput
          value={amountReceived}
          onChangeText={setAmountReceived}
          keyboardType="numeric"
          placeholder={String(total)}
          style={{ borderRadius: 12, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, fontWeight: '700', color: '#171717', marginBottom: 10 }}
        />
        <View style={{ borderRadius: 12, borderWidth: 1, borderColor: isCreditSale ? '#facc15' : amountReceivedNumber < total ? '#fca5a5' : '#bbf7d0', backgroundColor: isCreditSale ? '#fef9c3' : amountReceivedNumber < total ? '#fef2f2' : '#f0fdf4', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#171717' }}>
            {isCreditSale
              ? `Credit due: ${formatCurrency(remaining)}`
              : amountReceivedNumber < total
                ? `Remaining: ${formatCurrency(remaining)}`
                : change > 0
                  ? `Change: ${formatCurrency(change)}`
                  : 'Exact amount received'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#171717' }}>Total</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#16a34a' }}>{formatCurrency(draft.total)}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable onPress={() => router.replace('/(main)/sale')} style={{ flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#d6d3d1', backgroundColor: '#ffffff', paddingVertical: 13, alignItems: 'center' }}>
            <Text style={{ color: '#171717', fontWeight: '700' }}>Back</Text>
          </Pressable>
          <Pressable onPress={handleSaveSale} disabled={!canSaveSale} style={{ flex: 1.3, borderRadius: 12, backgroundColor: '#16a34a', paddingVertical: 13, alignItems: 'center', opacity: canSaveSale ? 1 : 0.6 }}>
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>{isCreditSale ? 'Save Credit Sale' : 'Save Local Sale'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
