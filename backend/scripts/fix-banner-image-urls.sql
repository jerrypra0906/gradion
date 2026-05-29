-- Fix malformed banner image URLs
-- This script fixes URLs that are missing // or have /api in the wrong place

-- Example: Fix URLs like "https:/.langkahkecil.org/api/uploads/banners/..." 
-- to "https://api.langkahkecil.org/uploads/banners/..."

UPDATE banners
SET image_url = REPLACE(
  REPLACE(image_url, 'https:/.langkahkecil.org/api', 'https://api.langkahkecil.org'),
  'https://api.langkahkecil.org/api/uploads', 
  'https://api.langkahkecil.org/uploads'
)
WHERE image_url LIKE '%langkahkecil.org%'
  AND (image_url LIKE '%https:/.%' OR image_url LIKE '%/api/uploads%');

-- Verify the fix
SELECT id, title, image_url 
FROM banners 
WHERE image_url IS NOT NULL;
