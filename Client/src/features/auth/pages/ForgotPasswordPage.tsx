import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '@/features/auth/authApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
      toast.success('Reset link sent! Check your Gmail inbox.');
    } catch (err: any) {
      const msg = err?.message || 'Failed to send reset email. Please try again.';
      setError(msg);
      toast.error('Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white">Forgot Password</h2>
        <p className="text-xs text-slate-400">
          Enter your registered email and we'll send a reset link to your Gmail.
        </p>
      </div>

      {sent ? (
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Reset Link Sent!</h3>
            <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
              If <span className="text-slate-200 font-medium">{email}</span> is registered, a password reset link has been sent to your Gmail inbox.
              <br /><span className="text-slate-500">Check your spam folder if you don't see it.</span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            onClick={() => { setSent(false); setEmail(''); }}
          >
            Send another link
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
              <Label className="text-xs font-medium text-slate-300">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  placeholder="your@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading || !email.trim()}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold shadow-lg"
            >
              {isLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
              ) : (
                'Send Reset Link to Gmail'
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
