const express = require('express');
const router = express.Router();
const Chunk = require('../models/chunk');
const Tag = require('../models/tag');

// GET /api/projects/:projectId/chunks/stats - Review progress stats
router.get('/:projectId/chunks/stats', async (req, res, next) => {
  try {
    const stats = await Chunk.getReviewStats(req.params.projectId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/chunks/:id - Update a chunk
router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await Chunk.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Chunk not found' });

    const { title, content, summary, category, status } = req.body;
    const chunk = await Chunk.update(req.params.id, { title, content, summary, category, status });
    res.json(chunk);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/chunks/:id - Delete a chunk
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await Chunk.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Chunk not found' });

    await Chunk.delete(req.params.id);
    res.json({ message: 'Chunk deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/chunks/:id/split - Split chunk at a character position
router.post('/:id/split', async (req, res, next) => {
  try {
    const chunk = await Chunk.findById(req.params.id);
    if (!chunk) return res.status(404).json({ error: 'Chunk not found' });

    const { position } = req.body;
    if (!position || position < 1 || position >= chunk.content.length) {
      return res.status(400).json({ error: 'Invalid split position' });
    }

    const firstContent = chunk.content.substring(0, position).trim();
    const secondContent = chunk.content.substring(position).trim();

    if (!firstContent || !secondContent) {
      return res.status(400).json({ error: 'Split would create an empty chunk' });
    }

    // Update the original chunk with the first half
    const updated = await Chunk.update(chunk.id, {
      content: firstContent,
      title: chunk.title + ' (Part 1)',
    });

    // Create a new chunk for the second half
    const newChunk = await Chunk.create({
      documentId: chunk.document_id,
      projectId: chunk.project_id,
      title: chunk.title + ' (Part 2)',
      content: secondContent,
      summary: chunk.summary,
      category: chunk.category,
      tokenCount: Math.ceil(secondContent.length / 4),
      sortOrder: chunk.sort_order + 1,
    });

    // Copy tags from original to new chunk
    if (chunk.tags && chunk.tags.length > 0) {
      for (const tag of chunk.tags) {
        await Tag.linkToChunk(newChunk.id, tag.id);
      }
    }

    const newChunkWithTags = await Chunk.findById(newChunk.id);
    res.json({ first: updated, second: newChunkWithTags });
  } catch (err) {
    next(err);
  }
});

// POST /api/chunks/merge - Merge two chunks
router.post('/merge', async (req, res, next) => {
  try {
    const { chunkIds } = req.body;
    if (!chunkIds || chunkIds.length !== 2) {
      return res.status(400).json({ error: 'Provide exactly 2 chunk IDs to merge' });
    }

    const first = await Chunk.findById(chunkIds[0]);
    const second = await Chunk.findById(chunkIds[1]);

    if (!first || !second) {
      return res.status(404).json({ error: 'One or both chunks not found' });
    }

    // Merge content into the first chunk
    const mergedContent = first.content + '\n\n' + second.content;
    const updated = await Chunk.update(first.id, {
      content: mergedContent,
      title: first.title.replace(' (Part 1)', ''),
      summary: first.summary,
    });

    // Delete the second chunk
    await Chunk.delete(second.id);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/chunks/bulk - Bulk update chunk status
router.patch('/bulk', async (req, res, next) => {
  try {
    const { chunkIds, status, projectId, category, action } = req.body;

    if (action === 'approve_category' && projectId && category) {
      await Chunk.bulkUpdateByCategory(projectId, category, 'approved');
      return res.json({ message: `All chunks in "${category}" approved` });
    }

    if (action === 'delete_rejected' && projectId) {
      const count = await Chunk.deleteByStatus(projectId, 'rejected');
      return res.json({ message: `${count} rejected chunks deleted` });
    }

    if (chunkIds && status) {
      await Chunk.bulkUpdateStatus(chunkIds, status);
      return res.json({ message: `${chunkIds.length} chunks updated` });
    }

    res.status(400).json({ error: 'Invalid bulk action' });
  } catch (err) {
    next(err);
  }
});

// POST /api/chunks/:id/tags - Add a tag to a chunk
router.post('/:id/tags', async (req, res, next) => {
  try {
    const chunk = await Chunk.findById(req.params.id);
    if (!chunk) return res.status(404).json({ error: 'Chunk not found' });

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const tag = await Tag.findOrCreate(chunk.project_id, name.toLowerCase().trim());
    await Tag.linkToChunk(chunk.id, tag.id);

    const updated = await Chunk.findById(chunk.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/chunks/:id/tags/:tagId - Remove a tag from a chunk
router.delete('/:id/tags/:tagId', async (req, res, next) => {
  try {
    await Tag.unlinkFromChunk(req.params.id, req.params.tagId);
    const updated = await Chunk.findById(req.params.id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
