'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/notification-bell';

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // If nobody's logged in, bounce back to /login.
  // This runs client-side after the page loads, since the token lives in
  // localStorage (via zustand's persist) which isn't available during SSR.
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return null; // brief blank moment while the redirect above fires
  }

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-espresso text-parchment flex flex-col p-6">
        <div className="relative h-10 w-40 mb-10">
          <Image
            src="/logo.png"
            alt="Seyi-Luxe Interior"
            fill
            sizes="160px"
            className="object-contain object-left brightness-0 invert opacity-90"
          />
        </div>
<div className="mb-6"><NotificationBell /></div>

        <nav className="flex-1 space-y-1 text-sm">
          <Link
            href="/dashboard"
            className={`block px-3 py-2 rounded ${
              pathname === '/dashboard'
                ? 'bg-parchment/10'
                : 'hover:bg-parchment/10'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/projects"
            className={`block px-3 py-2 rounded ${
              pathname === '/projects'
                ? 'bg-parchment/10'
                : 'hover:bg-parchment/10'
            }`}
          >
            Projects
          </Link>
          <Link
            href="/admin"
            className={`block px-3 py-2 rounded ${
              pathname === '/admin'
                ? 'bg-parchment/10'
                : 'hover:bg-parchment/10'
            }`}
          >
            Admin
          </Link>
        </nav>

        <div className="border-t border-parchment/20 pt-4 mt-4">
          <p className="text-sm font-medium">{user.fullName}</p>
          <p className="text-xs text-parchment/60 mb-3">{user.email}</p>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full border-parchment/30 text-parchment hover:bg-parchment/10 hover:text-parchment"
          >
            Log out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 bg-parchment p-8 overflow-y-auto">{children}</div>
    </div>
  );
}