// services/database.js
const oracledb = require('oracledb');

class DatabaseService {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    try {
      // Initialize Oracle Client
      if (process.env.ORACLE_CLIENT_PATH) {
        oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_PATH });
      }
      
      // Create connection pool
      this.pool = await oracledb.createPool({
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`,
        poolMin: 2,
        poolMax: 10,
        poolIncrement: 1,
        poolTimeout: 60,
        queueTimeout: 60000
      });
      
      console.log('Oracle connection pool created');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async execute(sql, binds = [], options = {}) {
    let connection;
    try {
      // Ensure SQL ends with semicolon
      const trimmedSql = sql.trim();
      const finalSql = trimmedSql.endsWith(';') ? trimmedSql : trimmedSql + ';';
      
      connection = await this.pool.getConnection();
      const result = await connection.execute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        ...options
      });
      return result.rows;
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (err) {
          console.error('Error closing connection:', err);
        }
      }
    }
  }

  async executeSingle(sql, binds = [], options = {}) {
    const results = await this.execute(sql, binds, options);
    return results[0] || null;
  }

  async close() {
    if (this.pool) {
      try {
        await this.pool.close();
        console.log('Connection pool closed');
      } catch (error) {
        console.error('Error closing pool:', error);
      }
    }
  }
}

module.exports = new DatabaseService();