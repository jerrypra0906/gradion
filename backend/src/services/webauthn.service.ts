import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { prisma } from '../lib/prisma.js';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

/**
 * Relying Party ID must be the site's registrable domain (no scheme/port).
 * Derived from FRONTEND_URL so no extra env var is needed per environment:
 * https://gradion.id -> "gradion.id", http://localhost:5050 -> "localhost".
 */
export function getRpId(): string {
  try {
    return new URL(config.frontendUrl).hostname;
  } catch {
    return 'localhost';
  }
}

/**
 * Origins a passkey assertion may come from. FRONTEND_URL plus any configured
 * CORS origins, so staging/preview hosts keep working.
 */
function getExpectedOrigins(): string[] {
  const origins = new Set<string>();
  const add = (raw: string) => {
    const value = raw.trim().replace(/\/$/, '');
    if (value) origins.add(value);
  };
  add(config.frontendUrl);
  for (const origin of String(config.corsOrigin || '').split(',')) add(origin);
  return [...origins];
}

const RP_NAME = 'Gradion';

async function storeChallenge(input: {
  challenge: string;
  purpose: 'register' | 'login';
  userId?: number;
  email?: string;
}) {
  // Opportunistic cleanup keeps the table small without a scheduled job.
  await prisma.webAuthnChallenge.deleteMany({ where: { expires_at: { lt: new Date() } } });
  await prisma.webAuthnChallenge.create({
    data: {
      challenge: input.challenge,
      purpose: input.purpose,
      user_id: input.userId ?? null,
      email: input.email ?? null,
      expires_at: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });
}

/** Fetch and consume a challenge (single use). Returns null when unknown/expired. */
async function consumeChallenge(challenge: string, purpose: 'register' | 'login') {
  const row = await prisma.webAuthnChallenge.findUnique({ where: { challenge } });
  if (!row) return null;
  await prisma.webAuthnChallenge.delete({ where: { id: row.id } }).catch(() => undefined);
  if (row.purpose !== purpose) return null;
  if (row.expires_at.getTime() < Date.now()) return null;
  return row;
}

/** Options for registering a new passkey on the signed-in user's device. */
export async function buildRegistrationOptions(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return null;

  const existing = await prisma.webAuthnCredential.findMany({
    where: { user_id: userId },
    select: { credential_id: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(),
    userName: user.email,
    userDisplayName: user.name,
    // Stable per-user handle so re-registering replaces rather than duplicates.
    userID: new TextEncoder().encode(String(user.id)),
    attestationType: 'none',
    // Don't offer to create a second passkey on a device that already has one.
    excludeCredentials: existing.map((c) => ({
      id: c.credential_id,
      transports: c.transports as any,
    })),
    authenticatorSelection: {
      // Built-in biometrics (Face ID / Touch ID / fingerprint / Windows Hello).
      authenticatorAttachment: 'platform',
      residentKey: 'preferred',
      userVerification: 'required',
    },
  });

  await storeChallenge({ challenge: options.challenge, purpose: 'register', userId });
  return options;
}

export type VerifyRegistrationResult =
  | { ok: true; credentialId: number; deviceLabel: string | null }
  | { ok: false; error: string };

export async function verifyRegistration(input: {
  userId: number;
  response: RegistrationResponseJSON;
  deviceLabel?: string | null;
}): Promise<VerifyRegistrationResult> {
  const challengeRow = await consumeChallenge(
    input.response.response.clientDataJSON
      ? extractChallenge(input.response.response.clientDataJSON)
      : '',
    'register'
  );
  if (!challengeRow || challengeRow.user_id !== input.userId) {
    return { ok: false, error: 'Challenge expired or invalid. Please try again.' };
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: input.response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
    });
  } catch (err) {
    logger.warn({ err, userId: input.userId }, 'WebAuthn registration verification failed');
    return { ok: false, error: 'Could not verify this device. Please try again.' };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: 'Device verification failed.' };
  }

  const { credential } = verification.registrationInfo;
  const label = (input.deviceLabel || '').trim().slice(0, 80) || null;

  const saved = await prisma.webAuthnCredential.upsert({
    where: { credential_id: credential.id },
    create: {
      user_id: input.userId,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey).toString('base64url'),
      counter: BigInt(credential.counter ?? 0),
      transports: (credential.transports as string[] | undefined) ?? [],
      device_label: label,
    },
    update: {
      public_key: Buffer.from(credential.publicKey).toString('base64url'),
      counter: BigInt(credential.counter ?? 0),
      device_label: label,
    },
  });

  return { ok: true, credentialId: saved.id, deviceLabel: saved.device_label };
}

