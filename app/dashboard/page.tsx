'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import DashboardShell from '@/components/dashboard-shell';
import { useAuthStore } from '@/lib/auth-store';

type Project = {
  id: string;
  name: string;
  location: string | null;
  status: string;
  createdAt: string;
  images: unknown[];
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiClient.get('/projects');
      return res.data;
    },
    enabled: !!user, // don't fetch until we know who's logged in
  });

  const stats = {
    total: projects?.length ?? 0,
    inReview: projects?.filter((p) => p.status === 'IN_REVIEW').length ?? 0,
    approved: projects?.filter((p) => p.status === 'APPROVED').length ?? 0,
  };

  return (
    <DashboardShell>
      <h1 className="font-display text-3xl mb-1">
        Welcome back{user ? `, ${user.fullName.split(' ')[0]}` : ''}
      </h1>
      <p className="text-ink/60 mb-8">Here's what's happening across your projects.</p>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Total Projects" value={stats.total} />
        <StatCard label="Pending Review" value={stats.inReview} />
        <StatCard label="Approved" value={stats.approved} />
      </div>

      {/* Project list */}
      <h2 className="font-display text-xl mb-4">Recent Projects</h2>

      {isLoading && <p className="text-ink/60">Loading projects…</p>}
      {error && (
        <p className="text-red-700">Couldn't load projects. Is the backend running?</p>
      )}

      {projects && projects.length === 0 && (
        <div className="border border-ink/10 rounded p-8 text-center text-ink/60">
          No projects yet. Create one via the API or Swagger to see it here.
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border border-ink/10 rounded p-4 flex items-center justify-between bg-white/40"
            >
              <div>
                <p className="font-medium">{project.name}</p>
                <p className="text-sm text-ink/60">{project.location ?? 'No location set'}</p>
              </div>
              <span className="text-xs uppercase tracking-wide px-2 py-1 bg-brass/20 text-brass-dark rounded">
                {project.status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-ink/10 rounded p-5 bg-white/40">
      <p className="text-sm text-ink/60 mb-1">{label}</p>
      <p className="font-display text-3xl">{value}</p>
    </div>
  );
}