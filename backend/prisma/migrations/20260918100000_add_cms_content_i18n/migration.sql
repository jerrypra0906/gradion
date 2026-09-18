-- Landing and CMS copy is authored in one language; the other is produced by
-- machine translation and cached here so a reader in either language sees the
-- site in their own. Cleared on edit, so an admin change is never served stale.
ALTER TABLE "cms_content" ADD COLUMN "source_lang" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "cms_content" ADD COLUMN "content_i18n" JSONB;
