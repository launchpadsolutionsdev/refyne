const db = require('../config/database');

const User = {
  async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async getDefaultUser() {
    const result = await db.query(
      "SELECT * FROM users WHERE email = 'dev@refyne.local'"
    );
    return result.rows[0] || null;
  },
};

module.exports = User;
