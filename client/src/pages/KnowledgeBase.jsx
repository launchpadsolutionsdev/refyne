import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getProject, getChunks, getChunkCategories, getChunkStats, getTags,
  updateChunk, deleteChunk, splitChunk, mergeChunks, bulkUpdateChunks,
  addTagToChunk, removeTagFromChunk,
} from '../api/client';

// ─── Status badge config ───
const STATUS_STYLES = {
  pending_review: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  approved: 'bg-green-50 text-green-700 border-green-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};
const STATUS_LABELS = {
  pending_review: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

// ─── Chunk Card ───
function ChunkCard({ chunk, nextChunk, onUpdate, onDelete, onRefresh }) {
  const [editing, setEditing] = useState(null); // null | 'title' | 'content' | 'summary' | 'category'
  const [editValue, setEditValue] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const contentRef = useRef(null);

  function startEdit(field) {
    setEditing(field);
    setEditValue(chunk[field] || '');
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    try {
      await onUpdate(chunk.id, { [editing]: editValue });
      setEditing(null);
    } catch { /* handled by parent */ }
    setSaving(false);
  }

  function cancelEdit() {
    setEditing(null);
    setEditValue('');
  }

  async function handleStatusChange(status) {
    await onUpdate(chunk.id, { status });
  }

  async function handleAddTag(e) {
    e.preventDefault();
    if (!tagInput.trim()) return;
    setSaving(true);
    try {
      await addTagToChunk(chunk.id, tagInput.trim());
      setTagInput('');
      setShowTagInput(false);
      onRefresh();
    } catch { /* ignore */ }
    setSaving(false);
  }

  async function handleRemoveTag(tagId) {
    try {
      await removeTagFromChunk(chunk.id, tagId);
      onRefresh();
    } catch { /* ignore */ }
  }

  async function handleSplit() {
    if (!contentRef.current) return;
    const pos = contentRef.current.selectionStart;
    if (!pos || pos < 1 || pos >= chunk.content.length) {
      alert('Place your cursor in the content where you want to split, then click Split.');
      return;
    }
    setSaving(true);
    try {
      await splitChunk(chunk.id, pos);
      setSplitMode(false);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  }

  async function handleMerge() {
    if (!nextChunk) return;
    setSaving(true);
    try {
      await mergeChunks([chunk.id, nextChunk.id]);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete chunk "${chunk.title}"?`)) return;
    await onDelete(chunk.id);
  }

  const statusStyle = STATUS_STYLES[chunk.status] || STATUS_STYLES.pending_review;
  const statusLabel = STATUS_LABELS[chunk.status] || chunk.status;

  return (
    <div className={`bg-white rounded-lg border p-5 transition-all ${
      chunk.status === 'approved' ? 'border-green-200' :
      chunk.status === 'rejected' ? 'border-red-200 opacity-60' :
      'border-gray-200'
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          {editing === 'title' ? (
            <div className="flex items-center gap-2">
              <input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 text-sm font-medium border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
              />
              <button onClick={saveEdit} disabled={saving} className="text-xs text-primary-600 hover:underline">Save</button>
              <button onClick={cancelEdit} className="text-xs text-gray-500 hover:underline">Cancel</button>
            </div>
          ) : (
            <h4
              className="text-sm font-semibold text-gray-900 cursor-pointer hover:text-primary-600 transition-colors"
              onClick={() => startEdit('title')}
              title="Click to edit title"
            >
              {chunk.title}
            </h4>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-400 tabular-nums">~{chunk.token_count} tok</span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyle}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Category */}
      <div className="mb-2">
        {editing === 'category' ? (
          <div className="flex items-center gap-2">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
            />
            <button onClick={saveEdit} disabled={saving} className="text-xs text-primary-600 hover:underline">Save</button>
            <button onClick={cancelEdit} className="text-xs text-gray-500 hover:underline">Cancel</button>
          </div>
        ) : (
          <span
            className="inline-flex text-xs text-gray-500 cursor-pointer hover:text-primary-600"
            onClick={() => startEdit('category')}
            title="Click to edit category"
          >
            {chunk.category}
          </span>
        )}
      </div>

      {/* Summary */}
      {editing === 'summary' ? (
        <div className="mb-3">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={2}
            autoFocus
          />
          <div className="flex gap-2 mt-1">
            <button onClick={saveEdit} disabled={saving} className="text-xs text-primary-600 hover:underline">Save</button>
            <button onClick={cancelEdit} className="text-xs text-gray-500 hover:underline">Cancel</button>
          </div>
        </div>
      ) : (
        <p
          className="text-xs text-gray-500 mb-3 cursor-pointer hover:text-gray-700 transition-colors"
          onClick={() => startEdit('summary')}
          title="Click to edit summary"
        >
          {chunk.summary}
        </p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {chunk.tags && chunk.tags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 group"
          >
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove tag"
            >
              &times;
            </button>
          </span>
        ))}
        {showTagInput ? (
          <form onSubmit={handleAddTag} className="inline-flex">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="tag name"
              className="text-xs border border-gray-300 rounded-full px-2 py-0.5 w-24 focus:outline-none focus:ring-1 focus:ring-primary-500"
              autoFocus
              onBlur={() => { if (!tagInput) setShowTagInput(false); }}
              onKeyDown={(e) => { if (e.key === 'Escape') { setShowTagInput(false); setTagInput(''); } }}
            />
          </form>
        ) : (
          <button
            onClick={() => setShowTagInput(true)}
            className="text-xs text-gray-400 hover:text-primary-600 transition-colors"
          >
            + tag
          </button>
        )}
      </div>

      {/* Content toggle / edit */}
      {splitMode ? (
        <div className="mb-3">
          <p className="text-xs text-primary-600 font-medium mb-1">Place cursor where you want to split, then click Split.</p>
          <textarea
            ref={contentRef}
            defaultValue={chunk.content}
            className="w-full text-xs font-mono border border-primary-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none bg-primary-50"
            rows={8}
          />
          <div className="flex gap-2 mt-1">
            <button onClick={handleSplit} disabled={saving} className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700">
              {saving ? 'Splitting...' : 'Split Here'}
            </button>
            <button onClick={() => setSplitMode(false)} className="text-xs text-gray-500 hover:underline">Cancel</button>
          </div>
        </div>
      ) : editing === 'content' ? (
        <div className="mb-3">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full text-xs font-mono border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={8}
          />
          <div className="flex gap-2 mt-1">
            <button onClick={saveEdit} disabled={saving} className="text-xs text-primary-600 hover:underline">Save</button>
            <button onClick={cancelEdit} className="text-xs text-gray-500 hover:underline">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          <button
            onClick={() => setShowContent(!showContent)}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            {showContent ? 'Hide content' : 'Show content'}
          </button>
          {showContent && (
            <pre
              className="mt-2 text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 rounded-md p-3 max-h-48 overflow-y-auto cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => startEdit('content')}
              title="Click to edit content"
            >
              {chunk.content}
            </pre>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
        {chunk.status !== 'approved' && (
          <button
            onClick={() => handleStatusChange('approved')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
            Approve
          </button>
        )}
        {chunk.status !== 'rejected' && (
          <button
            onClick={() => handleStatusChange('rejected')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            Reject
          </button>
        )}
        {chunk.status !== 'pending_review' && (
          <button
            onClick={() => handleStatusChange('pending_review')}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors"
          >
            Undo
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={() => startEdit('content')}
          className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => setSplitMode(true)}
          className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          Split
        </button>
        {nextChunk && (
          <button
            onClick={handleMerge}
            disabled={saving}
            className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            Merge Next
          </button>
        )}
        <button
          onClick={handleDelete}
          className="px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function KnowledgeBase() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, rejected: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [proj, chunkData, catData, tagData, statsData] = await Promise.all([
        getProject(id),
        getChunks(id, {
          category: selectedCategory,
          status: selectedStatus,
          search: searchQuery || undefined,
          tag: selectedTag,
        }),
        getChunkCategories(id),
        getTags(id),
        getChunkStats(id),
      ]);
      setProject(proj);
      setChunks(chunkData);
      setCategories(catData);
      setTags(tagData);
      setStats({
        total: parseInt(statsData.total, 10),
        approved: parseInt(statsData.approved, 10),
        rejected: parseInt(statsData.rejected, 10),
        pending: parseInt(statsData.pending, 10),
      });
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [id, selectedCategory, selectedStatus, searchQuery, selectedTag]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpdateChunk(chunkId, data) {
    const updated = await updateChunk(chunkId, data);
    setChunks((prev) => prev.map((c) => (c.id === chunkId ? updated : c)));
    // Refresh stats if status changed
    if (data.status) {
      const statsData = await getChunkStats(id);
      setStats({
        total: parseInt(statsData.total, 10),
        approved: parseInt(statsData.approved, 10),
        rejected: parseInt(statsData.rejected, 10),
        pending: parseInt(statsData.pending, 10),
      });
    }
  }

  async function handleDeleteChunk(chunkId) {
    await deleteChunk(chunkId);
    setChunks((prev) => prev.filter((c) => c.id !== chunkId));
    const statsData = await getChunkStats(id);
    setStats({
      total: parseInt(statsData.total, 10),
      approved: parseInt(statsData.approved, 10),
      rejected: parseInt(statsData.rejected, 10),
      pending: parseInt(statsData.pending, 10),
    });
  }

  async function handleApproveCategory(category) {
    if (!window.confirm(`Approve all chunks in "${category}"?`)) return;
    await bulkUpdateChunks({ action: 'approve_category', projectId: id, category });
    loadData();
  }

  async function handleDeleteRejected() {
    if (!window.confirm('Delete all rejected chunks? This cannot be undone.')) return;
    await bulkUpdateChunks({ action: 'delete_rejected', projectId: id });
    loadData();
  }

  function handleSearch(e) {
    e.preventDefault();
    setSearchQuery(searchInput);
  }

  function clearFilters() {
    setSelectedCategory(null);
    setSelectedTag(null);
    setSelectedStatus(null);
    setSearchQuery('');
    setSearchInput('');
  }

  // Group chunks by category
  const grouped = {};
  for (const chunk of chunks) {
    const cat = chunk.category || 'Uncategorized';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(chunk);
  }

  const reviewed = stats.approved + stats.rejected;
  const progressPct = stats.total > 0 ? Math.round((reviewed / stats.total) * 100) : 0;
  const hasFilters = selectedCategory || selectedTag || selectedStatus || searchQuery;

  if (loading && !project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-4 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4 mt-8">
            <div className="h-screen bg-gray-200 rounded-lg col-span-1" />
            <div className="h-screen bg-gray-200 rounded-lg col-span-3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">Projects</Link>
        <span className="text-sm text-gray-400 mx-2">/</span>
        <Link to={`/project/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          {project?.name}
        </Link>
        <span className="text-sm text-gray-400 mx-2">/</span>
        <span className="text-sm text-gray-700">Knowledge Base</span>
      </div>

      {/* Header + progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          {stats.rejected > 0 && (
            <button
              onClick={handleDeleteRejected}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
            >
              Delete All Rejected ({stats.rejected})
            </button>
          )}
        </div>

        {/* Review progress bar */}
        {stats.total > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{reviewed} of {stats.total} chunks reviewed</span>
              <span className="font-medium">{progressPct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="flex h-2 rounded-full overflow-hidden">
                {stats.approved > 0 && (
                  <div
                    className="bg-green-500 transition-all duration-300"
                    style={{ width: `${(stats.approved / stats.total) * 100}%` }}
                  />
                )}
                {stats.rejected > 0 && (
                  <div
                    className="bg-red-400 transition-all duration-300"
                    style={{ width: `${(stats.rejected / stats.total) * 100}%` }}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" /> {stats.approved} approved
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400" /> {stats.rejected} rejected
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-300" /> {stats.pending} pending
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search chunks by title, content, or summary..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchInput(''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      <div className="flex gap-6">
        {/* ─── Left Sidebar ─── */}
        <div className="w-56 flex-shrink-0">
          <div className="sticky top-8 space-y-6">
            {/* Categories */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Categories</h3>
              <div className="space-y-0.5">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                    !selectedCategory ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  All categories
                </button>
                {categories.map((cat) => (
                  <div key={cat.category} className="flex items-center group">
                    <button
                      onClick={() => setSelectedCategory(cat.category === selectedCategory ? null : cat.category)}
                      className={`flex-1 text-left px-2.5 py-1.5 rounded-md text-sm transition-colors truncate ${
                        selectedCategory === cat.category ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {cat.category}
                      <span className="ml-1 text-xs text-gray-400">({cat.count})</span>
                    </button>
                    {selectedCategory === cat.category && (
                      <button
                        onClick={() => handleApproveCategory(cat.category)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-green-600 hover:text-green-700 transition-opacity"
                        title="Approve all in this category"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Status filter */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</h3>
              <div className="space-y-0.5">
                <button
                  onClick={() => setSelectedStatus(null)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                    !selectedStatus ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  All statuses
                </button>
                {[
                  { value: 'pending_review', label: 'Pending Review', count: stats.pending },
                  { value: 'approved', label: 'Approved', count: stats.approved },
                  { value: 'rejected', label: 'Rejected', count: stats.rejected },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSelectedStatus(selectedStatus === s.value ? null : s.value)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                      selectedStatus === s.value ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {s.label}
                    <span className="ml-1 text-xs text-gray-400">({s.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                      className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                        selectedTag === tag.name
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="w-full text-xs text-primary-600 hover:text-primary-700 font-medium py-2"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* ─── Main Content ─── */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-200 rounded-lg" />)}
            </div>
          ) : chunks.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              {hasFilters ? (
                <>
                  <p className="text-sm">No chunks match your filters.</p>
                  <button onClick={clearFilters} className="text-primary-600 text-sm mt-2 hover:underline">
                    Clear filters
                  </button>
                </>
              ) : (
                <p className="text-sm">No chunks yet. Process your documents first.</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([category, catChunks]) => (
                <div key={category}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                      <span className="w-2 h-2 rounded-full bg-primary-400 mr-2" />
                      {category}
                      <span className="ml-2 text-gray-400 font-normal normal-case">({catChunks.length})</span>
                    </h3>
                    <button
                      onClick={() => handleApproveCategory(category)}
                      className="text-xs text-green-600 hover:text-green-700 font-medium opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                    >
                      Approve all
                    </button>
                  </div>
                  <div className="space-y-3">
                    {catChunks.map((chunk, idx) => (
                      <ChunkCard
                        key={chunk.id}
                        chunk={chunk}
                        nextChunk={catChunks[idx + 1] || null}
                        onUpdate={handleUpdateChunk}
                        onDelete={handleDeleteChunk}
                        onRefresh={loadData}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
