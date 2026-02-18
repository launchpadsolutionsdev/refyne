const db = require('../config/database');

const Chunk = {
  async findAllByProject(projectId, { category, status } = {}) {
    const conditions = ['c.project_id = $1'];
    const values = [projectId];
    let paramIndex = 2;

    if (category) {
      conditions.push(`c.category = $${paramIndex++}`);
      values.push(category);
    }
    if (status) {
      conditions.push(`c.status = $${paramIndex++}`);
      values.push(status);
    }

    const result = await db.query(
      `SELECT c.*,
        COALESCE(
          json_agg(json_build_object('id', t.id, 'name', t.name))
          FILTER (WHERE t.id IS NOT NULL), '[]'
        ) AS tags
      FROM chunks c
      LEFT JOIN chunk_tags ct ON ct.chunk_id = c.id
      LEFT JOIN tags t ON t.id = ct.tag_id
      WHERE ${conditions.join(' AND ')}
      GROUP BY c.id
      ORDER BY c.category, c.sort_order`,
      values
    );
    return result.rows;
  },

  async findById(id) {
    const result = await db.query(
      `SELECT c.*,
        COALESCE(
          json_agg(json_build_object('id', t.id, 'name', t.name))
          FILTER (WHERE t.id IS NOT NULL), '[]'
        ) AS tags
      FROM chunks c
      LEFT JOIN chunk_tags ct ON ct.chunk_id = c.id
      LEFT JOIN tags t ON t.id = ct.tag_id
      WHERE c.id = $1
      GROUP BY c.id`,
      [id]
    );
    return result.rows[0] || null;
  },

  async create({ documentId, projectId, title, content, summary, category, tokenCount, sortOrder }) {
    const result = await db.query(
      `INSERT INTO chunks (document_id, project_id, title, content, summary, category, token_count, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [documentId, projectId, title, content, summary, category, tokenCount, sortOrder]
    );
    return result.rows[0];
  },

  async deleteByDocument(documentId) {
    await db.query('DELETE FROM chunks WHERE document_id = $1', [documentId]);
  },

  async countByProject(projectId) {
    const result = await db.query(
      'SELECT COUNT(*) FROM chunks WHERE project_id = $1',
      [projectId]
    );
    return parseInt(result.rows[0].count, 10);
  },

  async getCategoriesByProject(projectId) {
    const result = await db.query(
      `SELECT category, COUNT(*) as count
       FROM chunks
       WHERE project_id = $1
       GROUP BY category
       ORDER BY category`,
      [projectId]
    );
    return result.rows;
  },
};

module.exports = Chunk;
