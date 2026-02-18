import React, { useState } from 'react';
import { deleteDocument } from '../api/client';

const STATUS_CONFIG = {
  uploaded: { label: 'Uploaded', color: 'bg-gray-100 text-gray-700' },
  extracting: { label: 'Extracting...', color: 'bg-yellow-100 text-yellow-700' },
  extracted: { label: 'Extracted', color: 'bg-green-100 text-green-700' },
  processing: { label: 'Processing...', color: 'bg-blue-100 text-blue-700' },
  processed: { label: 'Processed', color: 'bg-emerald-100 text-emerald-700' },
  error: { label: 'Error', color: 'bg-red-100 text-red-700' },
};

const FILE_TYPE_ICONS = {
  txt: 'T',
  md: 'M',
  csv: 'C',
  pdf: 'P',
  docx: 'W',
  html: 'H',
};

function DocumentRow({ doc, onDeleted }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const status = STATUS_CONFIG[doc.status] || STATUS_CONFIG.uploaded;
  const icon = FILE_TYPE_ICONS[doc.file_type] || '?';
  const hasText = doc.raw_text && doc.raw_text.length > 0;
  const previewText = doc.raw_text
    ? doc.raw_text.substring(0, 300) + (doc.raw_text.length > 300 ? '...' : '')
    : null;

  async function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${doc.original_filename}"?`)) return;
    try {
      setDeleting(true);
      await deleteDocument(doc.id);
      onDeleted(doc.id);
    } catch (err) {
      alert(err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => hasText && setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary-50 text-primary-600 font-bold text-sm flex items-center justify-center">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{doc.original_filename}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              .{doc.file_type}
              {hasText && ` — ${doc.raw_text.length.toLocaleString()} chars`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 flex-shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>
            {status.label}
          </span>
          {doc.status === 'error' && doc.error_message && (
            <span className="text-xs text-red-500 max-w-[200px] truncate" title={doc.error_message}>
              {doc.error_message}
            </span>
          )}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="Delete document"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
          {hasText && (
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {expanded && previewText && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <p className="text-xs font-medium text-gray-500 mb-2">Extracted Text Preview</p>
          <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
            {previewText}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function DocumentList({ documents, onDocumentDeleted }) {
  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No documents yet. Upload files above to get started.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <DocumentRow key={doc.id} doc={doc} onDeleted={onDocumentDeleted} />
      ))}
    </div>
  );
}
