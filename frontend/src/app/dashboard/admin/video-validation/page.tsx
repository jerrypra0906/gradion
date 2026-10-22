'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import {
  apiClient,
  ApiResponse,
  AdminProgramVideoListItem,
  AdminProgramVideoStats,
} from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { clock, scoreClass } from '@/lib/videoValidation';

type ReviewFilter = 'pending' | 'approved' | 'rejected' | 'all';

function StatusChip({ v }: { v: AdminProgramVideoListItem }) {
  let label: string;
  let cls: string;
  if (v.review_status === 'approved') {
    label = 'Approved';
    cls = 'bg-green-100 text-green-800';
  } else if (v.review_status === 'rejected') {
    label = 'Rejected';
    cls = 'bg-red-100 text-red-800';
  } else if (v.status === 'queued' || v.status === 'analyzing') {
    label = 'AI analyzing…';
    cls = 'bg-blue-100 text-blue-800';
  } else if (v.status === 'manual_review') {
    label = 'Manual review';
    cls = 'bg-purple-100 text-purple-800';
  } else {
    label = 'Ready for review';
    cls = 'bg-amber-100 text-amber-800';
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`} title={v.ai_error || undefined}>
      {label}
    </span>
  );
}

export default function AdminVideoValidationPage() {
  const { user } = useAuthStore();
  const canAccess = user?.role === 'admin';

  const [filter, setFilter] = useState<ReviewFilter>('pending');
  const [search, setSearch] = useState('');
  const [videos, setVideos] = useState<AdminProgramVideoListItem[]>([]);
  const [stats, setStats] = useState<AdminProgramVideoStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get<
        ApiResponse<{ videos: AdminProgramVideoListItem[]; stats: AdminProgramVideoStats }>
      >(`/program-videos/admin/videos?review_status=${filter}`);
      if (res.data.success && res.data.data) {
        setVideos(res.data.data.videos);
        setStats(res.data.data.stats);
      } else {
        setError(res.data.error || 'Failed to load videos');
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (canAccess) void load();
  }, [canAccess, load]);

  // Analyses finish in the background; refresh while any are in flight.
  useEffect(() => {
    if (!canAccess) return;
    const inFlight = videos.some((v) => v.status === 'queued' || v.status === 'analyzing');
    if (!inFlight) return;
    const t = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(t);
  }, [canAccess, videos, load]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return videos;
    return videos.filter(
      (v) =>
        v.child.name.toLowerCase().includes(q) ||
        v.program_name.toLowerCase().includes(q) ||
        v.uploader.name.toLowerCase().includes(q),
    );
  }, [videos, search]);

  if (!canAccess) {
    return (
      <DashboardLayout>
        <div className="px-4 py-6">
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            Access denied. Admin only.
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const agreement = stats?.agreement_30d;

  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 py-6 sm:px-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Video Validation</h1>
          <p className="mt-2 text-gray-600">
            Parents&apos; practice videos with the AI&apos;s fidelity check against each program&apos;s
            guidance. Watch, correct the AI where needed, then approve to share feedback with the
            family. Every review also teaches the AI.
          </p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-2xl font-bold text-gray-900">{stats.awaiting_review}</div>
              <div className="text-sm text-gray-500">Awaiting review</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-2xl font-bold text-gray-900">{stats.processing}</div>
              <div className="text-sm text-gray-500">AI analyzing</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-2xl font-bold text-gray-900">{stats.approved}</div>
              <div className="text-sm text-gray-500">Approved</div>
            </div>
            <div className="rounded-lg bg-white p-4 shadow">
              <div className="text-2xl font-bold text-gray-900">{stats.rejected}</div>
              <div className="text-sm text-gray-500">Rejected</div>
            </div>
            <div className="col-span-2 rounded-lg bg-white p-4 shadow lg:col-span-1">
              <div className="text-2xl font-bold text-gray-900">
                {agreement?.within_10_points_pct !== null && agreement?.within_10_points_pct !== undefined
                  ? `${agreement.within_10_points_pct}%`
                  : '—'}
              </div>
              <div className="text-sm text-gray-500">AI within 10 pts of admin (30d)</div>
              <div className="mt-1 text-xs text-gray-500">
                {agreement && agreement.reviews > 0
                  ? `avg gap ${agreement.mean_abs_score_gap} pts · ${agreement.reviews} reviews`
                  : 'No reviews yet'}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-gray-700">Status:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ReviewFilter)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
          <div className="relative ml-auto w-full sm:w-80">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search child, program or parent…"
              aria-label="Search videos"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-600 focus:border-[#00C1B2] focus:outline-none focus:ring-2 focus:ring-[#00C1B2]/30"
            />
          </div>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['Child', 'Program', 'Source', 'Length', 'AI score', 'Final', 'Status', 'Uploaded', ''].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {shown.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-sm text-gray-500">
                    {loading ? 'Loading…' : 'No videos here.'}
                  </td>
                </tr>
              )}
              {shown.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">
                    <div className="font-medium text-gray-900">{v.child.name}</div>
                    <div className="text-xs text-gray-500">{v.uploader.name}</div>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-800">{v.program_name}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {v.source === 'recording' ? 'Recorded in app' : 'Uploaded'}
                  </td>
                  <td className="px-3 py-2 text-sm tabular-nums text-gray-600">{clock(v.duration_seconds)}</td>
                  <td className="px-3 py-2 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreClass(v.ai_score)}`}>
                      {v.ai_score ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    {v.final_score !== null ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${scoreClass(v.final_score)}`}>
                        {v.final_score}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <StatusChip v={v} />
                    {v.video_deleted_at && (
                      <div className="mt-0.5 text-[11px] text-gray-500">video file expired</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {new Date(v.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-sm">
                    <Link
                      href={`/dashboard/admin/video-validation/${v.id}`}
                      className="font-semibold text-[#00736C] underline underline-offset-2 hover:text-[#005E58]"
                    >
                      {v.review_status === 'pending' ? 'Review' : 'Open'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