/** Options for signing in with a previously registered passkey. */
export async function buildAuthenticationOptions(email?: string) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  let userId: number | undefined;
  let allowCredentials:
    | Array<{ id: string; transports?: AuthenticatorTransportLike[] }>
    | undefined;

  if (normalizedEmail) {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, webauthnCredentials: { select: { credential_id: true, transports: true } } },
    });
    // Unknown email or no passkeys: still return options so the endpoint does
    // not reveal which accounts exist; the assertion simply won't verify.
    if (user?.webauthnCredentials?.length) {
      userId = user.id;
      allowCredentials = user.webauthnCredentials.map((c) => ({
        id: c.credential_id,
        transports: c.transports as AuthenticatorTransportLike[],
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: 'required',
    ...(allowCredentials ? { allowCredentials } : {}),
  });

  await storeChallenge({
    challenge: options.challenge,
    purpose: 'login',
    userId,
    email: normalizedEmail || undefined,
  });
  return options;
}

type AuthenticatorTransportLike = 'ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb';

export type VerifyAuthenticationResult =
  | { ok: true; userId: number }
  | { ok: false; error: string };

export async function verifyAuthentication(
  response: AuthenticationResponseJSON
): Promise<VerifyAuthenticationResult> {
  const challengeRow = await consumeChallenge(
    extractChallenge(response.response.clientDataJSON),
    'login'
  );
  if (!challengeRow) {
    return { ok: false, error: 'Challenge expired or invalid. Please try again.' };
  }

  const credential = await prisma.webAuthnCredential.findUnique({
    where: { credential_id: response.id },
    include: { user: { select: { id: true, is_email_verified: true } } },
  });
  if (!credential) {
    return { ok: false, error: 'This device is not registered for biometric sign-in.' };
  }
  // When the flow started from an email, the passkey must belong to that account.
  if (challengeRow.user_id && challengeRow.user_id !== credential.user_id) {
    return { ok: false, error: 'This device is not registered for that account.' };
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: getExpectedOrigins(),
      expectedRPID: getRpId(),
      requireUserVerification: true,
      credential: {
        id: credential.credential_id,
        publicKey: new Uint8Array(Buffer.from(credential.public_key, 'base64url')),
        counter: Number(credential.counter),
        transports: credential.transports as AuthenticatorTransportLike[],
      },
    });
  } catch (err) {
    logger.warn({ err, credentialId: credential.id }, 'WebAuthn authentication verification failed');
    return { ok: false, error: 'Biometric sign-in failed. Please try again or use your password.' };
  }

  if (!verification.verified) {
    return { ok: false, error: 'Biometric sign-in failed.' };
  }

  await prisma.webAuthnCredential.update({
    where: { id: credential.id },
    data: {
      counter: BigInt(verification.authenticationInfo.newCounter),
      last_used_at: new Date(),
    },
  });

  return { ok: true, userId: credential.user_id };
}

export async function listCredentialsForUser(userId: number) {
  const rows = await prisma.webAuthnCredential.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      device_label: true,
      created_at: true,
      last_used_at: true,
    },
  });
  return rows;
}

export async function deleteCredential(userId: number, credentialRowId: number) {
  const result = await prisma.webAuthnCredential.deleteMany({
    where: { id: credentialRowId, user_id: userId },
  });
  return result.count > 0;
}

/** Read the challenge the authenticator signed, from base64url clientDataJSON. */
function extractChallenge(clientDataJSON: string): string {
  try {
    const json = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString('utf8'));
    return typeof json?.challenge === 'string' ? json.challenge : '';
  } catch {
    return '';
  }
}
