import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, User, Mail, Lock, Building2, MapPin, BadgeCheck, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { authApi } from '@/features/auth/authApi';
import { toast } from 'sonner';

const registerSchema = z
  .object({
    role: z.enum(['volunteer', 'municipal_officer']),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters'),
    municipality: z.string().optional(),
    department: z.string().optional(),
    employeeId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      });
    }

    if (data.role === 'municipal_officer') {
      if (!data.municipality || data.municipality.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['municipality'],
          message: 'Municipality is required for municipal officers (min 2 characters)',
        });
      }
      if (!data.department || data.department.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['department'],
          message: 'Department is required for municipal officers (min 2 characters)',
        });
      }
    }
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'volunteer',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      municipality: '',
      department: '',
      employeeId: '',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setApiError(null);

    try {
      if (data.role === 'volunteer') {
        await authApi.registerVolunteer({
          name: data.name,
          email: data.email,
          password: data.password,
          confirmPassword: data.confirmPassword,
        });
        toast.success('Registration successful! You may now sign in.');
      } else {
        await authApi.registerOfficer({
          name: data.name,
          email: data.email,
          password: data.password,
          confirmPassword: data.confirmPassword,
          municipality: data.municipality!.trim(),
          department: data.department!.trim(),
          employeeId: data.employeeId?.trim() || undefined,
        });
        toast.success(
          'Officer application submitted! Your profile is pending Administrator approval.'
        );
      }
      navigate('/login');
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please check your inputs.';
      setApiError(msg);
      toast.error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white">Create RoadSense Account</h2>
        <p className="text-xs text-slate-400">
          Register as a municipal staff officer or community volunteer surveyor.
        </p>
      </div>

      {apiError && (
        <Alert variant="destructive" className="bg-destructive/15 border-destructive/40 text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-sm font-semibold">Registration Error</AlertTitle>
          <AlertDescription className="text-xs text-red-300 mt-1">{apiError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-300">Account Type / Role</Label>
          <Select
            value={selectedRole}
            onValueChange={(val: any) => setValue('role', val, { shouldValidate: true })}
          >
            <SelectTrigger className="h-9 bg-slate-950/60 border-slate-700 text-white text-xs">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="volunteer">Volunteer Surveyor (Instant Activation)</SelectItem>
              <SelectItem value="municipal_officer">Municipal Officer (Requires Admin Approval)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-medium text-slate-300">
            Full Name
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              id="name"
              placeholder="e.g. Officer Rajesh Kumar"
              className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
              disabled={isLoading}
              {...register('name')}
            />
          </div>
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium text-slate-300">
            Email Address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              id="email"
              type="email"
              placeholder="officer@roadsense.demo"
              className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
              disabled={isLoading}
              {...register('email')}
            />
          </div>
          {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-slate-300">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="password"
                type="password"
                placeholder="Min 8 characters"
                className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
                disabled={isLoading}
                {...register('password')}
              />
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-300">
              Confirm Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
                disabled={isLoading}
                {...register('confirmPassword')}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        {selectedRole === 'municipal_officer' && (
          <div className="space-y-3 pt-1 border-t border-slate-800">
            <div className="space-y-1.5">
              <Label htmlFor="municipality" className="text-xs font-medium text-slate-300">
                Municipality / Local Authority *
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="municipality"
                  placeholder="e.g. Metro Municipal Corporation"
                  className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
                  disabled={isLoading}
                  {...register('municipality')}
                />
              </div>
              {errors.municipality && (
                <p className="text-xs text-red-400 mt-1">{errors.municipality.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department" className="text-xs font-medium text-slate-300">
                Department / Division *
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="department"
                  placeholder="e.g. Pavement Maintenance & Civil Works"
                  className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
                  disabled={isLoading}
                  {...register('department')}
                />
              </div>
              {errors.department && (
                <p className="text-xs text-red-400 mt-1">{errors.department.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="employeeId" className="text-xs font-medium text-slate-300">
                Employee ID / Badge # (Optional)
              </Label>
              <div className="relative">
                <BadgeCheck className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="employeeId"
                  placeholder="e.g. MMC-ENG-449"
                  className="pl-9 bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
                  disabled={isLoading}
                  {...register('employeeId')}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
              <span>
                Municipal Officer registrations are submitted to the municipal verification queue. An administrator will review your credentials before granting access.
              </span>
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full mt-2 h-10 font-semibold shadow-lg shadow-primary/25"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting Registration...
            </>
          ) : (
            <>
              Register Account <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="pt-2 text-center text-xs text-slate-400">
        Already registered?{' '}
        <Link to="/login" className="text-primary hover:underline font-semibold">
          Sign In here
        </Link>
      </div>
    </div>
  );
};
