import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProject, getDocuments, uploadDocuments, updateProject } from '../api/client';
import FileUploadZone from '../components/FileUploadZone';
import DocumentList from '../components/DocumentList';
import ProcessingProgress from '../components/ProcessingProgress';
import ChunkListView from '../components/ChunkListView';

export default function ProjectView() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [descValue, setDescValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [chunkRefreshKey, setChunkRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [proj, docs] = await Promise.all([getProject(id), getDocuments(id)]);
      setProject(proj);
      setDocuments(docs);
      setNameValue(proj.name);
      setDescValue(proj.description || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll for status updates on extracting/processing documents
  useEffect(() => {
    const hasInProgress = documents.some(
      (d) => d.status === 'uploaded' || d.status === 'extracting' || d.status === 'processing'
    );
    if (!hasInProgress) return;

    const interval = setInterval(async () => {
      try {
        const docs = await getDocuments(id);
        setDocuments(docs);
      } catch {
        // ignore polling errors
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [documents, id]);

  async function handleUpload(files) {
    try {
      setUploading(true);
      setError(null);
      const newDocs = await uploadDocuments(id, files);
      setDocuments((prev) => [...newDocs, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleDocumentDeleted(docId) {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }

  function handleProcessingComplete() {
    // Refresh documents and chunks
    loadData();
    setChunkRefreshKey((k) => k + 1);
  }

  async function handleSaveName() {
    if (!nameValue.trim()) return;
    try {
      const updated = await updateProject(id, { name: nameValue.trim() });
      setProject((prev) => ({ ...prev, ...updated }));
      setEditingName(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSaveDesc() {
    try {
      const updated = await updateProject(id, { description: descValue.trim() });
      setProject((prev) => ({ ...prev, ...updated }));
      setEditingDesc(false);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
          <div className="h-40 bg-gray-200 rounded-lg mt-8"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-gray-500">Project not found.</p>
        <Link to="/" className="text-primary-600 hover:underline text-sm mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const extractedCount = documents.filter((d) => d.status === 'extracted').length;
  const processedCount = documents.filter((d) => d.status === 'processed').length;
  const errorCount = documents.filter((d) => d.status === 'error').length;
  const hasExtractedDocs = extractedCount > 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Projects
        </Link>
        <span className="text-sm text-gray-400 mx-2">/</span>
        <span className="text-sm text-gray-700">{project.name}</span>
      </div>

      {/* Project header */}
      <div className="mb-8">
        {editingName ? (
          <div className="flex items-center space-x-2">
            <input
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="text-2xl font-bold text-gray-900 border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
            />
            <button onClick={handleSaveName} className="text-sm text-primary-600 hover:underline">
              Save
            </button>
            <button
              onClick={() => {
                setEditingName(false);
                setNameValue(project.name);
              }}
              className="text-sm text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <h1
            className="text-2xl font-bold text-gray-900 cursor-pointer hover:text-primary-600 transition-colors"
            onClick={() => setEditingName(true)}
            title="Click to edit"
          >
            {project.name}
          </h1>
        )}

        {editingDesc ? (
          <div className="mt-2 flex items-start space-x-2">
            <textarea
              value={descValue}
              onChange={(e) => setDescValue(e.target.value)}
              className="text-sm text-gray-600 border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 w-full max-w-md resize-none"
              rows={2}
              autoFocus
            />
            <button onClick={handleSaveDesc} className="text-sm text-primary-600 hover:underline">
              Save
            </button>
            <button
              onClick={() => {
                setEditingDesc(false);
                setDescValue(project.description || '');
              }}
              className="text-sm text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p
            className="mt-1 text-sm text-gray-500 cursor-pointer hover:text-gray-700 transition-colors"
            onClick={() => setEditingDesc(true)}
            title="Click to edit"
          >
            {project.description || 'Click to add a description...'}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-red-500 hover:text-red-700 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stats bar */}
      {documents.length > 0 && (
        <div className="flex items-center space-x-6 mb-6 text-sm text-gray-500">
          <span>{documents.length} document{documents.length !== 1 ? 's' : ''}</span>
          <span>{extractedCount} extracted</span>
          {processedCount > 0 && <span className="text-emerald-600">{processedCount} processed</span>}
          {errorCount > 0 && <span className="text-red-500">{errorCount} failed</span>}
        </div>
      )}

      {/* Upload zone */}
      <div className="mb-6">
        <FileUploadZone onUpload={handleUpload} uploading={uploading} />
      </div>

      {/* AI Processing section */}
      {documents.length > 0 && (
        <div className="mb-8">
          <ProcessingProgress
            projectId={id}
            hasExtractedDocs={hasExtractedDocs}
            onProcessingComplete={handleProcessingComplete}
          />
        </div>
      )}

      {/* Documents section */}
      <div className="mb-8">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Documents</h2>
        <DocumentList documents={documents} onDocumentDeleted={handleDocumentDeleted} />
      </div>

      {/* Chunks / Knowledge Base section */}
      <div>
        <ChunkListView projectId={id} refreshKey={chunkRefreshKey} />
      </div>
    </div>
  );
}
