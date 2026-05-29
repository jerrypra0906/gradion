'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, ApiResponse, ParentLog } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { isClinicalStaff } from '@/lib/roles';

export default function LogsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [logs, setLogs] = useState<ParentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'flagged'>('all');

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user, filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const response = await apiClient.get<ApiResponse<ParentLog[]>>(`/parent-logs${params}`);
      if (response.data.success) {
        setLogs(response.data.data || []);
      } else {
        setError(response.data.error || 'Failed to load logs');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'flagged':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCreatorBadgeColor = (role: string) => {
    switch (role) {
      case 'parent':
        return 'bg-green-100 text-green-800';
      case 'therapist':
        return 'bg-blue-100 text-blue-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user.role === 'parent' ? t('myLogs') : t('activityLogs')}
            </h1>
            <p className="text-gray-600 mt-1">
              {user.role === 'parent'
                ? 'View all your activity logs'
                : isClinicalStaff(user.role)
                  ? 'View activity logs for your assigned children'
                  : 'View all activity logs'}
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="mb-4 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-yellow-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilter('flagged')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'flagged'
                ? 'bg-red-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Flagged
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="rounded border border-gray-200 bg-white p-8 text-center text-gray-500 shadow-sm">
            {filter === 'all'
              ? 'No logs found. Create your first activity log from a child\'s page.'
              : `No ${filter} logs found.`}
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      {log.child && (
                        <Link
                          href={`/dashboard/children/${log.child.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600"
                        >
                          {log.child.name}
                        </Link>
                      )}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                          log.status
                        )}`}
                      >
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                      {log.creator && (
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${getCreatorBadgeColor(
                            log.creator.role
                          )}`}
                        >
                          {log.creator.role.charAt(0).toUpperCase() + log.creator.role.slice(1)}: {log.creator.name}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 mb-1">
                      {new Date(log.log_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-500 mb-3">
                      Duration:{' '}
                      <span className="text-gray-700 font-medium">
                        {(log.duration_hours ?? 3) % 1 === 0
                          ? (log.duration_hours ?? 3)
                          : Number((log.duration_hours ?? 3).toFixed(2))}{' '}
                        hours
                      </span>
                    </p>

                    {log.skills_practiced && log.skills_practiced.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Skills Practiced:</p>
                        <div className="flex flex-wrap gap-2">
                          {log.skills_practiced.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-50 text-blue-800 text-sm rounded-full"
                            >
                              {skill.name} ({skill.rating}/5)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {log.activities && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Activities:</p>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{log.activities}</p>
                      </div>
                    )}

                    {log.rating && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700">
                          Overall Rating: <span className="text-blue-600">{log.rating}/5</span>
                        </p>
                      </div>
                    )}

                    {log.behavior_notes && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-1">Behavior Notes:</p>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{log.behavior_notes}</p>
                      </div>
                    )}

                    {log.ai_summary && (
                      <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <p className="text-sm font-medium text-purple-900 mb-1">AI Summary:</p>
                        <p className="text-sm text-purple-800 whitespace-pre-line">{log.ai_summary}</p>
                      </div>
                    )}

                    {log.therapist_comment && (
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-900 mb-1">Therapist Comment:</p>
                        <p className="text-sm text-blue-800 whitespace-pre-line">{log.therapist_comment}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-shrink-0 items-center gap-2">
                    <Link href={`/dashboard/logs/${log.id}/review`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    {log.child && (
                      <Link href={`/dashboard/children/${log.child.id}`}>
                        <Button variant="outline" size="sm">
                          View Child
                        </Button>
                      </Link>
                    )}
                    {/* Show Edit button only if user is the creator and log is pending */}
                    {log.status === 'pending' && log.creator_id === user?.id && (
                      <Link href={`/dashboard/logs/${log.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
