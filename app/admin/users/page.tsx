'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import DashboardShell from '@/components/dashboard-shell';

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'DESIGNER' | 'CLIENT' | 'ADMIN';
  emailVerified: boolean;
  createdAt: string;
};

const ROLE_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Designers', value: 'DESIGNER' },
  { label: 'Clients', value: 'CLIENT' },
  { label: 'Admins', value: 'ADMIN' },
];

function AdminUsersContent() {
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') ?? undefined;
  const [roleFilter, setRoleFilter] = useState<string | undefined>(initialRole);

  const { data: users, isLoading, error } = useQuery<AdminUser[]>({
    queryKey: ['admin-users', roleFilter],
    queryFn: async () => {
      const res = await apiClient.get('/admin/users', {
        params: roleFilter ? { role: roleFilter } : {},
      });
      return res.data;
    },
    enabled: !!user,
  });

  return (
    <DashboardShell>
      <h1 className="text-2xl font-semibold text-espresso mb-1">Users</h1>
      <p className="text-sm text-espresso/60 mb-6">
        Every account across Seyi-Luxe Interior — designers, clients, and admins.
      </p>

      <div className="flex gap-2 mb-6">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setRoleFilter(f.value)}
            className={`text-sm px-3 py-1.5 rounded border transition-colors cursor-pointer ${
              roleFilter === f.value
                ? 'bg-espresso text-parchment border-espresso'
                : 'border-parchment/30 text-espresso hover:bg-parchment/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-espresso/60">Loading users...</p>}

      {error && (
        <p className="text-sm text-red-600">
          Couldn't load users. Check that the API is running.
        </p>
      )}

      {!isLoading && !error && (!users || users.length === 0) && (
        <p className="text-sm text-espresso/60">No users found.</p>
      )}

      {users && users.length > 0 && (
        <div className="overflow-x-auto border border-parchment/20 rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-espresso/50 border-b border-parchment/20 bg-parchment/10">
                <th className="py-2 px-4 font-medium">Name</th>
                <th className="py-2 px-4 font-medium">Email</th>
                <th className="py-2 px-4 font-medium">Role</th>
                <th className="py-2 px-4 font-medium">Verified</th>
                <th className="py-2 px-4 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-parchment/10 hover:bg-parchment/10 transition-colors"
                >
                  <td className="py-2 px-4 text-espresso">{u.fullName}</td>
                  <td className="py-2 px-4 text-espresso/70">{u.email}</td>
                  <td className="py-2 px-4">
                    <span className="text-xs px-2 py-1 rounded bg-espresso/10 text-espresso">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-espresso/60">
                    {u.emailVerified ? 'Yes' : 'No'}
                  </td>
                  <td className="py-2 px-4 text-espresso/60">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardShell>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsersContent />
    </Suspense>
  );
}