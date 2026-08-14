'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import DashboardShell from '@/components/dashboard-shell';

type AdminProject = {
  id: string;
  name: string;
  location: string | null;
  status: string;
  createdAt: string;
  designer: {
    id: string;
    fullName: string;
    email: string;
  };
  images: { id: string }[];
};

const STATUS_FILTERS = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'In Review', value: 'IN_REVIEW' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Archived', value: 'ARCHIVED' },
];

function AdminProjectsContent() {
  const user = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') ?? undefined;
  const [statusFilter, setStatusFilter] = useState<string | undefined>(initialStatus);

  const { data: projects, isLoading, error } = useQuery<AdminProject[]>({
    queryKey: ['admin-projects', statusFilter],
    queryFn: async () => {
      const res = await apiClient.get('/admin/projects', {
        params: statusFilter ? { status: statusFilter } : {},
      });
      return res.data;
    },
    enabled: !!user,
  });

  return (
    <DashboardShell>
      <h1 className="text-2xl font-semibold text-espresso mb-1">Projects</h1>
      <p className="text-sm text-espresso/60 mb-6">
        Every project across Seyi-Luxe Interior, regardless of designer.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`text-sm px-3 py-1.5 rounded border transition-colors cursor-pointer ${
              statusFilter === f.value
                ? 'bg-espresso text-parchment border-espresso'
                : 'border-parchment/30 text-espresso hover:bg-parchment/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-espresso/60">Loading projects...</p>}

      {error && (
        <p className="text-sm text-red-600">
          Couldn't load projects. Check that the API is running.
        </p>
      )}

      {!isLoading && !error && (!projects || projects.length === 0) && (
        <p className="text-sm text-espresso/60">No projects found.</p>
      )}

      {projects && projects.length > 0 && (
        <div className="overflow-x-auto border border-parchment/20 rounded">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-espresso/50 border-b border-parchment/20 bg-parchment/10">
                <th className="py-2 px-4 font-medium">Project</th>
                <th className="py-2 px-4 font-medium">Designer</th>
                <th className="py-2 px-4 font-medium">Status</th>
                <th className="py-2 px-4 font-medium">Images</th>
                <th className="py-2 px-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-parchment/10 hover:bg-parchment/10 transition-colors"
                >
                  <td className="py-2 px-4">
                    <Link
                      href={`/projects/${p.id}`}
                      className="text-espresso hover:underline cursor-pointer"
                    >
                      {p.name}
                    </Link>
                    {p.location && (
                      <p className="text-xs text-espresso/50">{p.location}</p>
                    )}
                  </td>
                  <td className="py-2 px-4 text-espresso/70">{p.designer.fullName}</td>
                  <td className="py-2 px-4">
                    <span className="text-xs px-2 py-1 rounded bg-espresso/10 text-espresso">
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-espresso/60">{p.images.length}</td>
                  <td className="py-2 px-4 text-espresso/60">
                    {new Date(p.createdAt).toLocaleDateString()}
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

export default function AdminProjectsPage() {
  return (
    <Suspense fallback={null}>
      <AdminProjectsContent />
    </Suspense>
  );
}