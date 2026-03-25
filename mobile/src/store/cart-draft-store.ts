import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartDraftItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CartDraftCustomer {
  id: string;
  name: string;
  type: 'regular' | 'wholesale';
}

export interface CartDraft {
  customer: CartDraftCustomer | null;
  items: CartDraftItem[];
  total: number;
  updatedAt: string;
}

const CART_DRAFT_KEY = 'akpos.cart-draft';

export async function setCartDraft(draft: CartDraft) {
  await AsyncStorage.setItem(CART_DRAFT_KEY, JSON.stringify(draft));
}

export async function getCartDraft(): Promise<CartDraft | null> {
  const raw = await AsyncStorage.getItem(CART_DRAFT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as CartDraft;
  } catch {
    return null;
  }
}

export async function clearCartDraft() {
  await AsyncStorage.removeItem(CART_DRAFT_KEY);
}
