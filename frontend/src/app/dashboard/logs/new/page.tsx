'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, Child, SkillRating } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isClinicalOrAdmin } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const COMMON_SKILLS = [
  'Eye Contact',
  'Communication',
  'Social Interaction',
  'Fine Motor Skills',
  'Gross Motor Skills',
  'Self-Care',
  'Play Skills',
  'Emotional Regulation',
  'Following Instructions',
  'Problem Solving',
];

function NewLogPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const isTherapist = isClinicalOrAdmin(user?.role);
  const isParent = user?.role === 'parent' || user?.role === 'admin';
  
  const [children, setChildren] = useState<Child[]>([]);
  
  // Unified log form data (used by both parents and therapists)
  const [formData, setFormData] = useState({
    child_id: '',
    log_date: new Date().toISOString().split('T')[0],
    duration_hours: '3',
    activities: '',
    behavior_notes: '',
  });
  const [skills, setSkills] = useState<SkillRating[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!user || (!isParent && !isTherapist)) {
      router.push('/dashboard');
      return;
    }
    fetchChildren();
  }, [user, router]);

  const fetchChildren = async () => {
    try {
      const response = await apiClient.get<ApiResponse<Child[]>>('/children');
      if (response.data.success) {
        setChildren(response.data.data || []);
        if (response.data.data && response.data.data.length > 0) {
          const childIdFromUrl = searchParams?.get('childId');
          setFormData((prev) => ({
            ...prev,
            child_id: childIdFromUrl || response.data.data![0].id.toString(),
          }));
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load children');
    } finally {
      setLoadingChildren(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setSkills((prev) => {
      const exists = prev.some((s) => s.name === skill);
      if (exists) {
        return prev.filter((s) => s.name !== skill);
      }
      return [...prev, { name: skill, rating: 3 }];
    });
  };

  const handleSkillRating = (skillName: string, rating: number) => {
    setSkills((prev) =>
      prev.map((skill) =>
        skill.name === skillName ? { ...skill, rating } : skill
      )
    );
  };

  const handleAddCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (!trimmed) {
      return;
    }
    const exists = skills.some(
      (skill) => skill.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (!exists) {
      setSkills((prev) => [...prev, { name: trimmed, rating: 3 }]);
    }
    setCustomSkill('');
  };

  const overallRating = skills.length
    ? Math.round(
        skills.reduce((sum, skill) => sum + skill.rating, 0) / skills.length
      )
    : 0;

  // Unified submit handler (for both parents and therapists)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.child_id) {
      setError('Please select a child');
      return;
    }

    if (skills.length === 0) {
      setError('Please select at least one skill practiced');
      return;
    }

    if (!formData.activities.trim()) {
      setError('Please describe the activities');
      return;
    }

    const durationHours = parseFloat(formData.duration_hours);
    if (!Number.isFinite(durationHours) || durationHours < 0.25 || durationHours > 72) {
      setError('Duration must be between 0.25 and 72 hours');
      return;
    }

    setLoading(true);

    try {
      const response = await apiClient.post<ApiResponse<any>>('/parent-logs', {
        child_id: parseInt(formData.child_id),
        log_date: formData.log_date,
        duration_hours: durationHours,
        skills_practiced: skills,
        activities: formData.activities,
        rating: overallRating,
        behavior_notes: formData.behavior_notes || undefined,
      });

      if (response.data.success) {
        // Always redirect back to child page if childId is present (for both therapist and parent)
        const childIdFromUrl = searchParams?.get('childId');
        if (childIdFromUrl) {
          // If we came from a child detail page, redirect back there
          router.push(`/dashboard/children/${childIdFromUrl}`);
        } else if (isTherapist && !isParent) {
          router.push('/dashboard/sessions');
        } else {
          router.push('/dashboard/logs');
        }
      } else {
        setError(response.data.error || 'Failed to create log');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create log');
    } finally {
      setLoading(false);
    }
  };

  if (loadingChildren) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (children.length === 0) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No children found. Please add a child first.</p>
          <Button onClick={() => router.push('/dashboard/children/new')}>
            Add Child
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Render unified log form (for both parents and therapists)
  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">New Activity Log</h1>
          <p className="text-gray-600 mt-1">
            {isTherapist && !isParent
              ? 'Record therapy session activities and progress'
              : "Record your child's daily activities and progress"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Child *
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.child_id}
              onChange={(e) => setFormData({ ...formData, child_id: e.target.value })}
              required
            >
              <option value="">Select a child</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Date *"
            type="date"
            required
            value={formData.log_date}
            onChange={(e) => setFormData({ ...formData, log_date: e.target.value })}
            max={new Date().toISOString().split('T')[0]}
          />

          <Input
            label="Duration (hours) *"
            type="number"
            required
            min={0.25}
            max={72}
            step={0.25}
            value={formData.duration_hours}
            onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
          />
          <p className="text-xs text-gray-500 mt-1">
            How long this session or activity lasted. Default is 3 hours.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Skills Practiced * (Select all that apply)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              {COMMON_SKILLS.map((skill) => {
                const isSelected = skills.some((s) => s.name === skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add custom skill"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={handleAddCustomSkill}>
                Add
              </Button>
            </div>
          </div>

          {skills.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                <div>
                  <p className="text-sm text-blue-900 font-medium">Overall Rating</p>
                  <p className="text-xs text-blue-700">
                    Automatically averaged from each skill&apos;s rating
                  </p>
                </div>
                <div className="text-3xl">
                  {['😞', '😐', '🙂', '😊', '😄'][Math.max(overallRating - 1, 0)]}
                </div>
                <span className="text-blue-900 font-semibold text-xl">{overallRating}/5</span>
              </div>

              <div className="space-y-3">
                {skills.map((skill) => (
                  <div
                    key={skill.name}
                    className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{skill.name}</span>
                      <button
                        type="button"
                        className="text-sm text-red-500 hover:text-red-700"
                        onClick={() => toggleSkill(skill.name)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">Skill rating:</span>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => handleSkillRating(skill.name, rating)}
                            className={`w-8 h-8 rounded-full border text-sm font-semibold transition ${
                              skill.rating === rating
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                            }`}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activities * (Describe what activities were done)
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
              value={formData.activities}
              onChange={(e) => setFormData({ ...formData, activities: e.target.value })}
              placeholder={isTherapist && !isParent 
                ? "Describe the activities during the therapy session..."
                : "Describe the activities your child engaged in today..."}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Behavior Notes (Optional)
            </label>
            <textarea
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              value={formData.behavior_notes}
              onChange={(e) => setFormData({ ...formData, behavior_notes: e.target.value })}
              placeholder="Any notable behaviors, challenges, or successes..."
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Saving...' : 'Save Log'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCancelConfirm(true)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Are you sure want to <strong className="font-bold">CANCEL</strong> the Log submission?
              </h3>
              <p className="text-gray-600 mb-6">
                All the information you have filled will be lost if you proceed.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  No
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => router.push(isTherapist && !isParent ? '/dashboard/sessions' : '/dashboard/logs')}
                >
                  Yes, Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function NewLogPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Loading...</p>
        </div>
      </DashboardLayout>
    }>
      <NewLogPageContent />
    </Suspense>
  );
}

