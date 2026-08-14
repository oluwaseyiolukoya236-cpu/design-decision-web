'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import DashboardShell from '@/components/dashboard-shell';
import { Button } from '@/components/ui/button';

type Project = {
  id: string;
  name: string;
  location: string | null;
  status: string;
  createdAt: string;
  images: unknown[];
};

export default function ProjectsPage() {
  const user = useAuthStore((s) => s.user);

  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await apiClient.get('/projects');
      return res.data;
    },
    enabled: !!user,
  });

  return (
    <DashboardShell>
      <h1 className="text-2xl font-semibold text-espresso mb-1">Projects</h1>
      <p className="text-sm text-espresso/60 mb-6">
        All projects across Seyi-Luxe Interior.
      </p>

      <div className="mb-6">
        <Link href="/projects/new">
          <Button>New Project</Button>
        </Link>
      </div>

      {isLoading && <p className="text-sm text-espresso/60">Loading projects...</p>}

      {error && (
        <p className="text-sm text-red-600">
          Something went wrong loading projects. Check that the API is running.
        </p>
      )}

      {!isLoading && !error && (!projects || projects.length === 0) && (
        <div className="border border-parchment/20 rounded p-8 text-center text-espresso/60">
          No projects yet. Create one via the API or Swagger to see it here.
        </div>
      )}

      {!isLoading && !error && projects && projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block border border-parchment/20 rounded p-4 hover:bg-parchment/10 transition-colors"
            >
              <p className="font-medium text-espresso">{project.name}</p>
              <p className="text-sm text-espresso/60">{project.location ?? 'No location set'}</p>
              <p className="text-xs mt-2 inline-block px-2 py-1 rounded bg-espresso/10 text-espresso hover:bg-espresso/20 transition-colors">
                {project.status}
              </p>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}