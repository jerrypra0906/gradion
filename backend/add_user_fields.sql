-- Add phone_number, referral_code, points, and referred_by_code to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(20);

-- Create indexes
CREATE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code);
CREATE INDEX IF NOT EXISTS users_referred_by_code_idx ON users(referred_by_code);

-- Generate referral codes for existing users who don't have one
DO $$
DECLARE
    user_record RECORD;
    new_code VARCHAR(20);
    code_exists BOOLEAN;
BEGIN
    FOR user_record IN SELECT id FROM users WHERE referral_code IS NULL LOOP
        LOOP
            -- Generate a random 8-character alphanumeric code
            new_code := UPPER(
                SUBSTRING(
                    MD5(RANDOM()::TEXT || user_record.id::TEXT || NOW()::TEXT),
                    1, 8
                )
            );
            
            -- Check if code already exists
            SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = new_code) INTO code_exists;
            
            EXIT WHEN NOT code_exists;
        END LOOP;
        
        -- Update user with generated code
        UPDATE users SET referral_code = new_code WHERE id = user_record.id;
    END LOOP;
END $$;

