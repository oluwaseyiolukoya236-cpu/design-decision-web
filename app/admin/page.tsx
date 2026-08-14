'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import DashboardShell from '@/components/dashboard-shell';

type AdminStats = {
  users: {
    total: number;
    designers: number;
    clients: number;
    admins: number;
  };
  projects: {
    total: number;
    draft: number;
    active: number;
    inReview: number;
    approved: number;
    archived: number;
  };
  totalReviews: number;
  totalComments: number;
  totalImages: number;
};

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div className="border border-parchment/20 rounded p-4 hover:bg-parchment/10 hover:border-espresso/30 transition-all">
      <p className="text-xs text-espresso/60 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-espresso">{value}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block cursor-pointer">
        {content}
      </Link>
    );
  }

  return content;
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, error } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/stats');
      return res.data;
    },
    enabled: !!user,
  });

  return (
    <DashboardShell>
      <h1 className="text-2xl font-semibold text-espresso mb-1">Admin Dashboard</h1>
      <p className="text-sm text-espresso/60 mb-6">
        Studio-wide overview across all projects and users.
      </p>

      {isLoading && <p className="text-sm text-espresso/60">Loading stats...</p>}

      {error && (
        <p className="text-sm text-red-600">
          Couldn't load stats. Check that the API is running.
        </p>
      )}

      {data && (
        <div className="space-y-8">
          <div>
            <h2 className="text-sm font-medium text-espresso mb-3">Users</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total Users" value={data.users.total} href="/admin/users" />
              <StatCard
                label="Designers"
                value={data.users.designers}
                href="/admin/users?role=DESIGNER"
              />
              <StatCard
                label="Clients"
                value={data.users.clients}
                href="/admin/users?role=CLIENT"
              />
              <StatCard
                label="Admins"
                value={data.users.admins}
                href="/admin/users?role=ADMIN"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-espresso mb-3">Projects</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                label="Total Projects"
                value={data.projects.total}
                href="/admin/projects"
              />
              <StatCard
                label="Draft"
                value={data.projects.draft}
                href="/admin/projects?status=DRAFT"
              />
              <StatCard
                label="Active"
                value={data.projects.active}
                href="/admin/projects?status=ACTIVE"
              />
              <StatCard
                label="In Review"
                value={data.projects.inReview}
                href="/admin/projects?status=IN_REVIEW"
              />
              <StatCard
                label="Approved"
                value={data.projects.approved}
                href="/admin/projects?status=APPROVED"
              />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-espresso mb-3">Activity</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard label="Total Images" value={data.totalImages} />
              <StatCard label="Total Reviews" value={data.totalReviews} />
              <StatCard label="Total Comments" value={data.totalComments} />
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}