const express = require('express');
const router = express.Router();
const Tag = require('../models/tag');

// GET /api/projects/:projectId/tags - List tags for a project
router.get('/:projectId/tags', async (req, res, next) => {
  try {
    const tags = await Tag.findAllByProject(req.params.projectId);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:projectId/tags - Create a tag
router.post('/:projectId/tags', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const tag = await Tag.findOrCreate(req.params.projectId, name.toLowerCase().trim());
    res.status(201).json(tag);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
