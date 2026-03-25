'use client';

import { useState } from 'react';
import { usePOS } from '@/lib/pos-context';
import { generateId, User } from '@/lib/pos-store';
import { Search, Plus, Edit2, Trash2, X, Check, Shield, UserCircle } from 'lucide-react';
import { FormField } from './products-screen';

export function UsersScreen() {
  const { state, dispatch } = usePOS();
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = state.users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  if (showForm) {
    return (
      <UserForm
        user={editUser}
        onSave={(u) => { dispatch({ type: 'SAVE_USER', user: u }); setShowForm(false); }}
        onClose={() => setShowForm(false)}
      />
    );
  }

  const ROLE_COLORS = {
    admin: { bg: 'bg-destructive/15', text: 'text-destructive' },
    manager: { bg: 'bg-warning/15', text: 'text-warning' },
    staff: { bg: 'bg-primary/15', text: 'text-primary' },
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex gap-2 px-4 pt-4 pb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <button
          onClick={() => { setEditUser(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-3 bg-primary rounded-xl text-primary-foreground text-sm font-medium shrink-0"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
        {filtered.map(user => {
          const rc = ROLE_COLORS[user.role];
          const isCurrent = user.id === state.currentUser?.id;
          return (
            <div key={user.id} className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                <UserCircle className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-foreground font-medium text-sm">{user.name}</p>
                  {isCurrent && <span className="text-xs text-primary">(You)</span>}
                </div>
                <p className="text-muted-foreground text-xs">@{user.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${rc.bg} ${rc.text}`}>
                    {user.role}
                  </span>
                  {!user.active && <span className="px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">Inactive</span>}
                </div>
              </div>
              {!isCurrent && (
                <div className="flex gap-1">
                  <button onClick={() => { setEditUser(user); setShowForm(true); }} className="p-2 rounded-lg bg-secondary">
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => dispatch({ type: 'DELETE_USER', id: user.id })} className="p-2 rounded-lg bg-destructive/15">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UserForm({
  user, onSave, onClose,
}: { user: User | null; onSave: (u: User) => void; onClose: () => void }) {
  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'manager' | 'staff'>(user?.role ?? 'staff');
  const [active, setActive] = useState(user?.active ?? true);

  function handleSave() {
    if (!name.trim() || !username.trim()) return;
    onSave({
      id: user?.id ?? generateId(),
      name: name.trim(),
      username: username.trim(),
      password: password || user?.password || '1234',
      role,
      active,
      createdAt: user?.createdAt ?? new Date().toISOString().split('T')[0],
    });
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button onClick={onClose} className="p-2 rounded-xl bg-secondary"><X className="w-4 h-4 text-foreground" /></button>
        <h2 className="font-bold text-foreground text-lg">{user ? 'Edit User' : 'New User'}</h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <FormField label="Full Name *">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
            className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </FormField>
        <FormField label="Username *">
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="username"
            className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </FormField>
        <FormField label={user ? 'New Password (leave blank to keep)' : 'Password'}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={user ? '••••••••' : 'Set password'}
            className="w-full px-4 py-3 bg-secondary border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </FormField>
        <FormField label="Role">
          <div className="grid grid-cols-3 gap-2">
            {(['admin', 'manager', 'staff'] as const).map(r => (
              <button key={r} onClick={() => setRole(r)}
                className={`py-3 rounded-xl text-sm font-medium capitalize transition-all ${role === r ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground border border-border'}`}>
                {r}
              </button>
            ))}
          </div>
        </FormField>
        <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3">
          <div>
            <p className="text-foreground text-sm font-medium">Active</p>
            <p className="text-muted-foreground text-xs">User can log in</p>
          </div>
          <button
            onClick={() => setActive(!active)}
            className={`w-12 h-6 rounded-full transition-all ${active ? 'bg-primary' : 'bg-muted'} relative`}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-foreground transition-all ${active ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
      <div className="px-4 pb-6 pt-3">
        <button onClick={handleSave}
          className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base active:scale-98 transition-all shadow-lg shadow-primary/20">
          <span className="flex items-center justify-center gap-2"><Check className="w-5 h-5" /> Save User</span>
        </button>
      </div>
    </div>
  );
}
