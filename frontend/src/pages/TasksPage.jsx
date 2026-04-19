import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Loader2, RefreshCw, Trash2, RotateCcw,
  ChevronLeft, ChevronRight, Terminal, X, ListTodo,
  CheckCircle2, XCircle, Clock, Play, FileText
} from 'lucide-react';
import { tasksApi } from '../services/api';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { formatDistanceToNow, format } from 'date-fns';

// ── Constants ────────────────────────────────────────────────────────────────
const OPERATIONS = [
  { value: 'uppercase',   label: 'Uppercase',     desc: 'Convert text to ALL CAPS' },
  { value: 'lowercase',   label: 'Lowercase',     desc: 'Convert text to all lowercase' },
  { value: 'reverse',     label: 'Reverse String', desc: 'Reverse the entire string' },
  { value: 'word_count',  label: 'Word Count',    desc: 'Analyze word frequency & stats' },
];

const STATUS_TABS = [
  { value: 'all',     label: 'All',      icon: ListTodo },
  { value: 'pending', label: 'Pending',  icon: Clock },
  { value: 'running', label: 'Running',  icon: Play },
  { value: 'success', label: 'Success',  icon: CheckCircle2 },
  { value: 'failed',  label: 'Failed',   icon: XCircle },
];

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending: { cls: 'tag-pending', dot: 'bg-amber-400' },
    running: { cls: 'tag-running', dot: 'bg-blue-400 animate-pulse' },
    success: { cls: 'tag-success', dot: 'bg-emerald-400' },
    failed:  { cls: 'tag-failed',  dot: 'bg-red-400' },
  };
  const s = map[status] || { cls: 'bg-white/10 text-gray-400', dot: 'bg-gray-400' };
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', s.cls)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', s.dot)} />
      {status}
    </span>
  );
}

