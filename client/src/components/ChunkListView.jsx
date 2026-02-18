import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getChunks, getChunkCategories } from '../api/client';

function ChunkCard({ chunk }) {
  const [expanded, setExpanded] = useState(false);
  const preview = chunk.content.length > 200
    ? chunk.content.substring(0, 200) + '...'
    : chunk.content;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-gray-900 truncate">{chunk.title}</h4>
          <p className="text-xs text-gray-500 mt-1">{chunk.summary}</p>
        </div>
        <span className="flex-shrink-0 text-xs text-gray-400 tabular-nums">
          ~{chunk.token_count} tokens
        </span>
      </div>

      {chunk.tags && chunk.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {chunk.tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600"
            >
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
        >
          {expanded ? 'Hide content' : 'Show content'}
        </button>
        {expanded && (
          <pre className="mt-2 text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50 rounded-md p-3 max-h-64 overflow-y-auto">
            {chunk.content}
          </pre>
        )}
        {!expanded && (
          <p className="mt-1 text-xs text-gray-400 line-clamp-2">{preview}</p>
        )}
      </div>
    </div>
  );
}

export default function ChunkListView({ projectId, refreshKey }) {
  const [chunks, setChunks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [chunkData, catData] = await Promise.all([
        getChunks(projectId, { category: selectedCategory }),
        getChunkCategories(projectId),
      ]);
      setChunks(chunkData);
      setCategories(catData);
    } catch {
      // silently fail — chunks just won't show
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedCategory, refreshKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && chunks.length === 0) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  if (chunks.length === 0) {
    return null;
  }

  // Group chunks by category
  const grouped = {};
  for (const chunk of chunks) {
    const cat = chunk.category || 'Uncategorized';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(chunk);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Knowledge Base
          <span className="ml-2 text-sm font-normal text-gray-400">
            {chunks.length} chunk{chunks.length !== 1 ? 's' : ''}
          </span>
        </h2>
        <Link
          to={`/project/${projectId}/knowledge-base`}
          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
        >
          <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Open Editor
        </Link>
      </div>

      {/* Category filter pills */}
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !selectedCategory
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({chunks.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category}
              onClick={() => setSelectedCategory(cat.category)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                selectedCategory === cat.category
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.category} ({cat.count})
            </button>
          ))}
        </div>
      )}

      {/* Grouped chunk list */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([category, catChunks]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center">
              <span className="w-2 h-2 rounded-full bg-primary-400 mr-2" />
              {category}
              <span className="ml-2 text-gray-400 font-normal">({catChunks.length})</span>
            </h3>
            <div className="space-y-2">
              {catChunks.map((chunk) => (
                <ChunkCard key={chunk.id} chunk={chunk} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
