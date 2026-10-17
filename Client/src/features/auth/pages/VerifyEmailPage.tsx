import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '@/features/auth/authApi';
import { CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type State = 'loading' | 'success' | 'error' | 'no-token';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [state, setState] = useState<State>(token ? 'loading' : 'no-token');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    if (!token) return;

    authApi.verifyEmail(token)
      .then(() => {
        setState('success');
        toast.success('Email verified! You can now log in.');
      })
      .catch(() => {
        setState('error');
        toast.error('Verification failed');
      });
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResending(true);
    try {
      await authApi.resendVerification(resendEmail.trim());
      setResendDone(true);
      toast.success('Verification email sent!');
    } catch {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-[#0e0e1a] to-slate-900 px-4">
      <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center">
          <div className="text-2xl font-extrabold text-violet-400 mb-1">🛣️ RoadSense</div>
          <p className="text-xs text-slate-500">Email Verification</p>
        </div>

        {state === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
            <p className="text-sm text-slate-400">Verifying your email...</p>
          </div>
        )}

        {state === 'success' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-white">Email Verified! ✅</h3>
              <p className="text-xs text-slate-400 text-center">
                Your email has been verified successfully. You can now log in to RoadSense.
              </p>
            </div>
            <Button asChild className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white">
              <Link to="/login">Continue to Login</Link>
            </Button>
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-14 w-14 rounded-full bg-red-500/15 flex items-center justify-center">
                <AlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <h3 className="text-base font-semibold text-white">Link Expired or Invalid</h3>
              <p className="text-xs text-slate-400 text-center">
                This verification link has expired or is invalid. Request a new one below.
              </p>
            </div>
            {resendDone ? (
              <p className="text-xs text-emerald-400 text-center font-medium">
                ✅ New verification email sent! Check your inbox.
              </p>
            ) : (
              <form onSubmit={handleResend} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Your Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="your@gmail.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                      className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={resending} className="w-full bg-violet-600 hover:bg-violet-500 text-white">
                  {resending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : 'Resend Verification Email'}
                </Button>
              </form>
            )}
          </div>
        )}

        {state === 'no-token' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 text-center">
              No verification token found. Enter your email to receive a new verification link.
            </p>
            {resendDone ? (
              <p className="text-xs text-emerald-400 text-center font-medium">
                ✅ Verification email sent! Check your inbox.
              </p>
            ) : (
              <form onSubmit={handleResend} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Your Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="your@gmail.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                      className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={resending} className="w-full bg-violet-600 hover:bg-violet-500 text-white">
                  {resending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : 'Send Verification Email'}
                </Button>
              </form>
            )}
          </div>
        )}

        <div className="text-center">
          <Link to="/login" className="text-xs text-slate-500 hover:text-violet-400 transition-colors">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};
