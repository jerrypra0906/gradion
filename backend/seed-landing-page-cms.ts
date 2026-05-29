import { prisma } from './src/lib/prisma.js';
import dotenv from 'dotenv';

dotenv.config();

const landingPageSections = [
  {
    slug: 'hero',
    title: 'Hero Section',
    content_html: `
      <div class="text-center">
        <h1 class="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6">
          Track Every <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Langkah Kecil</span>
        </h1>
        <p class="text-xl md:text-2xl text-gray-700 mb-4 max-w-3xl mx-auto">
          Your child's autism progress, beautifully organized
        </p>
        <p class="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Collaborate with therapists, track daily activities, and celebrate every small step forward. Built for parents who want to be part of their child's journey.
        </p>
      </div>
    `,
  },
  {
    slug: 'features',
    title: 'Features Section',
    content_html: `
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold text-gray-900 mb-4">Everything You Need</h2>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          A comprehensive platform designed to support your child's development journey
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-xl shadow-lg">
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Daily Progress Tracking</h3>
          <p class="text-gray-600">
            Log daily activities, skills practiced, and milestones. See your child's progress over time with beautiful visualizations.
          </p>
        </div>
        <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-xl shadow-lg">
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Therapist Collaboration</h3>
          <p class="text-gray-600">
            Connect with your child's therapists. Share progress, review sessions, and work together towards common goals.
          </p>
        </div>
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-xl shadow-lg">
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Progress Reports</h3>
          <p class="text-gray-600">
            Generate comprehensive reports showing trends, improvements, and areas for focus. Share with therapists and family members.
          </p>
        </div>
        <div class="bg-gradient-to-br from-yellow-50 to-orange-50 p-8 rounded-xl shadow-lg">
          <h3 class="text-xl font-semibold text-gray-900 mb-2">AI-Powered Insights</h3>
          <p class="text-gray-600">
            Get intelligent summaries of your child's progress. AI analyzes patterns and suggests areas to focus on.
          </p>
        </div>
        <div class="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-xl shadow-lg">
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Goal Management</h3>
          <p class="text-gray-600">
            Set and track therapy goals with your therapist. Monitor progress and celebrate achievements together.
          </p>
        </div>
        <div class="bg-gradient-to-br from-red-50 to-rose-50 p-8 rounded-xl shadow-lg">
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Secure & Private</h3>
          <p class="text-gray-600">
            Your child's data is encrypted and secure. We follow strict privacy guidelines to protect your family's information.
          </p>
        </div>
      </div>
    `,
  },
  {
    slug: 'why-different',
    title: 'Why Different Section',
    content_html: `
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold text-gray-900 mb-4">Why LangkahKecil is Different</h2>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          Built specifically for autism families, by people who understand your journey
        </p>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <div class="space-y-6">
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">Designed for Real Families</h3>
                <p class="text-gray-600">
                  We've worked with parents and therapists to create a tool that fits into your daily life, not the other way around.
                </p>
              </div>
            </div>
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">Every Small Step Matters</h3>
                <p class="text-gray-600">
                  We celebrate every "langkah kecil" (small step). Progress isn't always linear, and we help you see the wins along the way.
                </p>
              </div>
            </div>
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">Seamless Collaboration</h3>
                <p class="text-gray-600">
                  Parents and therapists work together in one place. No more scattered notes or missed updates.
                </p>
              </div>
            </div>
            <div class="flex items-start space-x-4">
              <div class="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">Affordable & Accessible</h3>
                <p class="text-gray-600">
                  Start with a free plan. Upgrade when you're ready. No long-term commitments or hidden fees.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `,
  },
  {
    slug: 'success-stories',
    title: 'Success Stories',
    content_html: `
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold text-gray-900 mb-4">Success Stories</h2>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          Real families sharing their journey with LangkahKecil
        </p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-xl shadow-lg">
          <div class="flex items-center mb-4">
            <div class="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">S</div>
            <div class="ml-4">
              <h4 class="font-semibold text-gray-900">Sarah M.</h4>
              <p class="text-sm text-gray-600">Parent</p>
            </div>
          </div>
          <p class="text-gray-700 italic mb-4">
            "LangkahKecil has transformed how we track our son's progress. Seeing the data over time helps us celebrate every small win."
          </p>
        </div>
        <div class="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-xl shadow-lg">
          <div class="flex items-center mb-4">
            <div class="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">D</div>
            <div class="ml-4">
              <h4 class="font-semibold text-gray-900">Dr. Ahmad R.</h4>
              <p class="text-sm text-gray-600">Therapist</p>
            </div>
          </div>
          <p class="text-gray-700 italic mb-4">
            "The collaboration features make it so easy to stay connected with parents. I can see their daily logs and provide better guidance."
          </p>
        </div>
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 p-8 rounded-xl shadow-lg">
          <div class="flex items-center mb-4">
            <div class="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-lg">L</div>
            <div class="ml-4">
              <h4 class="font-semibold text-gray-900">Lisa K.</h4>
              <p class="text-sm text-gray-600">Parent</p>
            </div>
          </div>
          <p class="text-gray-700 italic mb-4">
            "The AI summaries help me understand patterns I might have missed. It's like having an extra pair of eyes on our journey."
          </p>
        </div>
      </div>
    `,
  },
  {
    slug: 'faq',
    title: 'FAQ Section',
    content_html: `
      <div class="text-center mb-16">
        <h2 class="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto">
          Everything you need to know about LangkahKecil
        </p>
      </div>
      <div class="max-w-3xl mx-auto space-y-6">
        <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 class="text-xl font-semibold text-gray-900 mb-2">What is LangkahKecil?</h3>
          <p class="text-gray-600">
            LangkahKecil is a comprehensive platform designed to help parents track their child's autism progress. It enables collaboration with therapists, daily activity logging, and progress visualization.
          </p>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Is there a free trial?</h3>
          <p class="text-gray-600">
            Yes! We offer a free trial plan that allows you to explore all features. You can upgrade to a paid plan when you're ready for extended access and AI-powered insights.
          </p>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 class="text-xl font-semibold text-gray-900 mb-2">How does therapist collaboration work?</h3>
          <p class="text-gray-600">
            Therapists can be linked to your child's profile. They can view your daily logs, add session notes, set goals, and provide feedback. Everything is synchronized in real-time.
          </p>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Is my data secure?</h3>
          <p class="text-gray-600">
            Absolutely. We use industry-standard encryption and follow strict privacy guidelines. Your child's data is never shared with third parties without your explicit consent.
          </p>
        </div>
        <div class="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 class="text-xl font-semibold text-gray-900 mb-2">Can I export my data?</h3>
          <p class="text-gray-600">
            Yes, you can generate comprehensive reports and export your data at any time. All your progress logs and reports are available for download.
          </p>
        </div>
      </div>
    `,
  },
];

async function main() {
  console.log('Seeding landing page CMS content...');

  for (const section of landingPageSections) {
    try {
      // Check if content already exists
      const existing = await prisma.cMSContent.findUnique({
        where: { slug: section.slug },
      });

      if (existing) {
        // Update existing content
        await prisma.cMSContent.update({
          where: { slug: section.slug },
          data: {
            title: section.title,
            content_html: section.content_html.trim(),
            updated_at: new Date(),
          },
        });
        console.log(`✓ Updated: ${section.title} (${section.slug})`);
      } else {
        // Create new content
        await prisma.cMSContent.create({
          data: {
            slug: section.slug,
            title: section.title,
            content_html: section.content_html.trim(),
            status: 'published',
            updated_at: new Date(),
          },
        });
        console.log(`✓ Created: ${section.title} (${section.slug})`);
      }
    } catch (error) {
      console.error(`✗ Error processing ${section.slug}:`, error);
    }
  }

  console.log('\nLanding page CMS content seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

