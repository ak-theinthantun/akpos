'use client';

import React, { createContext, useContext, useReducer } from 'react';
import { POSState, POSAction, initialState, posReducer } from '@/lib/pos-store';

interface POSContextValue {
  state: POSState;
  dispatch: React.Dispatch<POSAction>;
}

const POSContext = createContext<POSContextValue | null>(null);

export function POSProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(posReducer, initialState);
  return (
    <POSContext.Provider value={{ state, dispatch }}>
      {children}
    </POSContext.Provider>
  );
}

export function usePOS() {
  const ctx = useContext(POSContext);
  if (!ctx) throw new Error('usePOS must be used inside POSProvider');
  return ctx;
}
