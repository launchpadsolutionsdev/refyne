const db = require('../config/database');

const Document = {
  async findAllByProject(projectId) {
    const result = await db.query(
      `SELECT * FROM documents
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [projectId]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await db.query('SELECT * FROM documents WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async create({ projectId, originalFilename, fileType, filePath }) {
    const result = await db.query(
      `INSERT INTO documents (project_id, original_filename, file_type, file_path)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [projectId, originalFilename, fileType, filePath]
    );
    return result.rows[0];
  },

  async updateStatus(id, status, { rawText, errorMessage } = {}) {
    const fields = [`status = $2`, `updated_at = NOW()`];
    const values = [id, status];
    let paramIndex = 3;

    if (rawText !== undefined) {
      fields.push(`raw_text = $${paramIndex++}`);
      values.push(rawText);
    }
    if (errorMessage !== undefined) {
      fields.push(`error_message = $${paramIndex++}`);
      values.push(errorMessage);
    }

    const result = await db.query(
      `UPDATE documents SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    await db.query('DELETE FROM documents WHERE id = $1', [id]);
  },
};

module.exports = Document;
