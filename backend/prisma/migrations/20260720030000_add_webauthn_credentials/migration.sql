-- Biometric / passkey sign-in (WebAuthn).
CREATE TABLE "webauthn_credentials" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "device_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMP(3),
    CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webauthn_credentials_credential_id_key" ON "webauthn_credentials"("credential_id");
CREATE INDEX "webauthn_credentials_user_id_idx" ON "webauthn_credentials"("user_id");

ALTER TABLE "webauthn_credentials"
  ADD CONSTRAINT "webauthn_credentials_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Short-lived challenges; kept server-side so verification cannot be spoofed.
CREATE TABLE "webauthn_challenges" (
    "id" SERIAL NOT NULL,
    "challenge" TEXT NOT NULL,
    "user_id" INTEGER,
    "email" TEXT,
    "purpose" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webauthn_challenges_challenge_key" ON "webauthn_challenges"("challenge");
CREATE INDEX "webauthn_challenges_expires_at_idx" ON "webauthn_challenges"("expires_at");
