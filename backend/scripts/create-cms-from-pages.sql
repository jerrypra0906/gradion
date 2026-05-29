-- Create CMS content from page defaults
-- This script creates or updates Contact Us, Privacy Policy, and Terms of Service
-- Run this in Supabase SQL Editor

-- Contact Us
INSERT INTO cms_content (title, slug, content_html, status, created_at, updated_at)
VALUES (
  'Contact Us',
  'contact',
  '<p class="text-gray-600 mb-8">Have questions about LangkahKecil, need help with your account, or want to share feedback? We''d love to hear from you.</p>

<div class="space-y-6">
  <div>
    <h2 class="text-lg font-semibold text-gray-900 mb-1">Email</h2>
    <p class="text-gray-600">
      Send us an email at
      <a href="mailto:support@langkahkecil.org" class="text-blue-600 hover:text-blue-500 font-medium">
        support@langkahkecil.org
      </a>
      and we''ll get back to you as soon as possible.
    </p>
  </div>

  <div>
    <h2 class="text-lg font-semibold text-gray-900 mb-1">Support Hours</h2>
    <p class="text-gray-600">
      Monday–Friday, 09:00–17:00 WIB. We aim to respond within 1–2 business days.
    </p>
  </div>

  <div>
    <h2 class="text-lg font-semibold text-gray-900 mb-1">For Therapists &amp; Clinics</h2>
    <p class="text-gray-600">
      If you''re a therapist or clinic interested in using LangkahKecil with your
      clients, please mention your clinic name and how many families you''d like to
      onboard.
    </p>
  </div>
</div>',
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
  '<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Introduction</h2>
  <p>
    LangkahKecil ("we," "our," or "us") is committed to protecting your privacy.
    This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use
    our platform and services.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Information We Collect</h2>
  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">2.1 Personal Information</h3>
  <p>We may collect the following personal information:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>Name, email address, and phone number</li>
    <li>Child''s name, birthdate, and diagnosis information (for parents)</li>
    <li>Professional credentials and clinic information (for therapists)</li>
    <li>Payment and billing information</li>
  </ul>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">2.2 Usage Data</h3>
  <p>
    We automatically collect information about how you interact with our platform, including session logs,
    progress tracking data, and device information.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. How We Use Your Information</h2>
  <p>We use the information we collect to:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>Provide, maintain, and improve our services</li>
    <li>Process transactions and manage subscriptions</li>
    <li>Enable communication between parents and therapists</li>
    <li>Generate progress reports and analytics</li>
    <li>Send important updates and notifications</li>
    <li>Comply with legal obligations</li>
  </ul>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Data Security</h2>
  <p>
    We implement industry-standard security measures to protect your data, including encryption in transit
    and at rest, secure authentication, and regular security audits. However, no method of transmission over
    the internet is 100% secure.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. Data Sharing and Disclosure</h2>
  <p>We do not sell your personal information. We may share your information only in the following cases:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>With therapists linked to your child''s account (with your consent)</li>
    <li>With service providers who assist in operating our platform (under strict confidentiality agreements)</li>
    <li>When required by law or to protect our rights and safety</li>
    <li>In connection with a business transfer (merger, acquisition, etc.)</li>
  </ul>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Your Rights</h2>
  <p>You have the right to:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>Access and review your personal information</li>
    <li>Request corrections to inaccurate data</li>
    <li>Request deletion of your account and data</li>
    <li>Opt-out of certain communications</li>
    <li>Export your data in a portable format</li>
  </ul>
  <p class="mt-4">
    To exercise these rights, please contact us at
    <a href="mailto:support@langkahkecil.org" class="text-blue-600 hover:text-blue-500 font-medium">
      support@langkahkecil.org
    </a>.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Children''s Privacy</h2>
  <p>
    Our platform is designed to help parents track their children''s progress. All child-related data is
    collected and managed by parents or legal guardians. We do not knowingly collect information directly
    from children without parental consent.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Changes to This Policy</h2>
  <p>
    We may update this Privacy Policy from time to time. We will notify you of any material changes by
    posting the new policy on this page and updating the "Last updated" date.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Contact Us</h2>
  <p>
    If you have questions about this Privacy Policy, please contact us at
    <a href="mailto:support@langkahkecil.org" class="text-blue-600 hover:text-blue-500 font-medium">
      support@langkahkecil.org
    </a>.
  </p>
</section>',
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title,
    content_html = EXCLUDED.content_html,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Terms of Service
INSERT INTO cms_content (title, slug, content_html, status, created_at, updated_at)
VALUES (
  'Terms of Service',
  'terms',
  '<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">1. Acceptance of Terms</h2>
  <p>
    By accessing and using LangkahKecil ("the Service"), you accept and agree to be bound by the terms
    and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">2. Description of Service</h2>
  <p>
    LangkahKecil is a platform designed to help parents and therapists track and manage autism progress. The
    Service includes features such as progress logging, therapist collaboration, goal management, and AI-powered
    insights.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">3. User Accounts</h2>
  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">3.1 Account Creation</h3>
  <p>
    To use certain features of the Service, you must register for an account. You agree to provide accurate,
    current, and complete information during registration and to update such information to keep it accurate,
    current, and complete.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">3.2 Account Security</h3>
  <p>
    You are responsible for maintaining the confidentiality of your account credentials and for all activities
    that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">3.3 Account Types</h3>
  <p>The Service supports different account types:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>
      <strong>Parent Accounts:</strong> For parents or legal guardians tracking their child''s progress
    </li>
    <li>
      <strong>Therapist Accounts:</strong> For licensed therapists providing services to families
    </li>
    <li>
      <strong>Admin Accounts:</strong> For platform administrators (by invitation only)
    </li>
  </ul>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">4. Subscription and Payment</h2>
  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">4.1 Subscription Plans</h3>
  <p>
    The Service offers various subscription plans with different features and pricing. Details of current plans
    are available on our pricing page.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">4.2 Payment Terms</h3>
  <p>
    Subscription fees are charged in advance for the selected billing period. All fees are non-refundable except
    as required by law or as explicitly stated in our refund policy.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">4.3 Cancellation</h3>
  <p>
    You may cancel your subscription at any time. Cancellation will take effect at the end of your current
    billing period. You will continue to have access to paid features until the end of the period for which you
    have already paid.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">4.4 Price Changes</h3>
  <p>
    We reserve the right to modify subscription prices. Price changes will be communicated to you in advance
    and will apply to subsequent billing periods.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">5. User Conduct</h2>
  <p>You agree not to:</p>
  <ul class="list-disc pl-6 space-y-2">
    <li>Use the Service for any illegal or unauthorized purpose</li>
    <li>Violate any laws in your jurisdiction</li>
    <li>Transmit any viruses, malware, or harmful code</li>
    <li>Attempt to gain unauthorized access to the Service or its related systems</li>
    <li>Interfere with or disrupt the Service or servers connected to the Service</li>
    <li>Use automated systems to access the Service without permission</li>
    <li>Share your account credentials with others</li>
    <li>Impersonate any person or entity</li>
  </ul>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">6. Content and Data</h2>
  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">6.1 Your Content</h3>
  <p>
    You retain ownership of all content and data you upload to the Service. By using the Service, you grant us a
    license to use, store, and process your content solely for the purpose of providing and improving the Service.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">6.2 Data Accuracy</h3>
  <p>
    You are responsible for the accuracy and completeness of all data you enter into the Service. We are not
    liable for any errors or omissions in your data.
  </p>

  <h3 class="text-xl font-semibold text-gray-900 mt-6 mb-3">6.3 Data Backup</h3>
  <p>
    While we implement backup and recovery procedures, you are responsible for maintaining your own backups of
    important data.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">7. Intellectual Property</h2>
  <p>
    The Service, including its original content, features, and functionality, is owned by LangkahKecil and
    protected by international copyright, trademark, and other intellectual property laws. You may not reproduce,
    distribute, modify, or create derivative works of the Service without our express written permission.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">8. Privacy</h2>
  <p>
    Your use of the Service is also governed by our Privacy Policy. Please review our Privacy Policy to
    understand how we collect, use, and protect your information.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">9. Disclaimers</h2>
  <p>
    The Service is provided "as is" and "as available" without warranties of any kind, either express or
    implied. We do not warrant that the Service will be uninterrupted, secure, or error-free. The Service is not
    a substitute for professional medical advice, diagnosis, or treatment.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">10. Limitation of Liability</h2>
  <p>
    To the maximum extent permitted by law, LangkahKecil shall not be liable for any indirect, incidental,
    special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or
    indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the
    Service.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">11. Indemnification</h2>
  <p>
    You agree to indemnify and hold harmless LangkahKecil, its officers, directors, employees, and agents from
    any claims, damages, losses, liabilities, and expenses (including legal fees) arising out of or related to
    your use of the Service, violation of these Terms, or infringement of any rights of another.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">12. Termination</h2>
  <p>
    We may terminate or suspend your account and access to the Service immediately, without prior notice, for any
    reason, including breach of these Terms. Upon termination, your right to use the Service will cease
    immediately.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">13. Changes to Terms</h2>
  <p>
    We reserve the right to modify these Terms at any time. We will notify you of any material changes by
    posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service
    after such changes constitutes acceptance of the new Terms.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">14. Governing Law</h2>
  <p>
    These Terms shall be governed by and construed in accordance with the laws of Indonesia, without regard to
    its conflict of law provisions.
  </p>
</section>

<section>
  <h2 class="text-2xl font-semibold text-gray-900 mt-8 mb-4">15. Contact Information</h2>
  <p>
    If you have any questions about these Terms of Service, please contact us at
    <a href="mailto:support@langkahkecil.org" class="text-blue-600 hover:text-blue-500 font-medium">
      support@langkahkecil.org
    </a>.
  </p>
</section>',
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title,
    content_html = EXCLUDED.content_html,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Verify the entries were created
SELECT id, title, slug, status, created_at, updated_at
FROM cms_content
WHERE slug IN ('contact', 'privacy', 'terms')
ORDER BY slug;
