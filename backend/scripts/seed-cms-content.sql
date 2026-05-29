-- Seed CMS content for Contact Us, Privacy Policy, and Terms of Service
-- This script will insert or update the CMS content

-- Contact Us
INSERT INTO cms_content (title, slug, content_html, status, created_at, updated_at)
VALUES (
  'Contact Us',
  'contact',
  '<p class="text-gray-600 mb-8">Have questions about LangkahKecil, need help with your account, or want to share feedback? We''d love to hear from you.</p><div class="space-y-6"><div><h2 class="text-lg font-semibold text-gray-900 mb-1">Email</h2><p class="text-gray-600">Send us an email at <a href="mailto:support@langkahkecil.com" class="text-blue-600 hover:text-blue-500 font-medium">support@langkahkecil.com</a> and we''ll get back to you as soon as possible.</p></div><div><h2 class="text-lg font-semibold text-gray-900 mb-1">Support Hours</h2><p class="text-gray-600">Monday–Friday, 09:00–17:00 WIB. We aim to respond within 1–2 business days.</p></div><div><h2 class="text-lg font-semibold text-gray-900 mb-1">For Therapists &amp; Clinics</h2><p class="text-gray-600">If you''re a therapist or clinic interested in using LangkahKecil with your clients, please mention your clinic name and how many families you''d like to onboard.</p></div></div>',
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title,
    content_html = EXCLUDED.content_html,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Privacy Policy
INSERT INTO cms_content (title, slug, content_html, status, created_at, updated_at)
VALUES (
  'Privacy Policy',
  'privacy',
  '<section><h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Introduction</h2><p>LangkahKecil ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform and services.</p></section><section><h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Information We Collect</h2><h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">2.1 Personal Information</h3><p>We may collect the following personal information:</p><ul class="list-disc pl-6 space-y-2"><li>Name, email address, and phone number</li><li>Child''s name, birthdate, and diagnosis information (for parents)</li><li>Professional credentials and clinic information (for therapists)</li><li>Payment and billing information</li></ul><h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">2.2 Usage Data</h3><p>We automatically collect information about how you interact with our platform, including session logs, progress tracking data, and device information.</p></section><section><h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2><p>We use the information we collect to:</p><ul class="list-disc pl-6 space-y-2"><li>Provide, maintain, and improve our services</li><li>Process transactions and manage subscriptions</li><li>Enable communication between parents and therapists</li><li>Generate progress reports and analytics</li><li>Send important updates and notifications</li><li>Comply with legal obligations</li></ul></section><section><h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Data Security</h2><p>We implement industry-standard security measures to protect your data, including encryption in transit and at rest, secure authentication, and regular security audits. However, no method of transmission over the internet is 100% secure.</p></section><section><h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Data Sharing and Disclosure</h2><p>We do not sell your personal information. We may share your information only in the following cases:</p><ul class="list-disc pl-6 space-y-2"><li>With therapists linked to your child''s account (with your consent)</li><li>With service providers who assist in operating our platform (under strict confidentiality agreements)</li><li>When required by law or to protect our rights and safety</li><li>In connection with a business transfer (merger, acquisition, etc.)</li></ul></section><section><h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Your Rights</h2><p>You have the right to:</p><ul class="list-disc pl-6 space-y-2"><li>Access and review your personal information</li><li>Request corrections to inaccurate data</li><li>Request deletion of your account and data</li><li>Opt-out of certain communications</li><li>Export your data in a portable format</li></ul><p class="mt-4">To exercise these rights, please contact us at <a href="mailto:support@langkahkecil.com" class="text-blue-600 hover:text-blue-500 font-medium">support@langkahkecil.com</a>.</p></section><section><h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Children''s Privacy</h2><p>Our platform is designed to help parents track their children''s progress. All child-related data is collected and managed by parents or legal guardians. We do not knowingly collect information directly from children without parental consent.</p></section><section><h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Changes to This Policy</h2><p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.</p></section><section><h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Contact Us</h2><p>If you have questions about this Privacy Policy, please contact us at <a href="mailto:support@langkahkecil.com" class="text-blue-600 hover:text-blue-500 font-medium">support@langkahkecil.com</a>.</p></section>',
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title,
    content_html = EXCLUDED.content_html,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Terms of Service (truncated for SQL - will need to be split or use a different approach)
-- Due to length, let me create a separate approach using a here-document or file reading

