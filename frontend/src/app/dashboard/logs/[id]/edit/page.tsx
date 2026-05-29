'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, ParentLog, Child } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
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

export default function EditLogPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();
  const [log, setLog] = useState<ParentLog | null>(null);
  const [formData, setFormData] = useState({
    log_date: '',
    duration_hours: '3',
    activities: '',
    behavior_notes: '',
  });
  const [skills, setSkills] = useState<ParentLog['skills_practiced']>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/dashboard');
      return;
    }
    fetchLog();
  }, [params.id, user, router]);

  const fetchLog = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<ParentLog>>(`/parent-logs/${params.id}`);
      if (response.data.success && response.data.data) {
        const logData = response.data.data;
        setLog(logData);
        
        // Check if user is the creator
        if (user && logData.creator_id !== user.id && user.role !== 'admin') {
          setError('You can only edit logs that you created');
          return;
        }
        
        setSkills(logData.skills_practiced || []);
        const dh =
          logData.duration_hours != null && Number.isFinite(logData.duration_hours)
            ? String(logData.duration_hours)
            : '3';
        setFormData({
          log_date: new Date(logData.log_date).toISOString().split('T')[0],
          duration_hours: dh,
          activities: logData.activities,
          behavior_notes: logData.behavior_notes || '',
        });
      } else {
        setError('Log not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load log');
    } finally {
      setLoading(false);
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
    if (!trimmed) return;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

    if (!log) return;

    setSaving(true);

    try {
      const response = await apiClient.put<ApiResponse<ParentLog>>(`/parent-logs/${log.id}`, {
        log_date: formData.log_date,
        duration_hours: durationHours,
        skills_practiced: skills,
        activities: formData.activities,
        rating: overallRating,
        behavior_notes: formData.behavior_notes || undefined,
      });

      if (response.data.success) {
        router.push('/dashboard/logs');
      } else {
        setError(response.data.error || 'Failed to update log');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update log');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error && !log) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/dashboard/logs')}>Back to Logs</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!log) {
    return null;
  }

  // Check if user is the creator
  if (user && log.creator_id !== user.id && user.role !== 'admin') {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">You can only edit logs that you created</p>
          <Button onClick={() => router.push('/dashboard/logs')}>Back to Logs</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (log.status !== 'pending') {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Cannot edit log that has been reviewed</p>
          <Button onClick={() => router.push('/dashboard/logs')}>Back to Logs</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Activity Log</h1>
          <p className="text-gray-600 mt-1">
            Log for {log.child?.name} - {new Date(log.log_date).toLocaleDateString()}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

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
            How long this session or activity lasted.
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
              placeholder="Describe the activities your child engaged in..."
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
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Saving...' : 'Update Log'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/logs')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

