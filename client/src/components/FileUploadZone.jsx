import React, { useState, useRef, useCallback } from 'react';

const ACCEPTED_TYPES = {
  'text/plain': '.txt',
  'text/markdown': '.md',
  'text/csv': '.csv',
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/html': '.html',
};

const ACCEPTED_EXTENSIONS = ['.txt', '.md', '.csv', '.pdf', '.docx', '.html'];
const ACCEPT_STRING = Object.keys(ACCEPTED_TYPES).join(',') + ',' + ACCEPTED_EXTENSIONS.join(',');

export default function FileUploadZone({ onUpload, uploading }) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const files = Array.from(e.dataTransfer.files).filter((file) => {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        return ACCEPTED_EXTENSIONS.includes(ext);
      });

      if (files.length > 0) {
        onUpload(files);
      }
    },
    [onUpload]
  );

  const handleChange = useCallback(
    (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        onUpload(files);
      }
      e.target.value = '';
    },
    [onUpload]
  );

  return (
    <div
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        dragActive
          ? 'border-primary-400 bg-primary-50'
          : 'border-gray-300 hover:border-gray-400 bg-white'
      } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_STRING}
        onChange={handleChange}
        className="hidden"
        disabled={uploading}
      />

      <svg
        className={`mx-auto h-10 w-10 ${dragActive ? 'text-primary-500' : 'text-gray-400'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>

      {uploading ? (
        <p className="mt-3 text-sm text-gray-500">Uploading files...</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-gray-600">
            <span className="font-medium text-primary-600">Click to upload</span> or drag and drop
          </p>
          <p className="mt-1 text-xs text-gray-400">
            TXT, MD, CSV, PDF, DOCX, HTML — up to 10MB each
          </p>
        </>
      )}
    </div>
  );
}
