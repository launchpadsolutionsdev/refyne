const express = require('express');
const router = express.Router();
const Document = require('../models/document');
const Project = require('../models/project');
const Chunk = require('../models/chunk');
const Tag = require('../models/tag');
const { processDocument, estimateTokens } = require('../services/processor');

// In-memory processing state per project
const processingState = new Map();

// POST /api/projects/:projectId/process - Start AI processing
router.post('/:projectId/process', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // Check if already processing
    const state = processingState.get(req.params.projectId);
    if (state && state.status === 'processing') {
      return res.status(409).json({ error: 'Processing already in progress' });
    }

    // Find documents ready to process (extracted but not yet processed)
    const allDocs = await Document.findAllByProject(req.params.projectId);
    const docsToProcess = allDocs.filter((d) => d.status === 'extracted');

    if (docsToProcess.length === 0) {
      return res.status(400).json({ error: 'No extracted documents to process' });
    }

    // Initialize processing state
    const newState = {
      status: 'processing',
      total: docsToProcess.length,
      completed: 0,
      currentDocument: null,
      errors: [],
    };
    processingState.set(req.params.projectId, newState);

    // Return immediately, process in background
    res.json({
      message: 'Processing started',
      total: docsToProcess.length,
    });

    // Process documents sequentially in background
    processDocumentsQueue(req.params.projectId, docsToProcess);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:projectId/process/status - Get processing status
router.get('/:projectId/process/status', (req, res) => {
  const state = processingState.get(req.params.projectId);
  if (!state) {
    return res.json({ status: 'idle', total: 0, completed: 0, errors: [] });
  }
  res.json(state);
});

// GET /api/projects/:projectId/chunks - List chunks for project
router.get('/:projectId/chunks', async (req, res, next) => {
  try {
    const { category, status, search, tag } = req.query;
    const chunks = await Chunk.findAllByProject(req.params.projectId, { category, status, search, tag });
    res.json(chunks);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:projectId/chunks/categories - Get categories with counts
router.get('/:projectId/chunks/categories', async (req, res, next) => {
  try {
    const categories = await Chunk.getCategoriesByProject(req.params.projectId);
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

async function processDocumentsQueue(projectId, documents) {
  const state = processingState.get(projectId);

  try {
    for (const doc of documents) {
      try {
        state.currentDocument = doc.original_filename;

        // Mark document as processing
        await Document.updateStatus(doc.id, 'processing');

        // Send to Claude API
        const result = await processDocument(doc.raw_text, doc.original_filename);

        // Store chunks and tags
        for (let i = 0; i < result.chunks.length; i++) {
          const chunkData = result.chunks[i];
          const tokenCount = estimateTokens(chunkData.content);

          const chunk = await Chunk.create({
            documentId: doc.id,
            projectId,
            title: chunkData.title,
            content: chunkData.content,
            summary: chunkData.summary,
            category: chunkData.category || result.document_type,
            tokenCount,
            sortOrder: i,
          });

          // Create and link tags
          if (chunkData.tags && chunkData.tags.length > 0) {
            for (const tagName of chunkData.tags) {
              const tag = await Tag.findOrCreate(projectId, tagName.toLowerCase().trim());
              await Tag.linkToChunk(chunk.id, tag.id);
            }
          }
        }

        // Mark document as processed
        await Document.updateStatus(doc.id, 'processed');
        state.completed++;
      } catch (err) {
        console.error(`Processing failed for ${doc.original_filename}:`, err.message);
        state.errors.push({
          documentId: doc.id,
          filename: doc.original_filename,
          error: err.message,
        });
        try {
          await Document.updateStatus(doc.id, 'error', { errorMessage: err.message });
        } catch { /* ignore status update failure */ }
        state.completed++;
      }
    }
  } catch (err) {
    // Catch-all: if something truly unexpected happens, mark as done with error
    console.error('Processing queue crashed:', err.message);
    state.errors.push({ documentId: null, filename: null, error: err.message });
  }

  state.status = 'done';
  state.currentDocument = null;

  // Clean up state after 5 minutes
  setTimeout(() => {
    const current = processingState.get(projectId);
    if (current && current.status === 'done') {
      processingState.delete(projectId);
    }
  }, 5 * 60 * 1000);
}

module.exports = router;
