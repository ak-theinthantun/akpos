'use client';

import { useState } from 'react';
import { usePOS } from '@/lib/pos-context';
import { ShoppingBag, Eye, EyeOff, Lock, User } from 'lucide-react';

export function LoginScreen() {
  const { state, dispatch } = usePOS();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  function handleLogin() {
    const user = state.users.find(
      u => u.username === username && u.password === password && u.active
    );
    if (user) {
      dispatch({ type: 'LOGIN', user });
      setError('');
    } else {
      setError('Invalid username or password.');
    }
  }

  const inputCls = 'w-full pl-10 pr-4 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all';

  return (
    <div className="flex flex-col flex-1 overflow-y-auto bg-background">
      {/* Top decorative band */}
      <div className="h-36 bg-primary/8 flex items-end justify-center pb-0 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-primary/8" />
        <div className="absolute -top-4 -left-10 w-28 h-28 rounded-full bg-primary/6" />
      </div>

      {/* Logo card — overlaps the band */}
      <div className="flex flex-col items-center -mt-10 px-6 pb-8">
        <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center mb-4 shadow-xl shadow-primary/30">
          <ShoppingBag className="w-10 h-10 text-white" strokeWidth={1.8} />
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">AKPOS</h1>
        <p className="text-muted-foreground text-sm mt-1">Point of Sale System</p>
      </div>

      {/* Form */}
      <div className="px-5 space-y-3 pb-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Username</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              className={inputCls}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block uppercase tracking-wide">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full pl-10 pr-10 py-3 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <button
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 py-3 bg-destructive/8 border border-destructive/25 rounded-xl">
            <p className="text-destructive text-sm font-medium">{error}</p>
          </div>
        )}

        <button
          onClick={handleLogin}
          className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-primary/25 mt-2"
        >
          Sign In
        </button>
      </div>

      {/* Quick login hints */}
      <div className="px-5 pb-6">
        <p className="text-muted-foreground text-xs font-medium mb-2 text-center uppercase tracking-wide">Demo accounts</p>
        <div className="flex gap-2">
          {[{ user: 'admin', pw: '1234', label: 'Admin', color: 'bg-destructive/8 border-destructive/20 text-destructive' },
            { user: 'staff', pw: '1234', label: 'Staff', color: 'bg-primary/8 border-primary/20 text-primary' }
          ].map(({ user, pw, label, color }) => (
            <button
              key={user}
              onClick={() => { setUsername(user); setPassword(pw); }}
              className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all active:scale-[0.97] ${color}`}
            >
              {label} / {pw}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
