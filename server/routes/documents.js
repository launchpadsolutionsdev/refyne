const express = require('express');
const path = require('path');
const router = express.Router();
const upload = require('../middleware/upload');
const Document = require('../models/document');
const Project = require('../models/project');
const { extractText } = require('../services/extractor');

// POST /api/projects/:projectId/documents - Upload files
router.post('/:projectId/documents', upload.array('files', 20), async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const documents = [];

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
      const fileType = ext === 'htm' ? 'html' : ext;

      const doc = await Document.create({
        projectId: req.params.projectId,
        originalFilename: file.originalname,
        fileType,
        filePath: file.path,
      });

      documents.push(doc);

      // Kick off extraction asynchronously
      extractDocument(doc);
    }

    res.status(201).json(documents);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:projectId/documents - List documents
router.get('/:projectId/documents', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const documents = await Document.findAllByProject(req.params.projectId);
    res.json(documents);
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id - Get single document with full text
router.get('/doc/:id', async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id - Delete a document
router.delete('/doc/:id', async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    await Document.delete(req.params.id);
    res.json({ message: 'Document deleted' });
  } catch (err) {
    next(err);
  }
});

async function extractDocument(doc) {
  try {
    await Document.updateStatus(doc.id, 'extracting');
    const rawText = await extractText(doc.file_path, doc.original_filename);
    await Document.updateStatus(doc.id, 'extracted', { rawText });
  } catch (err) {
    console.error(`Extraction failed for ${doc.original_filename}:`, err.message);
    await Document.updateStatus(doc.id, 'error', { errorMessage: err.message });
  }
}

module.exports = router;
