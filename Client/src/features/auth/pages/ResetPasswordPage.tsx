import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '@/features/auth/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, ArrowLeft, CheckCircle2, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('Invalid reset link. Please request a new one.');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
      toast.success('Password reset successfully!');
    } catch (err: any) {
      const msg = err?.message || 'Reset failed. The link may have expired.';
      setError(msg);
      toast.error('Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white">Set New Password</h2>
        <p className="text-xs text-slate-400">
          Choose a strong new password for your RoadSense account.
        </p>
      </div>

      {!token && (
        <Alert className="bg-destructive/15 border-destructive/40">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-xs text-red-300">
            Invalid or missing reset token. Please request a new reset link.
          </AlertDescription>
        </Alert>
      )}

      {done ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Password Updated!</h3>
            <p className="text-xs text-slate-400 max-w-xs">
              Your password has been reset successfully. You can now log in with your new password.
            </p>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white"
            onClick={() => navigate('/login')}
          >
            Go to Login
          </Button>
        </div>
      ) : (
        <>
          {error && (
            <Alert className="bg-destructive/15 border-destructive/40">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-xs text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-300">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-9 pr-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-300">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Repeat your new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !token}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold shadow-lg"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resetting...</>
              ) : (
                '🔐 Reset Password'
              )}
            </Button>
          </form>
        </>
      )}

      <div className="text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-violet-400 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Login
        </Link>
      </div>
    </div>
  );
};
