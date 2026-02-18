const db = require('../config/database');

const Project = {
  async findAllByUser(userId) {
    const result = await db.query(
      `SELECT p.*,
        COUNT(DISTINCT d.id) AS document_count,
        COUNT(DISTINCT c.id) AS chunk_count
      FROM projects p
      LEFT JOIN documents d ON d.project_id = p.id
      LEFT JOIN chunks c ON c.project_id = p.id
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await db.query(
      `SELECT p.*,
        COUNT(DISTINCT d.id) AS document_count,
        COUNT(DISTINCT c.id) AS chunk_count
      FROM projects p
      LEFT JOIN documents d ON d.project_id = p.id
      LEFT JOIN chunks c ON c.project_id = p.id
      WHERE p.id = $1
      GROUP BY p.id`,
      [id]
    );
    return result.rows[0] || null;
  },

  async create({ userId, name, description }) {
    const result = await db.query(
      `INSERT INTO projects (user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, name, description || null]
    );
    return result.rows[0];
  },

  async update(id, { name, description, status }) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE projects SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    await db.query('DELETE FROM projects WHERE id = $1', [id]);
  },
};

module.exports = Project;
