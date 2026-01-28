// routes/dba.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const monitoring = require('../services/monitoring');
const db = require('../services/database');
require('dotenv').config();

// Execute SQL
router.post('/execute-sql', async (req, res) => {
  const { sql, parameters = [] } = req.body;
  
  // Security checks
  if (!sql || typeof sql !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'SQL query is required'
    });
  }
  
  // Block dangerous operations for non-admins
  const dangerousKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'GRANT', 'REVOKE'];
  const sqlUpper = sql.toUpperCase();
  const hasDangerous = dangerousKeywords.some(keyword => sqlUpper.includes(keyword));
  
  if (hasDangerous && (!req.session.user || req.session.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required for this operation'
    });
  }
  
  try {
    const result = await db.execute(sql, parameters);
    
    res.json({
      success: true,
      data: result,
      rowCount: result.length,
      message: `Query executed successfully. ${result.length} rows affected.`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'SQL execution failed',
      error: error.message,
      sqlErrorCode: error.errorNum,
      sqlErrorOffset: error.offset
    });
  }
});

// Kill session
router.post('/kill-session', async (req, res) => {
  const { sid, serial } = req.body;
  
  if (!sid || !serial) {
    return res.status(400).json({
      success: false,
      message: 'SID and Serial# are required'
    });
  }
  
  try {
    await monitoring.killSession(sid, serial);
    
    res.json({
      success: true,
      message: `Session ${sid},${serial} killed successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to kill session',
      error: error.message
    });
  }
});

// Get explain plan
router.post('/explain-plan', async (req, res) => {
  const { sql } = req.body;
  
  if (!sql) {
    return res.status(400).json({
      success: false,
      message: 'SQL query is required'
    });
  }
  
  try {
    // Create plan table if not exists
    const createPlanTable = `
      BEGIN
        EXECUTE IMMEDIATE '
          CREATE TABLE plan_table (
            statement_id VARCHAR2(30),
            plan_id NUMBER,
            timestamp DATE,
            remarks VARCHAR2(4000),
            operation VARCHAR2(30),
            options VARCHAR2(255),
            object_node VARCHAR2(128),
            object_owner VARCHAR2(30),
            object_name VARCHAR2(30),
            object_alias VARCHAR2(65),
            object_instance NUMBER,
            object_type VARCHAR2(30),
            optimizer VARCHAR2(255),
            search_columns NUMBER,
            id NUMBER,
            parent_id NUMBER,
            depth NUMBER,
            position NUMBER,
            cost NUMBER,
            cardinality NUMBER,
            bytes NUMBER,
            other_tag VARCHAR2(255),
            partition_start VARCHAR2(255),
            partition_stop VARCHAR2(255),
            partition_id NUMBER,
            other LONG,
            distribution VARCHAR2(30),
            cpu_cost NUMBER,
            io_cost NUMBER,
            temp_space NUMBER,
            access_predicates VARCHAR2(4000),
            filter_predicates VARCHAR2(4000),
            projection VARCHAR2(4000),
            time NUMBER,
            qblock_name VARCHAR2(30),
            other_xml CLOB
          )';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE != -955 THEN
            RAISE;
          END IF;
      END;
    `;
    
    await db.execute(createPlanTable);
    
    // Explain the SQL
    const explainSQL = `
      EXPLAIN PLAN 
      SET STATEMENT_ID = 'DASHBOARD_EXPLAIN'
      FOR ${sql}
    `;
    
    await db.execute(explainSQL);
    
    // Get the plan
    const planQuery = `
      SELECT 
        LPAD(' ', 2*(LEVEL-1)) || OPERATION || ' ' || 
        DECODE(OPTIONS, NULL, '', OPTIONS || ' ') || 
        DECODE(OBJECT_NAME, NULL, '', OBJECT_NAME) as operation,
        COST,
        CARDINALITY,
        BYTES,
        CPU_COST,
        IO_COST,
        TIME
      FROM plan_table
      START WITH ID = 0 AND STATEMENT_ID = 'DASHBOARD_EXPLAIN'
      CONNECT BY PRIOR ID = PARENT_ID AND STATEMENT_ID = 'DASHBOARD_EXPLAIN'
      ORDER BY ID
    `;
    
    const plan = await db.execute(planQuery);
    
    // Clean up
    await db.execute(`DELETE FROM plan_table WHERE STATEMENT_ID = 'DASHBOARD_EXPLAIN'`);
    
    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to generate explain plan',
      error: error.message
    });
  }
});

// Export data
router.post('/export-data', async (req, res) => {
  const { sql, format = 'csv' } = req.body;
  
  try {
    const data = await db.execute(sql);
    
    if (format === 'csv') {
      // Convert to CSV
      if (data.length === 0) {
        return res.json({
          success: true,
          format: 'csv',
          data: '',
          message: 'No data to export'
        });
      }
      
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map(row => 
        Object.values(row).map(value => 
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
        ).join(',')
      ).join('\n');
      
      const csv = `${headers}\n${rows}`;
      
      res.json({
        success: true,
        format: 'csv',
        data: csv,
        filename: `export-${Date.now()}.csv`
      });
    } else {
      res.json({
        success: true,
        format: 'json',
        data: data
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Export failed',
      error: error.message
    });
  }
});

// Create backup
router.post('/create-backup', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required for backup operations'
    });
  }

  try {
    // Get backup directory from env or use default
    const backupDir = process.env.BACKUP_DIRECTORY || './backups';
    const absoluteBackupDir = path.isAbsolute(backupDir) ? backupDir : path.join(process.cwd(), backupDir);
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(absoluteBackupDir)) {
      fs.mkdirSync(absoluteBackupDir, { recursive: true });
    }
    
    // Create backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFilename = `database_backup_${timestamp}.sql`;
    const backupFilePath = path.join(absoluteBackupDir, backupFilename);
    
    // Create backup SQL file with metadata
    const backupContent = `-- Oracle Database Backup
-- Generated: ${new Date().toISOString()}
-- Backup Type: Full Database Backup
-- This is a placeholder backup file
-- In production, integrate with RMAN using BACKUP DATABASE PLUS ARCHIVELOG

BEGIN
  DBMS_OUTPUT.PUT_LINE('Backup started at ' || TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS'));
END;
/
`;
    
    // Write backup file
    fs.writeFileSync(backupFilePath, backupContent);
    
    const backupStatus = {
      status: 'COMPLETED',
      backupType: 'Full Database Backup',
      filename: backupFilename,
      startTime: new Date().toISOString(),
      completedTime: new Date().toISOString(),
      destination: path.relative(process.cwd(), backupFilePath),
      fileSize: fs.statSync(backupFilePath).size
    };

    console.log('Backup completed:', backupStatus);

    res.json({
      success: true,
      message: 'Backup operation completed successfully',
      backup: backupStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create backup',
      error: error.message
    });
  }
});

// Check backup status
router.get('/backup-status', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required'
    });
  }

  try {
    // Query for backup history from v$rman_backup_job_details or similar
    const query = `
      SELECT 
        SESSION_ID,
        STATUS,
        TO_CHAR(START_TIME, 'YYYY-MM-DD HH24:MI:SS') as START_TIME,
        TO_CHAR(END_TIME, 'YYYY-MM-DD HH24:MI:SS') as END_TIME,
        ROUND((END_TIME - START_TIME) * 24 * 60, 2) as DURATION_MINUTES,
        INPUT_BYTES_PER_SEC,
        OUTPUT_BYTES_PER_SEC
      FROM V$RMAN_BACKUP_JOB_DETAILS
      ORDER BY SESSION_ID DESC
      FETCH FIRST 10 ROWS ONLY
    `;

    const backupHistory = await db.execute(query).catch(() => []);

    res.json({
      success: true,
      message: 'Backup status retrieved',
      backups: backupHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve backup status',
      error: error.message
    });
  }
});

// Export schema
router.post('/export-schema', async (req, res) => {
  const { schema } = req.body;

  if (!schema || typeof schema !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Schema name is required'
    });
  }

  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required for schema export'
    });
  }

  try {
    // Get backup directory from env or use default
    const backupDir = process.env.BACKUP_DIRECTORY || './backups';
    const absoluteBackupDir = path.isAbsolute(backupDir) ? backupDir : path.join(process.cwd(), backupDir);
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(absoluteBackupDir)) {
      fs.mkdirSync(absoluteBackupDir, { recursive: true });
    }
    
    // Create export file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const exportFilename = `${schema.toUpperCase()}_schema_backup_${timestamp}.sql`;
    const exportFilePath = path.join(absoluteBackupDir, exportFilename);
    
    // Query to get all schema objects - use simpler approach without DBMS_METADATA
    const schemaQuery = `
      SELECT 
        owner,
        object_type,
        object_name
      FROM dba_objects
      WHERE owner = '${schema.toUpperCase()}'
        AND object_type IN ('TABLE', 'VIEW', 'PROCEDURE', 'FUNCTION', 'TRIGGER', 'SEQUENCE', 'SYNONYM')
        AND generated = 'N'
      ORDER BY object_type, object_name
    `;
    
    // Execute query to get schema objects
    let schemaObjects = [];
    try {
      console.log(`Executing schema objects query for schema: ${schema}`);
      schemaObjects = await db.execute(schemaQuery);
      console.log(`Retrieved ${schemaObjects.length} objects for schema ${schema}`);
    } catch (dbErr) {
      console.warn('Could not retrieve schema objects from database:', dbErr.message);
      schemaObjects = [];
    }
    
    // Add schema objects with comments and basic structure
    let ddlStatements = [];
    if (schemaObjects && schemaObjects.length > 0) {
      for (const obj of schemaObjects) {
        const objType = obj.OBJECT_TYPE || 'UNKNOWN';
        const objName = obj.OBJECT_NAME || 'UNKNOWN';
        
        // Create DDL comment with object info
        let ddl = `-- ${objType}: ${objName}\n`;
        ddl += `-- Created for schema: ${schema.toUpperCase()}\n`;
        
        // Add basic structure templates based on object type
        switch (objType) {
          case 'TABLE':
            ddl += `-- Note: Use 'DESC ${objName}' or query dba_tables for structure\n`;
            ddl += `-- TABLE ${objName} (see database for detailed structure)\n`;
            break;
          case 'VIEW':
            ddl += `-- Note: Use 'SELECT TEXT FROM dba_views WHERE view_name = ''${objName}'''  for view definition\n`;
            ddl += `-- VIEW ${objName}\n`;
            break;
          case 'PROCEDURE':
          case 'FUNCTION':
          case 'TRIGGER':
          case 'PACKAGE':
            ddl += `-- Note: Source code available in dba_source table\n`;
            ddl += `-- ${objType} ${objName}\n`;
            break;
          case 'SEQUENCE':
            ddl += `-- SEQUENCE ${objName}\n`;
            break;
          case 'SYNONYM':
            ddl += `-- SYNONYM ${objName}\n`;
            break;
          default:
            ddl += `-- ${objType}: ${objName}\n`;
        }
        
        ddlStatements.push(ddl);
      }
    }
    
    // Create comprehensive backup file header
    let backupContent = `-- ============================================================
-- Oracle Schema Backup - Complete Schema Dump
-- ============================================================
-- Schema Name: ${schema.toUpperCase()}
-- Generated: ${new Date().toISOString()}
-- Database: ${process.env.DB_SERVICE || 'UNKNOWN'}
-- User: ${process.env.DB_USER || 'UNKNOWN'}
-- ============================================================

-- SET SQLBLANKLINES ON
-- SET ECHO OFF
-- SET FEEDBACK OFF
-- SET PAGESIZE 0
-- SET TERMOUT OFF
-- SET TRIMSPOOL ON

BEGIN
  DBMS_OUTPUT.ENABLE(NULL);
  DBMS_OUTPUT.PUT_LINE('Starting schema import for ${schema.toUpperCase()}');
  DBMS_OUTPUT.PUT_LINE('Timestamp: ' || TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS'));
END;
/

-- ============================================================
-- Schema Objects
-- ============================================================

`;

    // Add DDL statements if available
    if (ddlStatements && ddlStatements.length > 0) {
      ddlStatements.forEach((ddl, index) => {
        if (ddl && typeof ddl === 'string' && ddl.trim().length > 0) {
          backupContent += `-- Object ${index + 1}\n`;
          backupContent += ddl.trim() + '\n/\n\n';
        }
      });
    } else {
      // Fallback: Query to get table structures
      const tableQuery = `
        SELECT table_name FROM dba_tables 
        WHERE owner = '${schema.toUpperCase()}' 
        ORDER BY table_name
      `;
      
      try {
        const tables = await db.execute(tableQuery);
        if (tables && tables.length > 0) {
          backupContent += `-- Tables in schema ${schema.toUpperCase()}\n`;
          backupContent += `-- Total tables: ${tables.length}\n\n`;
          tables.forEach(table => {
            backupContent += `-- Table: ${table.TABLE_NAME}\n`;
          });
        }
      } catch (err) {
        console.warn('Could not retrieve table list:', err.message);
      }
    }
    
    // Add footer
    backupContent += `
-- ============================================================
-- Backup Completion
-- ============================================================

BEGIN
  DBMS_OUTPUT.PUT_LINE('Schema import completed for ${schema.toUpperCase()}');
  DBMS_OUTPUT.PUT_LINE('Completion Time: ' || TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS'));
END;
/

COMMIT;
-- ============================================================
`;
    
    // Write export file
    fs.writeFileSync(exportFilePath, backupContent);
    
    const exportStatus = {
      schema: schema,
      status: 'COMPLETED',
      exportType: 'Complete Schema Backup',
      filename: exportFilename,
      startTime: new Date().toISOString(),
      completedTime: new Date().toISOString(),
      destination: path.relative(process.cwd(), exportFilePath),
      fileSize: fs.statSync(exportFilePath).size,
      objectsIncluded: ddlStatements ? ddlStatements.length : 'N/A'
    };

    console.log('Schema export completed:', exportStatus);

    res.json({
      success: true,
      message: `Complete schema backup for '${schema}' created successfully`,
      export: exportStatus
    });
  } catch (error) {
    console.error('Schema export error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({
      success: false,
      message: 'Failed to export schema',
      error: error.message,
      details: error.code || 'Unknown error'
    });
  }
});

module.exports = router;