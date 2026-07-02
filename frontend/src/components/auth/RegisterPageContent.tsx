'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton';
import { AuthPageLayout } from '@/components/auth/AuthPageLayout';
import { AuthAlert } from '@/components/auth/AuthAlert';
import { PasswordField } from '@/components/auth/PasswordField';

interface FieldErrors {
  name?: string;
  email?: string;
  phone_number?: string;
  password?: string;
  confirmPassword?: string;
}

export function RegisterPageContent() {
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

  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return 'Nama wajib diisi';
    if (!/^[a-zA-Z\s]+$/.test(name)) return 'Nama hanya boleh berisi huruf dan spasi';
    if (name.trim().length < 2) return 'Nama minimal 2 karakter';
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) return 'Email wajib diisi';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Format email tidak valid';
    return undefined;
  };

  const validatePhone = (phone: string): string | undefined => {
    if (!phone.trim()) return 'Nomor telepon wajib diisi';
    if (!/^\+?[0-9]+$/.test(phone)) return 'Hanya + dan angka yang diperbolehkan';
    if (phone.length < 8) return 'Nomor telepon minimal 8 digit';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Kata sandi wajib diisi';
    if (password.length < 8) return 'Kata sandi minimal 8 karakter';
    if (!/[a-z]/.test(password)) return 'Harus mengandung huruf kecil';
    if (!/[A-Z]/.test(password)) return 'Harus mengandung huruf besar';
    if (!/[0-9]/.test(password)) return 'Harus mengandung angka';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Harus mengandung karakter khusus';
    }
    return undefined;
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    setFieldErrors({ ...fieldErrors, name: validateName(value) });
  };

  const handleEmailChange = (value: string) => {
    setFormData({ ...formData, email: value });
    setFieldErrors({ ...fieldErrors, email: validateEmail(value) });
  };

  const handlePhoneChange = (value: string) => {
    const sanitized = value.replace(/[^+\d]/g, '');
    setFormData({ ...formData, phone_number: sanitized });
    setFieldErrors({ ...fieldErrors, phone_number: validatePhone(sanitized) });
  };

  const handlePasswordChange = (value: string) => {
    setFormData({ ...formData, password: value });
    const passwordError = validatePassword(value);
    const confirmError =
      formData.confirmPassword && value !== formData.confirmPassword
        ? 'Kata sandi tidak cocok'
        : undefined;
    setFieldErrors({ ...fieldErrors, password: passwordError, confirmPassword: confirmError });
  };

  const handleConfirmPasswordChange = (value: string) => {
    setFormData({ ...formData, confirmPassword: value });
    setFieldErrors({
      ...fieldErrors,
      confirmPassword: value !== formData.password ? 'Kata sandi tidak cocok' : undefined,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const nameError = validateName(formData.name);
    const emailError = validateEmail(formData.email);
    const phoneError = validatePhone(formData.phone_number);
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError =
      formData.password !== formData.confirmPassword ? 'Kata sandi tidak cocok' : undefined;

    setFieldErrors({
      name: nameError,
      email: emailError,
      phone_number: phoneError,
      password: passwordError,
      confirmPassword: confirmPasswordError,
    });

    if (nameError || emailError || phoneError || passwordError || confirmPasswordError) {
      setError('Perbaiki kesalahan pada formulir');
      return;
    }

    if (!agreedToPrivacy) {
      setError('Anda harus menyetujui Kebijakan Privasi untuk membuat akun');
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
        formData.referral_code || undefined,
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
      setTimeout(() => router.push('/verify-email'), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Pendaftaran gagal');
    } finally {
      setLoading(false);
    }
  };

  const passwordChecks = [
    { ok: formData.password.length >= 8, label: 'Minimal 8 karakter' },
    { ok: /[a-z]/.test(formData.password), label: 'Huruf kecil' },
    { ok: /[A-Z]/.test(formData.password), label: 'Huruf besar' },
    { ok: /[0-9]/.test(formData.password), label: 'Angka' },
    {
      ok: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password),
      label: 'Karakter khusus',
    },
  ];

  return (
    <AuthPageLayout
      active="register"
      title="Buat akun Gradion"
      subtitle={
        <>
          Sudah punya akun?{' '}
          <Link href="/login" className="font-semibold text-gradion-teal hover:text-gradion-teal-hover">
            Masuk di sini
          </Link>
        </>
      }
      sideDescription="Mulai gratis dalam hitungan menit — lacak perkembangan anak, kolaborasi dengan terapis, dan dapatkan insight berbasis data."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && <AuthAlert variant="error">{error}</AuthAlert>}
        {success && <AuthAlert variant="success">{success}</AuthAlert>}

        <div>
          <Input
            variant="brand"
            label="Nama lengkap"
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Nama Anda"
          />
          {fieldErrors.name && <p className="mt-1.5 text-sm text-red-600">{fieldErrors.name}</p>}
        </div>

        <div>
          <Input
            variant="brand"
            label="Alamat email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder="anda@email.com"
          />
          {fieldErrors.email && <p className="mt-1.5 text-sm text-red-600">{fieldErrors.email}</p>}
        </div>

        <div>
          <Input
            variant="brand"
            label="Nomor telepon"
            type="tel"
            required
            value={formData.phone_number}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="+6281234567890"
          />
          {fieldErrors.phone_number && (
            <p className="mt-1.5 text-sm text-red-600">{fieldErrors.phone_number}</p>
          )}
          <p className="mt-1.5 text-xs text-gradion-navy/45">Format: +62 diikuti angka</p>
        </div>

        <div>
          <PasswordField
            label="Kata sandi"
            value={formData.password}
            onChange={handlePasswordChange}
            required
            autoComplete="new-password"
            error={fieldErrors.password}
          />
          {formData.password && (
            <div className="mt-2 p-3 rounded-lg border border-gradion-grey bg-[#FDF8F1]/60">
              <p className="text-xs font-medium text-gradion-navy mb-2">Persyaratan kata sandi:</p>
              <ul className="text-xs space-y-1">
                {passwordChecks.map((check) => (
                  <li
                    key={check.label}
                    className={check.ok ? 'text-emerald-600' : 'text-gradion-navy/50'}
                  >
                    {check.ok ? '✓' : '○'} {check.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <PasswordField
          label="Konfirmasi kata sandi"
          value={formData.confirmPassword}
          onChange={handleConfirmPasswordChange}
          required
          autoComplete="new-password"
          error={fieldErrors.confirmPassword}
        />

        <Input
          variant="brand"
          label="Kode referral (opsional)"
          type="text"
          value={formData.referral_code}
          onChange={(e) =>
            setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })
          }
          placeholder="KODE123"
        />
        {formData.referral_code && (
          <p className="text-xs text-gradion-navy/50 -mt-2">
            Anda membantu pemberi referral mendapatkan 1.000 poin!
          </p>
        )}

        <div className="flex items-start gap-3">
          <input
            id="privacy-agreement"
            type="checkbox"
            checked={agreedToPrivacy}
            onChange={(e) => setAgreedToPrivacy(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gradion-grey text-gradion-teal focus:ring-gradion-teal"
            required
          />
          <label htmlFor="privacy-agreement" className="text-sm text-gradion-navy/70 cursor-pointer">
            Saya telah membaca dan menyetujui{' '}
            <Link
              href="/cms/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gradion-teal hover:text-gradion-teal-hover underline"
              onClick={(e) => e.stopPropagation()}
            >
              Kebijakan Privasi
            </Link>
          </label>
        </div>

        <Button type="submit" variant="brand" className="w-full" disabled={loading || !agreedToPrivacy}>
          {loading ? 'Membuat akun...' : 'Daftar gratis'}
        </Button>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gradion-grey" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-3 text-gradion-navy/50">atau lanjutkan dengan</span>
          </div>
        </div>

        <GoogleAuthButton
          onAuthenticated={() => router.push('/dashboard')}
          requirePrivacyAgreement
          agreedToPrivacy={agreedToPrivacy}
          onPrivacyAgreementChange={setAgreedToPrivacy}
        />

        <p className="text-center text-sm text-gradion-navy/55">
          Email sudah diverifikasi?{' '}
          <Link href="/login" className="font-medium text-gradion-teal hover:text-gradion-teal-hover">
            Masuk di sini
          </Link>
        </p>
      </form>
    </AuthPageLayout>
  );
}
