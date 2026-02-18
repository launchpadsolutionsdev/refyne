const db = require('../config/database');

const Chunk = {
  async findAllByProject(projectId, { category, status, search, tag } = {}) {
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
    if (search) {
      conditions.push(`(c.title ILIKE $${paramIndex} OR c.content ILIKE $${paramIndex} OR c.summary ILIKE $${paramIndex})`);
      values.push(`%${search}%`);
      paramIndex++;
    }
    if (tag) {
      conditions.push(`EXISTS (
        SELECT 1 FROM chunk_tags ct2 JOIN tags t2 ON t2.id = ct2.tag_id
        WHERE ct2.chunk_id = c.id AND t2.name = $${paramIndex}
      )`);
      values.push(tag);
      paramIndex++;
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

  async update(id, { title, content, summary, category, status }) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) { fields.push(`title = $${paramIndex++}`); values.push(title); }
    if (content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      values.push(content);
      // Recalculate token count
      fields.push(`token_count = $${paramIndex++}`);
      values.push(Math.ceil(content.length / 4));
    }
    if (summary !== undefined) { fields.push(`summary = $${paramIndex++}`); values.push(summary); }
    if (category !== undefined) { fields.push(`category = $${paramIndex++}`); values.push(category); }
    if (status !== undefined) { fields.push(`status = $${paramIndex++}`); values.push(status); }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = NOW()');
    values.push(id);

    await db.query(
      `UPDATE chunks SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return this.findById(id);
  },

  async delete(id) {
    await db.query('DELETE FROM chunks WHERE id = $1', [id]);
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

  async getReviewStats(projectId) {
    const result = await db.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COUNT(*) FILTER (WHERE status = 'pending_review') as pending
      FROM chunks WHERE project_id = $1`,
      [projectId]
    );
    return result.rows[0];
  },

  async bulkUpdateStatus(ids, status) {
    if (!ids || ids.length === 0) return;
    const result = await db.query(
      `UPDATE chunks SET status = $1, updated_at = NOW()
       WHERE id = ANY($2) RETURNING *`,
      [status, ids]
    );
    return result.rows;
  },

  async bulkUpdateByCategory(projectId, category, status) {
    const result = await db.query(
      `UPDATE chunks SET status = $1, updated_at = NOW()
       WHERE project_id = $2 AND category = $3 RETURNING *`,
      [status, projectId, category]
    );
    return result.rows;
  },

  async deleteByStatus(projectId, status) {
    const result = await db.query(
      'DELETE FROM chunks WHERE project_id = $1 AND status = $2',
      [projectId, status]
    );
    return result.rowCount;
  },

  async findAdjacent(id) {
    // Find the chunk and its neighbor (next by sort_order in same document)
    const chunk = await db.query('SELECT * FROM chunks WHERE id = $1', [id]);
    if (!chunk.rows[0]) return null;

    const c = chunk.rows[0];
    const next = await db.query(
      `SELECT * FROM chunks
       WHERE document_id = $1 AND sort_order > $2
       ORDER BY sort_order ASC LIMIT 1`,
      [c.document_id, c.sort_order]
    );
    return { chunk: c, next: next.rows[0] || null };
  },
};

module.exports = Chunk;
