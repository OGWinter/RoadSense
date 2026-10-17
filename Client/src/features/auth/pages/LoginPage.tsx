import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAppDispatch } from '@/hooks/useRedux';
import { setCredentials } from '@/features/auth/authSlice';
import { authApi } from '@/features/auth/authApi';
import { loginSchema, LoginFormData } from '../schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Lock, Mail, ArrowRight, Loader2, KeyRound, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const LoginPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@roadsense.com',
      password: 'Admin@123',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setApiError(null);

    try {
      const response = await authApi.login(data);
      dispatch(setCredentials({ user: response.user, token: response.token }));
      toast.success(`Welcome, ${response.user.name}`);

      const destination = (location.state as any)?.from?.pathname || '/app/dashboard';
      navigate(destination, { replace: true });
    } catch (err: any) {
      const message =
        err?.message || 'Login failed. Please verify your credentials or server connection.';
      setApiError(message);
      toast.error('Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickEnter = (email: string, pass: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pass, { shouldValidate: true });
    setApiError(null);
    onSubmit({ email, password: pass });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white">Sign In to Command Portal</h2>
        <p className="text-xs text-slate-400">
          Enter your municipal staff or surveyor credentials to access RoadSense.
        </p>
      </div>

      {apiError && (
        <Alert variant="destructive" className="bg-destructive/15 border-destructive/40 text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-sm font-semibold">Authentication Error</AlertTitle>
          <AlertDescription className="text-xs text-red-300 mt-1">
            {apiError}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-slate-300">
            Official Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              id="email"
              type="email"
              placeholder="officer@roadsense.gov"
              className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-primary"
              disabled={isLoading}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-xs font-medium text-slate-300">
              Password
            </Label>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-primary"
              disabled={isLoading}
              {...register('password')}
            />
          </div>
          {errors.password && (
            <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full mt-2 h-10 font-semibold shadow-lg shadow-primary/25"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing In...
            </>
          ) : (
            <>
              Access RoadSense <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>

        <div className="flex items-center justify-end">
          <Link
            to="/forgot-password"
            className="text-[11px] text-slate-400 hover:text-violet-400 transition-colors"
          >
            Forgot password?
          </Link>
        </div>
      </form>

      {/* Officer Pending Note */}
      <div className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <p className="text-[11px] text-amber-300 leading-relaxed">
          <strong>Municipal Officer?</strong> After registration, login is only enabled once an Admin approves your application.
        </p>
      </div>

      {/* 1-Click Fast Track Admin Access */}
      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Master Admin Access</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-medium">DB Active</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
          Sign in immediately with the master Administrator account:
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleQuickEnter('admin@roadsense.com', 'Admin@123')}
          disabled={isLoading}
          className="w-full text-xs h-9 border-slate-700 bg-slate-800/80 hover:bg-primary hover:text-white text-slate-200 transition-colors"
        >
          1-Click Sign-In as Admin (admin@roadsense.com)
        </Button>

        <div className="mt-4 pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
          Need an account?{' '}
          <Link to="/register" className="text-primary hover:underline font-semibold">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
