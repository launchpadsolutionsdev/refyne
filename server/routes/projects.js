const express = require('express');
const router = express.Router();
const Project = require('../models/project');
const User = require('../models/user');

// GET /api/projects - List all projects for the dev user
router.get('/', async (req, res, next) => {
  try {
    const user = await User.getDefaultUser();
    if (!user) return res.status(500).json({ error: 'Default user not found. Run: npm run db:init' });

    const projects = await Project.findAllByUser(user.id);
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects - Create a new project
router.post('/', async (req, res, next) => {
  try {
    const user = await User.getDefaultUser();
    if (!user) return res.status(500).json({ error: 'Default user not found. Run: npm run db:init' });

    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await Project.create({
      userId: user.id,
      name: name.trim(),
      description: description?.trim() || null,
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id - Get a single project
router.get('/:id', async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/projects/:id - Update a project
router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await Project.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    const { name, description, status } = req.body;
    const project = await Project.update(req.params.id, { name, description, status });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id - Delete a project
router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await Project.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Project not found' });

    await Project.delete(req.params.id);
    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