// ── Create Task Modal ─────────────────────────────────────────────────────────
function CreateTaskModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', inputText: '', operation: 'uppercase' });
  const [errors, setErrors] = useState({});

  const { mutate, isPending } = useMutation({
    mutationFn: tasksApi.create,
    onSuccess: () => {
      toast.success('Task created and queued!');
      setForm({ title: '', inputText: '', operation: 'uppercase' });
      onSuccess();
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create task'),
  });

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.inputText.trim()) errs.inputText = 'Input text is required';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    mutate(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg glass rounded-2xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div>
            <h2 className="font-display text-lg font-bold text-white">New AI Task</h2>
            <p className="text-xs text-gray-500 mt-0.5">Configure and queue your task</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">Task Title</label>
            <input
              type="text" value={form.title} placeholder="e.g. Process customer feedback"
              onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); setErrors((p) => ({ ...p, title: '' })); }}
              className={clsx('input-field', errors.title && 'border-red-500/50')}
            />
            {errors.title && <p className="mt-1 text-xs text-red-400">{errors.title}</p>}
          </div>

          {/* Operation */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">Operation</label>
            <div className="grid grid-cols-2 gap-2">
              {OPERATIONS.map((op) => (
                <button key={op.value} type="button"
                  onClick={() => setForm((p) => ({ ...p, operation: op.value }))}
                  className={clsx(
                    'p-3 rounded-xl border text-left transition-all duration-150',
                    form.operation === op.value
                      ? 'bg-accent/15 border-accent/40 text-white'
                      : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:border-white/20 hover:text-gray-300'
                  )}>
                  <p className="text-xs font-semibold mb-0.5">{op.label}</p>
                  <p className="text-[10px] opacity-60 leading-tight">{op.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Input text */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Input Text <span className="text-gray-700 normal-case tracking-normal">({form.inputText.length}/5000)</span>
            </label>
            <textarea
              rows={5} value={form.inputText}
              placeholder="Enter the text you want to process…"
              onChange={(e) => { setForm((p) => ({ ...p, inputText: e.target.value })); setErrors((p) => ({ ...p, inputText: '' })); }}
              className={clsx('input-field resize-none font-mono text-xs', errors.inputText && 'border-red-500/50')}
              maxLength={5000}
            />
            {errors.inputText && <p className="mt-1 text-xs text-red-400">{errors.inputText}</p>}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1 justify-center">
              {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Queuing…</> : <><Play className="w-4 h-4" /> Run Task</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Task Detail Drawer ───────────────────────────────────────────────────────
function TaskDetailDrawer({ task, onClose }) {
  if (!task) return null;

  let parsedResult = null;
  if (task.operation === 'word_count' && task.result) {
    try { parsedResult = JSON.parse(task.result); } catch (_) {}
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full glass border-l border-white/[0.08] flex flex-col animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="font-display text-base font-bold text-white truncate">{task.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">{task.operation} · {task._id?.slice(-8)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-all flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status & meta */}
          <div className="flex items-center gap-3 flex-wrap">
            <StatusBadge status={task.status} />
            {task.processingTimeMs && (
              <span className="text-xs text-gray-600">{task.processingTimeMs}ms</span>
            )}
            <span className="text-xs text-gray-700 ml-auto">
              {format(new Date(task.createdAt), 'MMM d, yyyy HH:mm')}
            </span>
          </div>

          {/* Input */}
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Input</p>
            <div className="bg-black/30 rounded-xl p-4 border border-white/[0.05]">
              <p className="text-xs text-gray-400 font-mono whitespace-pre-wrap break-words">{task.inputText}</p>
            </div>
          </div>

          {/* Result */}
          {task.result && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Result</p>
              <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/15">
                {parsedResult ? (
                  <div className="space-y-2">
                    <div className="flex gap-4 flex-wrap">
                      <div className="text-center">
                        <p className="font-display text-2xl font-bold text-emerald-400">{parsedResult.total_words}</p>
                        <p className="text-[10px] text-gray-600">Total words</p>
                      </div>
                      <div className="text-center">
                        <p className="font-display text-2xl font-bold text-emerald-400">{parsedResult.unique_words}</p>
                        <p className="text-[10px] text-gray-600">Unique words</p>
                      </div>
                      <div className="text-center">
                        <p className="font-display text-2xl font-bold text-emerald-400">{parsedResult.character_count}</p>
                        <p className="text-[10px] text-gray-600">Characters</p>
                      </div>
                    </div>
                    {parsedResult.top_words?.length > 0 && (
                      <div>
                        <p className="text-[10px] text-gray-600 mb-1.5">Top words</p>
                        <div className="flex flex-wrap gap-1.5">
                          {parsedResult.top_words.slice(0, 8).map((w) => (
                            <span key={w.word} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20">
                              {w.word} <span className="opacity-60">×{w.count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-words">{task.result}</p>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {task.errorMessage && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Error</p>
              <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/15">
                <p className="text-xs text-red-400 font-mono">{task.errorMessage}</p>
              </div>
            </div>
          )}

          {/* Logs */}
          {task.logs?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Terminal className="w-3 h-3" /> Execution Logs
              </p>
              <div className="bg-black/40 rounded-xl p-4 border border-white/[0.05] space-y-1.5 max-h-48 overflow-y-auto">
                {task.logs.map((log, i) => (
                  <div key={i} className="flex gap-2 text-[11px] font-mono">
                    <span className="text-gray-700 flex-shrink-0">
                      {format(new Date(log.timestamp), 'HH:mm:ss')}
                    </span>
                    <span className={clsx('flex-shrink-0',
                      log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-amber-400' : 'text-gray-600')}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-gray-400">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tasks Page ────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const queryParams = {
    page, limit: 15, status: statusFilter, search: search || undefined,
    sortBy: 'createdAt', sortOrder: 'desc',
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['tasks', queryParams],
    queryFn: () => tasksApi.getAll(queryParams),
    refetchInterval: 3000,
    select: (d) => d.data,
  });

  const tasks = data?.data || [];
  const pagination = data?.pagination || {};

  const deleteMutation = useMutation({
    mutationFn: tasksApi.delete,
    onSuccess: () => {
      toast.success('Task deleted');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const retryMutation = useMutation({
    mutationFn: tasksApi.retry,
    onSuccess: () => {
      toast.success('Task queued for retry');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error('Failed to retry task'),
  });

  const handleDelete = useCallback((e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this task?')) deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleRetry = useCallback((e, id) => {
    e.stopPropagation();
    retryMutation.mutate(id);
  }, [retryMutation]);

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-gray-500 text-sm mb-1 flex items-center gap-2">
            <ListTodo className="w-3.5 h-3.5" /> Tasks
          </p>
          <h1 className="font-display text-2xl font-bold text-white">Task Manager</h1>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && !isLoading && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <RefreshCw className="w-3 h-3 animate-spin" /> Syncing
            </div>
          )}
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status tabs */}
        <div className="flex gap-1 p-1 glass rounded-xl flex-wrap">
          {STATUS_TABS.map(({ value, label, icon: Icon }) => (
            <button key={value} onClick={() => handleStatusChange(value)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                statusFilter === value
                  ? 'bg-accent/20 text-accent-light border border-accent/30'
                  : 'text-gray-500 hover:text-gray-300'
              )}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text" value={search} onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search tasks…"
            className="input-field pl-9 py-2 text-xs"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-accent/60" />
            </div>
            <p className="text-gray-400 font-medium mb-1">No tasks found</p>
            <p className="text-gray-600 text-sm">
              {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first task to get started'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Title', 'Operation', 'Status', 'Created', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-6 py-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {tasks.map((task) => (
                    <tr key={task._id} onClick={() => setSelectedTask(task)}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors group">
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-sm font-medium text-gray-200 truncate">{task.title}</p>
                        <p className="text-xs text-gray-600 truncate mt-0.5">{task.inputText?.slice(0, 40)}…</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-gray-500 bg-white/[0.05] px-2 py-1 rounded-lg border border-white/[0.06]">
                          {task.operation}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600 whitespace-nowrap">
                        {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {task.status === 'failed' && (
                            <button onClick={(e) => handleRetry(e, task._id)}
                              disabled={retryMutation.isPending}
                              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-gray-600 hover:text-blue-400 transition-colors"
                              title="Retry">
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={(e) => handleDelete(e, task._id)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors"
                            title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-white/[0.04]">
              {tasks.map((task) => (
                <div key={task._id} onClick={() => setSelectedTask(task)}
                  className="p-4 hover:bg-white/[0.02] transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-medium text-gray-200 flex-1 truncate">{task.title}</p>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded">{task.operation}</span>
                    <span className="text-xs text-gray-700">{formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
                    <div className="ml-auto flex gap-1">
                      {task.status === 'failed' && (
                        <button onClick={(e) => handleRetry(e, task._id)}
                          className="p-1.5 rounded hover:bg-blue-500/10 text-gray-600 hover:text-blue-400 transition-colors">
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={(e) => handleDelete(e, task._id)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
                <p className="text-xs text-gray-600">
                  Page {pagination.page} of {pagination.totalPages} · {pagination.total} tasks
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage((p) => p - 1)} disabled={!pagination.hasPrev}
                    className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setPage((p) => p + 1)} disabled={!pagination.hasNext}
                    className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <CreateTaskModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['tasks'] });
          queryClient.invalidateQueries({ queryKey: ['task-stats'] });
        }}
      />
      <TaskDetailDrawer task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
}
