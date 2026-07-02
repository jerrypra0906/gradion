import { CMSContent } from '@/lib/api';
import { parseLandingSection } from '@/lib/landingCms';
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardList,
  Shield,
  Users,
} from 'lucide-react';

interface FeatureGridSectionProps {
  cmsContent: CMSContent | null;
  loading: boolean;
}

const featureIcons = [ClipboardList, Users, BarChart3, BookOpen, Shield, Calendar];
const featureColors = [
  'text-blue-600 bg-blue-50',
  'text-emerald-600 bg-emerald-50',
  'text-violet-600 bg-violet-50',
  'text-orange-600 bg-orange-50',
  'text-rose-600 bg-rose-50',
  'text-cyan-600 bg-cyan-50',
];

export function FeatureGridSection({ cmsContent, loading }: FeatureGridSectionProps) {
  const content = parseLandingSection('features', cmsContent);

  return (
    <section className="py-20 bg-white" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14 max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A2B4C] mb-4">{content.title}</h2>
          {loading ? (
            <div className="h-8 bg-gray-100 animate-pulse rounded max-w-xl mx-auto" />
          ) : (
            <p className="text-lg text-gray-600">{content.subtitle}</p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.features.map((feature, index) => {
            const Icon = featureIcons[index % featureIcons.length];
            const color = featureColors[index % featureColors.length];
            return (
              <div
                key={`${feature.title}-${index}`}
                className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${color}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-[#1A2B4C] mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
