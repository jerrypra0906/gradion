# CMS Content Samples for LangkahKecil

## 1. Welcome Page

**Title:** Welcome to LangkahKecil
**Slug:** welcome
**Status:** published

```html
<div class="max-w-4xl mx-auto px-4 py-8">
  <div class="text-center mb-12">
    <h1 class="text-4xl font-bold text-gray-900 mb-4">Welcome to LangkahKecil</h1>
    <p class="text-xl text-gray-600">Your trusted partner in autism therapy and child development</p>
  </div>

  <div class="grid md:grid-cols-2 gap-8 mb-12">
    <div class="bg-blue-50 rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-blue-900 mb-3">For Parents</h2>
      <p class="text-gray-700 mb-4">
        Track your child's daily progress, log activities, and collaborate with therapists 
        to ensure the best care for your child.
      </p>
      <ul class="list-disc list-inside text-gray-600 space-y-2">
        <li>Daily activity logging</li>
        <li>Progress tracking</li>
        <li>Goal monitoring</li>
        <li>Session management</li>
      </ul>
    </div>

    <div class="bg-green-50 rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-green-900 mb-3">For Therapists</h2>
      <p class="text-gray-700 mb-4">
        Manage your clients, create goals, review parent logs, and track therapy 
        sessions all in one place.
      </p>
      <ul class="list-disc list-inside text-gray-600 space-y-2">
        <li>Client management</li>
        <li>Goal setting and tracking</li>
        <li>Session documentation</li>
        <li>Progress reports</li>
      </ul>
    </div>
  </div>

  <div class="bg-gray-50 rounded-lg p-8 text-center">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">Get Started Today</h2>
    <p class="text-gray-600 mb-6">
      Join hundreds of families and therapists who trust LangkahKecil for their 
      therapy management needs.
    </p>
    <div class="flex justify-center gap-4">
      <a href="/register" class="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors">
        Create Account
      </a>
      <a href="/login" class="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors">
        Sign In
      </a>
    </div>
  </div>
</div>
```

## 2. Therapy Guidelines

**Title:** Therapy Guidelines for Parents
**Slug:** therapy-guidelines
**Status:** published

```html
<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-4xl font-bold text-gray-900 mb-6">Therapy Guidelines for Parents</h1>
  
  <div class="prose prose-lg max-w-none">
    <p class="text-lg text-gray-700 mb-8">
      These guidelines will help you make the most of your child's therapy journey 
      and ensure effective collaboration with your therapy team.
    </p>

    <section class="mb-8">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">Daily Activity Logging</h2>
      <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
        <p class="text-gray-700">
          <strong>Best Practice:</strong> Log activities daily while they're fresh in your memory. 
          This helps therapists understand patterns and make better recommendations.
        </p>
      </div>
      <ul class="list-disc list-inside text-gray-700 space-y-2 ml-4">
        <li>Be specific about activities and behaviors</li>
        <li>Note both challenges and successes</li>
        <li>Include context (time of day, environment, etc.)</li>
        <li>Rate skills honestly to track real progress</li>
      </ul>
    </section>

    <section class="mb-8">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">Working with Therapists</h2>
      <div class="space-y-4">
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <h3 class="font-semibold text-gray-900 mb-2">Communication</h3>
          <p class="text-gray-700">
            Review therapist comments on your logs regularly. They provide valuable 
            insights and recommendations for home practice.
          </p>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <h3 class="font-semibold text-gray-900 mb-2">Goal Setting</h3>
          <p class="text-gray-700">
            Collaborate with therapists on setting realistic, measurable goals. 
            Track progress together and celebrate milestones.
          </p>
        </div>
        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <h3 class="font-semibold text-gray-900 mb-2">Consistency</h3>
          <p class="text-gray-700">
            Regular therapy sessions and consistent home practice lead to the best outcomes. 
            Use the platform to stay organized and maintain consistency.
          </p>
        </div>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">Understanding Progress Reports</h2>
      <p class="text-gray-700 mb-4">
        Our progress reports show trends over time. Look for:
      </p>
      <ul class="list-disc list-inside text-gray-700 space-y-2 ml-4">
        <li><strong>Skills Frequency:</strong> Which skills are practiced most often</li>
        <li><strong>Rating Trends:</strong> Overall improvement in activity ratings</li>
        <li><strong>Session Patterns:</strong> Consistency of therapy sessions</li>
        <li><strong>Goal Status:</strong> Progress toward therapy goals</li>
      </ul>
    </section>

    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-8">
      <h3 class="font-semibold text-yellow-900 mb-2">💡 Remember</h3>
      <p class="text-yellow-800">
        Every child progresses at their own pace. Focus on small wins and celebrate 
        every step forward. Your consistent effort and documentation make a real difference.
      </p>
    </div>
  </div>
</div>
```

