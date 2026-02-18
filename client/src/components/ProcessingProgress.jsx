import React, { useState, useEffect, useCallback } from 'react';
import { startProcessing, getProcessingStatus } from '../api/client';

export default function ProcessingProgress({ projectId, hasExtractedDocs, onProcessingComplete }) {
  const [status, setStatus] = useState(null); // null | { status, total, completed, currentDocument, errors }
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const pollStatus = useCallback(async () => {
    try {
      const data = await getProcessingStatus(projectId);
      setStatus(data);
      return data;
    } catch {
      return null;
    }
  }, [projectId]);

  // Check initial status on mount
  useEffect(() => {
    pollStatus();
  }, [pollStatus]);

  // Poll while processing
  useEffect(() => {
    if (!status || status.status !== 'processing') return;

    const interval = setInterval(async () => {
      const data = await pollStatus();
      if (data && data.status === 'done') {
        onProcessingComplete?.();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [status, pollStatus, onProcessingComplete]);

  async function handleStart() {
    try {
      setStarting(true);
      setError(null);
      await startProcessing(projectId);
      // Start polling
      const data = await pollStatus();
      if (!data || data.status === 'idle') {
        // Force the state to show processing started
        setStatus({ status: 'processing', total: 0, completed: 0, errors: [] });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  const isProcessing = status?.status === 'processing';
  const isDone = status?.status === 'done';
  const progress = status?.total > 0 ? Math.round((status.completed / status.total) * 100) : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">AI Processing</h3>
        {!isProcessing && (
          <button
            onClick={handleStart}
            disabled={starting || !hasExtractedDocs}
            className="inline-flex items-center px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {starting ? (
              <>
                <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting...
              </>
            ) : (
              <>
                <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Process All
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-md p-2 mb-3">
          {error}
        </div>
      )}

      {isProcessing && (
        <div>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>
              Processing {status.completed + 1} of {status.total}
              {status.currentDocument && (
                <span className="text-gray-400"> — {status.currentDocument}</span>
              )}
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
        </div>
      )}

      {isDone && (
        <div>
          <div className="flex items-center text-xs text-green-600 mb-2">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Processing complete — {status.completed} document{status.completed !== 1 ? 's' : ''} processed
          </div>
          {status.errors.length > 0 && (
            <div className="text-xs text-red-500 space-y-1">
              {status.errors.map((e, i) => (
                <div key={i}>
                  Failed: {e.filename} — {e.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!isProcessing && !isDone && !hasExtractedDocs && (
        <p className="text-xs text-gray-400">
          Upload and extract documents first, then click Process All to run AI analysis.
        </p>
      )}

      {!isProcessing && !isDone && hasExtractedDocs && (
        <p className="text-xs text-gray-400">
          Click Process All to classify, chunk, and enrich your documents with AI.
        </p>
      )}
    </div>
  );
}
