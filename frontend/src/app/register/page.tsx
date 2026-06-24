'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { Footer } from '@/components/layout/Footer';

interface FieldErrors {
  name?: string;
  email?: string;
  phone_number?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'parent' as 'admin' | 'therapist' | 'parent',
    phone_number: '',
    referral_code: '',
  });
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation functions
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) {
      return 'Name is required';
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return 'Name should contain only letters and spaces';
    }
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return 'Email is required';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Please enter a valid email address';
    }
    return undefined;
  };

  const validatePhone = (phone: string): string | undefined => {
    if (!phone.trim()) {
      return 'Phone number is required';
    }
    if (!/^\+?[0-9]+$/.test(phone)) {
      return 'Phone number can only contain + and numbers';
    }
    if (phone.length < 8) {
      return 'Phone number must be at least 8 digits';
    }
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return undefined;
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    const error = validateName(value);
    setFieldErrors({ ...fieldErrors, name: error });
  };

  const handleEmailChange = (value: string) => {
    setFormData({ ...formData, email: value });
    const error = validateEmail(value);
    setFieldErrors({ ...fieldErrors, email: error });
  };

  const handlePhoneChange = (value: string) => {
    // Only allow + and numbers
    const sanitized = value.replace(/[^+\d]/g, '');
    setFormData({ ...formData, phone_number: sanitized });
    const error = validatePhone(sanitized);
    setFieldErrors({ ...fieldErrors, phone_number: error });
  };

  const handlePasswordChange = (value: string) => {
    setFormData({ ...formData, password: value });
    const error = validatePassword(value);
    setFieldErrors({ ...fieldErrors, password: error });
    
    // Also validate confirm password if it's been filled
    if (formData.confirmPassword) {
      const confirmError = value !== formData.confirmPassword ? 'Passwords do not match' : undefined;
      setFieldErrors({ ...fieldErrors, password: error, confirmPassword: confirmError });
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setFormData({ ...formData, confirmPassword: value });
    const error = value !== formData.password ? 'Passwords do not match' : undefined;
    setFieldErrors({ ...fieldErrors, confirmPassword: error });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate all fields
    const nameError = validateName(formData.name);
    const emailError = validateEmail(formData.email);
    const phoneError = validatePhone(formData.phone_number);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = formData.password !== formData.confirmPassword ? 'Passwords do not match' : undefined;

    setFieldErrors({
      name: nameError,
      email: emailError,
      phone_number: phoneError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });

    if (nameError || emailError || phoneError || passwordError || confirmPasswordError) {
      setError('Please fix the errors in the form');
      return;
    }

    if (!agreedToPrivacy) {
      setError('You must agree to the Privacy Policy to create an account');
      return;
    }

    setLoading(true);

    try {
      const message = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.role,
        formData.phone_number,
        formData.referral_code || undefined
      );
      setSuccess(message);
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'parent',
        phone_number: '',
        referral_code: '',
      });
      setAgreedToPrivacy(false);
      setTimeout(() => {
        router.push('/verify-email');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to your existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Input
                label="Full Name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="John Doe"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
              )}
            </div>
            <div>
              <Input
                label="Email address"
                type="email"
                required
                value={formData.email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="you@example.com"
              />
              {fieldErrors.email && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <Input
                label="Mobile Phone Number"
                type="tel"
                required
                value={formData.phone_number}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+6281234567890"
              />
              {fieldErrors.phone_number && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.phone_number}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Only + and numbers allowed (e.g., +6281234567890)</p>
            </div>
            {/* Role is fixed to "parent" for self-registration (field hidden). */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
                    fieldErrors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  style={{ WebkitTextFillColor: '#111827', color: '#111827' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-0 right-0 bottom-0 flex items-center justify-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer z-10"
                  tabIndex={0}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.47 3.47L12 12m-3.47-3.47l3.47 3.47m0 0L12 12m0 0l3.47-3.47m-3.47 3.47L12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Password Requirements:</p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li className={`flex items-center ${formData.password.length >= 8 ? 'text-green-600' : ''}`}>
                    <span className="mr-2">{formData.password.length >= 8 ? '✓' : '○'}</span>
                    Minimum 8 characters
                  </li>
                  <li className={`flex items-center ${/[a-z]/.test(formData.password) ? 'text-green-600' : ''}`}>
                    <span className="mr-2">{/[a-z]/.test(formData.password) ? '✓' : '○'}</span>
                    At least one lowercase letter
                  </li>
                  <li className={`flex items-center ${/[A-Z]/.test(formData.password) ? 'text-green-600' : ''}`}>
                    <span className="mr-2">{/[A-Z]/.test(formData.password) ? '✓' : '○'}</span>
                    At least one uppercase letter
                  </li>
                  <li className={`flex items-center ${/[0-9]/.test(formData.password) ? 'text-green-600' : ''}`}>
                    <span className="mr-2">{/[0-9]/.test(formData.password) ? '✓' : '○'}</span>
                    At least one number
                  </li>
                  <li className={`flex items-center ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? 'text-green-600' : ''}`}>
                    <span className="mr-2">{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? '✓' : '○'}</span>
                    At least one special character (!@#$%^&*...)
                  </li>
                </ul>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 ${
                    fieldErrors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                  }`}
                  style={{ WebkitTextFillColor: '#111827', color: '#111827' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute top-0 right-0 bottom-0 flex items-center justify-center pr-3 text-gray-500 hover:text-gray-700 focus:outline-none cursor-pointer z-10"
                  tabIndex={0}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0A9.97 9.97 0 015.12 5.12m3.47 3.47L12 12m-3.47-3.47l3.47 3.47m0 0L12 12m0 0l3.47-3.47m-3.47 3.47L12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmPassword}</p>
              )}
            </div>
            <Input
              label="Referral Code (Optional)"
              type="text"
              value={formData.referral_code}
              onChange={(e) => setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })}
              placeholder="Enter referral code"
            />
            {formData.referral_code && (
              <p className="text-xs text-gray-500">
                You&apos;ll help your referrer earn 1,000 points when you register!
              </p>
            )}
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="privacy-agreement"
                type="checkbox"
                checked={agreedToPrivacy}
                onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                required
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="privacy-agreement" className="text-gray-700 cursor-pointer">
                I have read and agree to the{' '}
                <Link
                  href="/cms/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-500 font-medium underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Privacy Policy
                </Link>
              </label>
            </div>
          </div>

          <div>
            <Button type="submit" className="w-full" disabled={loading || !agreedToPrivacy}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500">Or continue with</span>
            </div>
          </div>

          <GoogleAuthButton 
            onAuthenticated={() => router.push('/dashboard')}
            requirePrivacyAgreement={true}
            agreedToPrivacy={agreedToPrivacy}
            onPrivacyAgreementChange={setAgreedToPrivacy}
          />

          <p className="text-center text-sm text-gray-500">
            Already verified your email?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-500">
              Sign in here
            </Link>
          </p>
        </form>
        </div>
      </div>
      <Footer />
    </div>
  );
}

