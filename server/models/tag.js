const db = require('../config/database');

const Tag = {
  async findOrCreate(projectId, name) {
    // Try to find existing tag first
    const existing = await db.query(
      'SELECT * FROM tags WHERE project_id = $1 AND name = $2',
      [projectId, name]
    );
    if (existing.rows[0]) return existing.rows[0];

    // Create new tag
    const result = await db.query(
      'INSERT INTO tags (project_id, name) VALUES ($1, $2) RETURNING *',
      [projectId, name]
    );
    return result.rows[0];
  },

  async findAllByProject(projectId) {
    const result = await db.query(
      `SELECT t.*, COUNT(ct.chunk_id) as chunk_count
       FROM tags t
       LEFT JOIN chunk_tags ct ON ct.tag_id = t.id
       WHERE t.project_id = $1
       GROUP BY t.id
       ORDER BY t.name`,
      [projectId]
    );
    return result.rows;
  },

  async linkToChunk(chunkId, tagId) {
    await db.query(
      'INSERT INTO chunk_tags (chunk_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [chunkId, tagId]
    );
  },
};

module.exports = Tag;