## 3. Frequently Asked Questions

**Title:** Frequently Asked Questions
**Slug:** faq
**Status:** published

```html
<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-4xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h1>
  
  <div class="space-y-6">
    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-3">How do I log my child's daily activities?</h2>
      <p class="text-gray-700">
        Navigate to "My Logs" in your dashboard and click "New Log". Select your child, 
        choose the date, select skills practiced with ratings, describe the activities, 
        and add any behavior notes. The system will automatically calculate an overall rating.
      </p>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-3">Can I edit a log after submitting it?</h2>
      <p class="text-gray-700">
        Yes, you can edit logs that are still in "pending" status. Once a therapist 
        reviews and approves or flags a log, it cannot be edited. This ensures data 
        integrity for progress tracking.
      </p>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-3">How are therapy goals created?</h2>
      <p class="text-gray-700">
        Therapists create goals for your child based on their assessment and therapy plan. 
        You can view these goals in the "Goals" section and track progress together. 
        Goals can be active, completed, paused, or cancelled.
      </p>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-3">What information is shown in progress reports?</h2>
      <p class="text-gray-700">
        Progress reports include activity log trends, skills frequency analysis, 
        session patterns, goal status, and recent logs. You can filter reports by 
        date range (7-180 days) to see progress over different time periods.
      </p>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-3">How do I add custom skills to activity logs?</h2>
      <p class="text-gray-700">
        When creating or editing a log, you'll see a list of common skills. Below that, 
        there's a text input where you can type a custom skill name. Click "Add Skill" 
        to include it. Each skill can be rated individually from 1-5.
      </p>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-3">What happens if I miss logging activities for a few days?</h2>
      <p class="text-gray-700">
        You can log activities for any past date. While daily logging is recommended, 
        you can catch up by selecting the appropriate date when creating a new log. 
        The system will organize logs chronologically regardless of when they're entered.
      </p>
    </div>

    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-3">How do I contact my child's therapist?</h2>
      <p class="text-gray-700">
        Therapists review your logs and leave comments. You can also communicate through 
        the notes section in therapy sessions. For urgent matters, please contact your 
        therapist directly using their provided contact information.
      </p>
    </div>

    <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
      <h3 class="text-lg font-semibold text-blue-900 mb-2">Still have questions?</h3>
      <p class="text-blue-800">
        If you need additional help, please contact our support team or reach out to 
        your assigned therapist through the platform.
      </p>
    </div>
  </div>
</div>
```

## 4. Resources & Support

**Title:** Resources & Support
**Slug:** resources
**Status:** published

```html
<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-4xl font-bold text-gray-900 mb-8">Resources & Support</h1>
  
  <div class="grid md:grid-cols-2 gap-6 mb-8">
    <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-blue-900 mb-4">📚 Learning Resources</h2>
      <ul class="space-y-2 text-gray-700">
        <li>• Understanding autism spectrum disorders</li>
        <li>• Communication strategies</li>
        <li>• Behavior management techniques</li>
        <li>• Sensory processing information</li>
        <li>• Social skills development</li>
      </ul>
    </div>

    <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
      <h2 class="text-2xl font-semibold text-green-900 mb-4">🛠️ Platform Features</h2>
      <ul class="space-y-2 text-gray-700">
        <li>• Activity logging system</li>
        <li>• Progress tracking & reports</li>
        <li>• Goal management</li>
        <li>• Session scheduling</li>
        <li>• Therapist collaboration</li>
      </ul>
    </div>
  </div>

  <div class="bg-gray-50 rounded-lg p-8 mb-8">
    <h2 class="text-2xl font-semibold text-gray-900 mb-4">Getting the Most from LangkahKecil</h2>
    <div class="space-y-4">
      <div class="flex items-start">
        <span class="text-2xl mr-4">✓</span>
        <div>
          <h3 class="font-semibold text-gray-900 mb-1">Log Activities Regularly</h3>
          <p class="text-gray-700">
            Consistent logging helps identify patterns and track progress more accurately.
          </p>
        </div>
      </div>
      <div class="flex items-start">
        <span class="text-2xl mr-4">✓</span>
        <div>
          <h3 class="font-semibold text-gray-900 mb-1">Review Therapist Comments</h3>
          <p class="text-gray-700">
            Check your logs regularly for therapist feedback and recommendations.
          </p>
        </div>
      </div>
      <div class="flex items-start">
        <span class="text-2xl mr-4">✓</span>
        <div>
          <h3 class="font-semibold text-gray-900 mb-1">Use Progress Reports</h3>
          <p class="text-gray-700">
            Review monthly reports to see trends and celebrate improvements.
          </p>
        </div>
      </div>
      <div class="flex items-start">
        <span class="text-2xl mr-4">✓</span>
        <div>
          <h3 class="font-semibold text-gray-900 mb-1">Set and Track Goals</h3>
          <p class="text-gray-700">
            Work with therapists to set realistic goals and monitor progress together.
          </p>
        </div>
      </div>
    </div>
  </div>

  <div class="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded">
    <h3 class="text-lg font-semibold text-yellow-900 mb-2">Need Help?</h3>
    <p class="text-yellow-800 mb-4">
      Our support team is here to assist you. If you have questions about using 
      the platform or need technical support, don't hesitate to reach out.
    </p>
    <p class="text-yellow-800">
      <strong>Remember:</strong> You're not alone on this journey. Every small step 
      forward is a victory worth celebrating.
    </p>
  </div>
```

