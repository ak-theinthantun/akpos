'use client';

import { useState } from 'react';
import { usePOS } from '@/lib/pos-context';
import { generateId, Customer, formatCurrency } from '@/lib/pos-store';
import { Search, Plus, Edit2, Trash2, X, Check, User, Phone } from 'lucide-react';
import { FormField } from './products-screen';

export function CustomersScreen() {
  const { state, dispatch } = usePOS();
  const [search, setSearch] = useState('');
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);

  const isAdmin = state.currentUser?.role === 'admin';

  const filtered = state.customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  if (showForm) {
    return (
      <CustomerForm
        customer={editCustomer}
        onSave={(c) => { dispatch({ type: 'SAVE_CUSTOMER', customer: c }); setShowForm(false); }}
        onClose={() => setShowForm(false)}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex gap-2 px-4 pt-4 pb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditCustomer(null); setShowForm(true); }}
            className="flex items-center gap-1.5 px-4 py-3 bg-primary rounded-xl text-primary-foreground text-sm font-medium shrink-0"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <User className="w-12 h-12 text-muted-foreground mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">No customers found</p>
          </div>
        ) : (
          filtered.map(customer => {
            const purchaseHistory = state.sales.filter(s => s.customerId === customer.id && s.status === 'completed');
            const totalSpent = purchaseHistory.reduce((s, sale) => s + sale.total, 0);
            const creditSales = purchaseHistory
              .map(sale => {
                const amountPaid = sale.amountPaid ?? 0;
                return {
                  ...sale,
                  amountPaid,
                  balanceDue: Math.max(0, sale.total - amountPaid),
                  paymentHistory: sale.paymentHistory ?? [],
                };
              })
              .filter(sale => sale.paymentMethod === 'debt');
            const outstandingCredit = creditSales.reduce((sum, sale) => sum + sale.balanceDue, 0);
            const totalReceived = creditSales.reduce((sum, sale) => sum + (sale.amountPaid ?? 0), 0);
            const paymentRecords = creditSales
              .flatMap(sale =>
                (sale.paymentHistory ?? []).map(record => ({
                  ...record,
                  receiptNo: sale.receiptNo,
                }))
              )
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            return (
              <div key={customer.id} className="bg-card border border-border rounded-2xl px-4 py-3 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${customer.type === 'wholesale' ? 'bg-chart-4/20' : 'bg-primary/15'}`}>
                    <span className={`text-sm font-bold ${customer.type === 'wholesale' ? 'text-chart-4' : 'text-primary'}`}>
                      {customer.name[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-foreground font-medium text-sm">{customer.name}</p>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${customer.type === 'wholesale' ? 'bg-chart-4/20 text-chart-4' : 'bg-primary/15 text-primary'}`}>
                        {customer.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <p className="text-muted-foreground text-xs">{customer.phone}</p>
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {purchaseHistory.length} orders · {formatCurrency(totalSpent, state.settings.currencySymbol)} spent
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button onClick={() => { setEditCustomer(customer); setShowForm(true); }} className="p-2 rounded-lg bg-secondary">
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => dispatch({ type: 'DELETE_CUSTOMER', id: customer.id })} className="p-2 rounded-lg bg-destructive/15">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  )}
                </div>

                {creditSales.length > 0 && (
                  <div className="rounded-xl bg-card border border-border px-3 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground">Credit Summary</p>
                      <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${
                        outstandingCredit > 0 ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'
                      }`}>
                        {outstandingCredit > 0 ? 'Open Credit' : 'Settled'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-secondary/60 px-3 py-2">
                        <p className="text-muted-foreground">Received</p>
                        <p className="text-foreground font-semibold mt-1">{formatCurrency(totalReceived, state.settings.currencySymbol)}</p>
                      </div>
                      <div className="rounded-lg bg-secondary/60 px-3 py-2">
                        <p className="text-muted-foreground">Balance</p>
                        <p className={`font-semibold mt-1 ${outstandingCredit > 0 ? 'text-warning' : 'text-success'}`}>
                          {formatCurrency(outstandingCredit, state.settings.currencySymbol)}
                        </p>
                      </div>
                    </div>
                    {paymentRecords.length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <p className="text-xs font-semibold text-muted-foreground">Payment Records</p>
                        {paymentRecords.map(record => (
                          <div key={record.id} className="flex items-start justify-between gap-3 rounded-lg bg-secondary/40 px-3 py-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground">{record.date}</p>
                              <p className="text-xs text-muted-foreground">Receipt {record.receiptNo}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {record.remark || 'No remark'}
                              </p>
                            </div>
                            <p className="shrink-0 text-xs font-semibold text-success">
                              {formatCurrency(record.amount, state.settings.currencySymbol)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No payment records yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CustomerForm({
  customer, onSave, onClose,
}: { customer: Customer | null; onSave: (c: Customer) => void; onClose: () => void }) {
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [type, setType] = useState<'regular' | 'wholesale'>(customer?.type ?? 'regular');
  const [notes, setNotes] = useState(customer?.notes ?? '');

  function handleSave() {
    if (!name.trim()) return;
    onSave({
      id: customer?.id ?? generateId(),
      name: name.trim(),
      phone: phone.trim(),
      type,
      notes: notes.trim(),
      active: customer?.active ?? true,
      createdAt: customer?.createdAt ?? new Date().toISOString().split('T')[0],
    });
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button onClick={onClose} className="p-2 rounded-xl bg-secondary"><X className="w-4 h-4 text-foreground" /></button>
        <h2 className="font-bold text-foreground text-lg">{customer ? 'Edit Customer' : 'New Customer'}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <FormField label="Name *">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Customer name"
            className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </FormField>
        <FormField label="Phone">
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="09-xxx-xxxx"
            className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </FormField>
        <FormField label="Customer Type">
          <div className="flex gap-2">
            {(['regular', 'wholesale'] as const).map(t => (
              <button key={t} onClick={() => setType(t)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium capitalize transition-all ${type === t ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground border border-border'}`}>
                {t}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="Notes">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." rows={3}
            className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
        </FormField>
      </div>
      <div className="px-4 pb-6 pt-3">
        <button onClick={handleSave}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base active:scale-98 transition-all shadow-lg shadow-primary/20">
          <span className="flex items-center justify-center gap-2"><Check className="w-5 h-5" /> Save Customer</span>
        </button>
      </div>
    </div>
  );
}
