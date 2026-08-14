'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/auth/login', data);
      const { accessToken, refreshToken, user } = response.data;
      setAuth(user, accessToken, refreshToken);

      if (user.role === 'DESIGNER') router.push('/dashboard');
      else if (user.role === 'CLIENT') router.push('/projects');
      else router.push('/admin');
    } catch {
      setServerError('Incorrect email or password. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between bg-espresso text-parchment p-12">
        <div className="text-sm tracking-widest uppercase text-brass">
          Design Decision Platform
        </div>
        <div>
          <h1 className="font-display text-5xl leading-tight mb-4">
            Every detail,
            <br />
            reviewed with intent.
          </h1>
          <div className="w-16 h-px bg-brass mb-4" />
          <p className="text-parchment/70 max-w-sm">
            A shared space for designers and clients to review renders,
            compare options, and approve with confidence.
          </p>
        </div>
        <div className="text-xs text-parchment/50">
          &copy; {new Date().getFullYear()}
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-parchment">
        <div className="w-full max-w-sm">
          <Image
  src="/logo.png"
  alt="Seyi-Luxe Interior"
  width={160}
  height={48}
  className="mb-6 h-10 w-auto"
/>
<h2 className="font-display text-3xl mb-1">Sign in</h2>
          <p className="text-ink/60 mb-8 text-sm">
            Enter your details to access your projects.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                aria-invalid={!!errors.email}
              />
              {errors.email && (
                <p className="text-sm text-red-700">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                aria-invalid={!!errors.password}
              />
              {errors.password && (
                <p className="text-sm text-red-700">{errors.password.message}</p>
              )}
            </div>

            {serverError && (
              <p className="text-sm text-red-700" role="alert">
                {serverError}
              </p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-espresso hover:bg-espresso-light text-parchment"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}