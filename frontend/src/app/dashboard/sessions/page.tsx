'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { apiClient, Session, ApiResponse } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { isClinicalOrAdmin } from '@/lib/roles';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function SessionsPage() {
  const { user } = useAuthStore();
  const pathname = usePathname();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user && isClinicalOrAdmin(user.role)) {
      fetchSessions();
    }
  }, [user, pathname]); // Refetch when pathname changes (e.g., after navigation)

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ApiResponse<Session[]>>('/sessions');
      if (response.data.success) {
        setSessions(response.data.data || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  };

  if (!user || !isClinicalOrAdmin(user.role)) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sessions</h1>
            <p className="mt-2 text-gray-600">View and manage therapy sessions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchSessions} disabled={loading}>
              Refresh
            </Button>
            <Link href="/dashboard/sessions/new">
              <Button>Record New Session</Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No sessions found</p>
            <Link href="/dashboard/sessions/new">
              <Button>Record Your First Session</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {sessions.map((session) => (
                <li key={session.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">
                                {session.child?.name || `Child #${session.child_id}`}
                              </p>
                              {session.status && (
                                <span
                                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    session.status === 'approved'
                                      ? 'bg-green-100 text-green-800'
                                      : session.status === 'flagged'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {session.status}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {new Date(session.date).toLocaleDateString()} •{' '}
                              {session.duration_minutes} minutes
                            </p>
                            {session.goals_worked_on && session.goals_worked_on.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {session.goals_worked_on.map((goal, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                  >
                                    {goal}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 text-right">
                        {session.therapist && (
                          <p className="text-sm font-medium text-gray-900">
                            {session.therapist.name}
                          </p>
                        )}
                        <Link
                          href={`/dashboard/children/${session.child_id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          View Child
                        </Link>
                      </div>
                    </div>
                    {session.notes && (
                      <p className="mt-2 text-sm text-gray-600">{session.notes}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

