'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import DashboardShell from '@/components/dashboard-shell';
import { Button } from '@/components/ui/button';

export default function NewProjectPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/projects', {
        name,
        location: location || undefined,
        description: description || undefined,
        designerId: user?.id,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
      return res.data;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      router.push(`/projects/${project.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    mutation.mutate();
  };

  return (
    <DashboardShell>
      <h1 className="text-2xl font-semibold text-espresso mb-1">New Project</h1>
      <p className="text-sm text-espresso/60 mb-6">
        Create a new project for a client.
      </p>

      <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
        <div>
          <label className="block text-sm font-medium text-espresso mb-1">
            Project name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border border-parchment/30 rounded px-3 py-2 bg-white text-espresso"
            placeholder="e.g. Adebajo Residence"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-espresso mb-1">
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full border border-parchment/30 rounded px-3 py-2 bg-white text-espresso"
            placeholder="e.g. Lekki Phase 1, Lagos"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-espresso mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-parchment/30 rounded px-3 py-2 bg-white text-espresso"
            placeholder="Brief description of the project"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-espresso mb-1">
            Deadline
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full border border-parchment/30 rounded px-3 py-2 bg-white text-espresso"
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-red-600">
            Something went wrong creating the project. Please try again.
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create Project'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/projects')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </DashboardShell>
  );
}