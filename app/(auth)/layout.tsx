// ============================================================
// app/(auth)/layout.tsx — Shared layout cho các trang Auth
// ============================================================

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    template: '%s | Phụ Tùng Xe Máy',
    default: 'Đăng nhập | Phụ Tùng Xe Máy',
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-3 group">
            <img
              src="/brand-logo.png"
              alt="Phụ Tùng Xe Máy"
              className="w-12 h-12 rounded-xl object-cover shadow-lg shadow-orange-500/30 group-hover:scale-105 transition-transform"
            />
            <div className="text-left">
              <p className="text-white font-bold text-xl leading-tight">Phụ Tùng Xe Máy</p>
              <p className="text-orange-300 text-xs">phutungxemay.store</p>
            </div>
          </a>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs mt-6">
          © 2024 Phụ Tùng Xe Máy. Tất cả quyền được bảo lưu.
        </p>
      </div>
    </div>
  );
}
