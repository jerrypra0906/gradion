-- Add a temporary JSONB column with a default empty array
ALTER TABLE "parent_logs"
    ADD COLUMN "skills_practiced_tmp" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Copy existing string-array skills into the new JSON structure
UPDATE "parent_logs"
SET "skills_practiced_tmp" = COALESCE(
    (
        SELECT jsonb_agg(
            jsonb_build_object(
                'name', skill,
                'rating', LEAST(GREATEST("parent_logs"."rating", 1), 5)
            )
        )
        FROM unnest("parent_logs"."skills_practiced") AS skill
    ),
    '[]'::jsonb
);

-- Drop the old column and rename the tmp column
ALTER TABLE "parent_logs"
    DROP COLUMN "skills_practiced";

ALTER TABLE "parent_logs"
    RENAME COLUMN "skills_practiced_tmp" TO "skills_practiced";
