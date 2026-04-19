import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, CheckCircle2, XCircle, Clock, Loader2,
  TrendingUp, ArrowRight, Plus, Zap
} from 'lucide-react';
import { tasksApi } from '../services/api';
import { useAuthStore } from '../store/auth.store';
import clsx from 'clsx';
import { formatDistanceToNow } from 'date-fns';

function StatCard({ label, value, icon: Icon, color, glow, sub }) {
  return (
    <div className={clsx('card relative overflow-hidden group glass-hover', glow)}>
      <div className="flex items-start justify-between mb-4">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <TrendingUp className="w-4 h-4 text-gray-700 group-hover:text-gray-500 transition-colors" />
      </div>
      <p className="font-display text-3xl font-bold text-white mb-1 tabular-nums">{value ?? '—'}</p>
      <p className="text-sm text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-700 mt-1">{sub}</p>}
      {/* Subtle corner glow */}
      <div className={clsx('absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none', color)} />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: 'tag-pending',
    running: 'tag-running',
    success: 'tag-success',
    failed:  'tag-failed',
  };
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', map[status] || 'bg-white/10 text-gray-400')}>
      {status}
    </span>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['task-stats'],
    queryFn: () => tasksApi.getStats(),
    refetchInterval: 3000,
    select: (d) => d.data.data.stats,
  });

  const { data: recentData, isLoading: recentLoading } = useQuery({
    queryKey: ['tasks-recent'],
    queryFn: () => tasksApi.getAll({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
    refetchInterval: 3000,
    select: (d) => d.data.data,
  });

  const stats = statsData;
  const recentTasks = recentData || [];

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-gray-500 text-sm mb-1 flex items-center gap-2">
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </p>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-white">
            {greeting}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here's what's happening with your tasks.</p>
        </div>
        <Link to="/tasks" className="btn-primary">
          <Plus className="w-4 h-4" /> New Task
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Tasks"
          value={statsLoading ? '…' : stats?.total}
          icon={Zap}
          color="bg-accent/20 text-accent-light"
          sub="all time"
        />
        <StatCard
          label="Successful"
          value={statsLoading ? '…' : stats?.success}
          icon={CheckCircle2}
          color="bg-emerald-500/20 text-emerald-400"
          sub={stats?.total ? `${Math.round((stats.success / stats.total) * 100)}% success rate` : ''}
        />
        <StatCard
          label="Pending / Running"
          value={statsLoading ? '…' : (stats?.pending ?? 0) + (stats?.running ?? 0)}
          icon={Clock}
          color="bg-amber-500/20 text-amber-400"
          sub="in queue"
        />
        <StatCard
          label="Failed"
          value={statsLoading ? '…' : stats?.failed}
          icon={XCircle}
          color="bg-red-500/20 text-red-400"
          sub={stats?.avgProcessingMs ? `avg ${Math.round(stats.avgProcessingMs)}ms` : ''}
        />
      </div>

      {/* Recent Tasks */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-lg font-semibold text-white">Recent Tasks</h2>
          <Link to="/tasks" className="btn-ghost text-xs">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : recentTasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-accent/60" />
            </div>
            <p className="text-gray-500 text-sm">No tasks yet.</p>
            <Link to="/tasks" className="btn-primary mt-4 inline-flex">
              <Plus className="w-4 h-4" /> Create your first task
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <div key={task._id}
                className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/[0.03] transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{task.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5 font-mono">{task.operation}</p>
                </div>
                <StatusBadge status={task.status} />
                <span className="text-xs text-gray-700 hidden sm:block flex-shrink-0">
                  {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                </span>
                {task.status === 'running' && (
                  <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
