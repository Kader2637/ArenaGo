const db = require('../config/db');

class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async find(conditions = {}, options = {}) {
    const { select = '*', sort } = options;
    let queryText = `SELECT ${select} FROM ${this.tableName}`;
    const values = [];
    const keys = Object.keys(conditions);

    // Filter out undefined and apply conditions
    const activeKeys = keys.filter(key => conditions[key] !== undefined);
    if (activeKeys.length > 0) {
      let paramIndex = 1;
      const conditionClauses = activeKeys.map((key) => {
        const val = conditions[key];
        if (val === null) {
          return `${key} IS NULL`;
        } else {
          values.push(val);
          const clause = `${key} = $${paramIndex}`;
          paramIndex++;
          return clause;
        }
      });
      queryText += ` WHERE ${conditionClauses.join(' AND ')}`;
    }

    if (sort) {
      queryText += ` ORDER BY ${sort}`;
    }

    const result = await db.query(queryText, values);
    return result.rows;
  }

  async findById(id) {
    const queryText = `SELECT * FROM ${this.tableName} WHERE id = $1`;
    const result = await db.query(queryText, [id]);
    return result.rows[0] || null;
  }

  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');
    const queryText = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    const result = await db.query(queryText, values);
    return result.rows[0];
  }

  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, index) => `${key} = $${index + 2}`).join(', ');
    const queryText = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $1 RETURNING *`;
    const result = await db.query(queryText, [id, ...values]);
    return result.rows[0] || null;
  }

  async delete(id) {
    const queryText = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
    const result = await db.query(queryText, [id]);
    return result.rows[0] || null;
  }
}

module.exports = BaseRepository;