## 5. Privacy & Data Security

**Title:** Privacy & Data Security
**Slug:** privacy
**Status:** published

```html
<div class="max-w-4xl mx-auto px-4 py-8">
  <h1 class="text-4xl font-bold text-gray-900 mb-6">Privacy & Data Security</h1>
  
  <div class="prose prose-lg max-w-none">
    <p class="text-lg text-gray-700 mb-8">
      At LangkahKecil, we take your privacy and data security seriously. This page 
      outlines how we protect your information.
    </p>

    <section class="mb-8">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">Data Protection</h2>
      <div class="bg-blue-50 rounded-lg p-6 mb-4">
        <h3 class="font-semibold text-blue-900 mb-3">Encryption</h3>
        <p class="text-blue-800">
          All data transmitted between your device and our servers is encrypted using 
          industry-standard SSL/TLS protocols.
        </p>
      </div>
      <div class="bg-green-50 rounded-lg p-6 mb-4">
        <h3 class="font-semibold text-green-900 mb-3">Secure Storage</h3>
        <p class="text-green-800">
          Your data is stored in secure, encrypted databases with regular backups and 
          access controls.
        </p>
      </div>
      <div class="bg-purple-50 rounded-lg p-6">
        <h3 class="font-semibold text-purple-900 mb-3">Access Control</h3>
        <p class="text-purple-800">
          Only authorized users (you, assigned therapists, and administrators) can 
          access your child's information.
        </p>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">What Information We Collect</h2>
      <ul class="list-disc list-inside text-gray-700 space-y-2 ml-4">
        <li>Account information (name, email, role)</li>
        <li>Child information (name, birthdate, diagnosis)</li>
        <li>Activity logs and progress data</li>
        <li>Therapy session records</li>
        <li>Goals and progress notes</li>
      </ul>
    </section>

    <section class="mb-8">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Information</h2>
      <p class="text-gray-700 mb-4">
        Your information is used solely for:
      </p>
      <ul class="list-disc list-inside text-gray-700 space-y-2 ml-4">
        <li>Providing therapy management services</li>
        <li>Enabling communication between parents and therapists</li>
        <li>Generating progress reports and analytics</li>
        <li>Improving our platform and services</li>
      </ul>
    </section>

    <section class="mb-8">
      <h2 class="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
      <div class="space-y-3">
        <div class="flex items-start">
          <span class="text-blue-600 mr-3 mt-1">✓</span>
          <p class="text-gray-700"><strong>Access:</strong> You can view all your data at any time through the platform.</p>
        </div>
        <div class="flex items-start">
          <span class="text-blue-600 mr-3 mt-1">✓</span>
          <p class="text-gray-700"><strong>Correction:</strong> You can update and correct your information.</p>
        </div>
        <div class="flex items-start">
          <span class="text-blue-600 mr-3 mt-1">✓</span>
          <p class="text-gray-700"><strong>Deletion:</strong> You can request deletion of your account and data.</p>
        </div>
        <div class="flex items-start">
          <span class="text-blue-600 mr-3 mt-1">✓</span>
          <p class="text-gray-700"><strong>Export:</strong> You can export your data for your records.</p>
        </div>
      </div>
    </section>

    <div class="bg-gray-100 rounded-lg p-6 mt-8">
      <h3 class="font-semibold text-gray-900 mb-2">Questions About Privacy?</h3>
      <p class="text-gray-700">
        If you have questions or concerns about how we handle your data, please 
        contact our privacy team. We're committed to transparency and protecting 
        your family's information.
      </p>
    </div>
  </div>
</div>
```

## Usage Instructions

1. **Copy the HTML content** from any sample above
2. **Log in as admin** to the LangkahKecil platform
3. **Navigate to CMS** in the dashboard
4. **Click "New Content"**
5. **Fill in the form:**
   - Title: Use the title provided
   - Slug: Use the slug provided (or leave blank for auto-generation)
   - Status: Set to "published" for public content
   - Content HTML: Paste the HTML code
   - Publish At: Set if you want scheduled publishing
6. **Click "Create Content"**

All HTML uses Tailwind CSS classes that are available in your Next.js frontend, so the styling will work correctly when displayed.

