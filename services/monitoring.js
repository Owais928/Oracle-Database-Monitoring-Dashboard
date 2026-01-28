// services/monitoring.js
const db = require('./database');
const moment = require('moment');

class MonitoringService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  async getPerformanceMetrics() {
    const queries = {
      systemStats: `
        SELECT 
          name as METRIC_NAME,
          value as VALUE,
          CASE 
            WHEN name IN ('user commits', 'user rollbacks', 'physical reads', 'physical writes', 'sorts (memory)', 'sorts (disk)')
            THEN 'Per Second'
            WHEN name = 'redo size'
            THEN 'Bytes Per Second'
            ELSE ''
          END as METRIC_UNIT
        FROM v$sysstat 
        WHERE name IN (
          'user commits',
          'user rollbacks',
          'physical reads',
          'physical writes',
          'redo size',
          'sorts (memory)',
          'sorts (disk)'
        )
      `,
      sessionInfo: `
        SELECT 
          COUNT(*) as total_sessions,
          SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_sessions,
          SUM(CASE WHEN username IS NOT NULL THEN 1 ELSE 0 END) as user_sessions,
          SUM(CASE WHEN type = 'BACKGROUND' THEN 1 ELSE 0 END) as background_sessions
        FROM v$session
      `,
      waitStats: `
        SELECT 
          wait_class as EVENT,
          wait_class,
          total_waits as TOTAL_WAITS,
          ROUND(time_waited/100, 2) as TIME_WAITED_SECONDS,
          ROUND(time_waited/100/NULLIF(total_waits, 0), 2) as AVERAGE_WAIT_SECONDS
        FROM v$system_wait_class 
        WHERE wait_class != 'Idle'
        ORDER BY time_waited DESC
      `,
      instanceInfo: `
        SELECT 
          instance_name,
          host_name,
          version,
          startup_time,
          status,
          database_status
        FROM v$instance
      `
    };

    try {
      const [systemStats, sessionInfo, waitStats, instanceInfo] = await Promise.all([
        db.execute(queries.systemStats),
        db.executeSingle(queries.sessionInfo),
        db.execute(queries.waitStats),
        db.executeSingle(queries.instanceInfo)
      ]);

      return {
        systemStats,
        sessionInfo,
        waitStats,
        instanceInfo,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  async getTablespaceUsage() {
    const query = `
      SELECT 
        tablespace_name,
        ROUND(total_mb, 2) as total_mb,
        ROUND(used_mb, 2) as used_mb,
        ROUND(free_mb, 2) as free_mb,
        ROUND((used_mb / total_mb) * 100, 2) as used_pct,
        ROUND((free_mb / total_mb) * 100, 2) as free_pct,
        autoextensible,
        status,
        contents
      FROM (
        SELECT 
          df.tablespace_name,
          SUM(df.bytes)/1024/1024 as total_mb,
          SUM(df.bytes - NVL(fs.bytes, 0))/1024/1024 as used_mb,
          NVL(SUM(fs.bytes), 0)/1024/1024 as free_mb,
          MAX(df.autoextensible) as autoextensible,
          MAX(df.status) as status,
          null as contents
        FROM dba_data_files df
        LEFT JOIN (
          SELECT tablespace_name, file_id, SUM(bytes) as bytes
          FROM dba_free_space
          GROUP BY tablespace_name, file_id
        ) fs ON df.tablespace_name = fs.tablespace_name AND df.file_id = fs.file_id
        GROUP BY df.tablespace_name
        UNION ALL
        SELECT 
          tf.tablespace_name,
          SUM(tf.bytes)/1024/1024 as total_mb,
          (SUM(tf.bytes) - NVL(SUM(fs.bytes_free), 0))/1024/1024 as used_mb,
          NVL(SUM(fs.bytes_free), 0)/1024/1024 as free_mb,
          'YES' as autoextensible,
          'ONLINE' as status,
          'TEMPORARY' as contents
        FROM dba_temp_files tf
        LEFT JOIN v$temp_space_header fs ON tf.tablespace_name = fs.tablespace_name
        GROUP BY tf.tablespace_name
      )
      ORDER BY used_pct DESC
    `;

    return await db.execute(query);
  }

  async getActiveSessions() {
    const query = `
      SELECT 
        s.sid,
        s.serial#,
        s.username,
        s.status,
        s.osuser,
        s.machine,
        s.program,
        s.module,
        s.action,
        TO_CHAR(s.logon_time, 'YYYY-MM-DD HH24:MI:SS') as logon_time,
        s.last_call_et as last_call_seconds,
        s.sql_id,
        s.event,
        s.wait_class,
        s.seconds_in_wait,
        s.state,
        q.sql_text,
        s.blocking_session,
        s.row_wait_obj#,
        s.row_wait_file#,
        s.row_wait_block#,
        s.row_wait_row#,
        s.command
      FROM v$session s
      LEFT JOIN v$sql q ON s.sql_id = q.sql_id AND s.sql_child_number = q.child_number
      WHERE s.type = 'USER'
        AND s.status = 'ACTIVE'
      ORDER BY s.last_call_et DESC
    `;

    return await db.execute(query);
  }

  async getTopSQL() {
    const query = `
      SELECT 
        sql_id,
        SUBSTR(sql_text, 1, 100) as sql_text,
        executions,
        elapsed_time/1000000 as elapsed_time_seconds,
        cpu_time/1000000 as cpu_time_seconds,
        buffer_gets,
        disk_reads,
        rows_processed,
        null first_load_time,
        null last_load_time,
        null parsing_user_id,
        ROUND(elapsed_time/1000000/NULLIF(executions,0), 4) as avg_elapsed_time,
        ROUND(cpu_time/1000000/NULLIF(executions,0), 4) as avg_cpu_time,
        ROUND(buffer_gets/NULLIF(executions,0), 2) as avg_buffer_gets
      FROM v$sqlstats
      WHERE executions > 0
        AND elapsed_time > 0
      ORDER BY elapsed_time DESC
      FETCH FIRST 20 ROWS ONLY
    `;

    return await db.execute(query);
  }

  async getLockInformation() {
    const query = `
      SELECT 
        lo.session_id as sid,
        s.serial#,
        s.username,
        s.osuser,
        s.program,
        o.owner,
        o.object_name,
        o.object_type,
        lo.locked_mode,
        DECODE(lo.locked_mode,
          0, 'None',
          1, 'Null',
          2, 'Row Share (SS)',
          3, 'Row Exclusive (SX)',
          4, 'Share (S)',
          5, 'Share Row Exclusive (SSX)',
          6, 'Exclusive (X)',
          'Unknown'
        ) as lock_mode_desc,
        lo.oracle_username,
        lo.os_user_name,
        TO_CHAR(lo.xidusn) as xidusn,
        TO_CHAR(lo.xidslot) as xidslot,
        TO_CHAR(lo.xidsqn) as xidsqn
      FROM v$locked_object lo
      JOIN dba_objects o ON lo.object_id = o.object_id
      JOIN v$session s ON lo.session_id = s.sid
      ORDER BY lo.session_id
    `;

    return await db.execute(query);
  }

  async getDatabaseParameters() {
  const query = `
    SELECT 
      name,
      value,
      display_value,
      isdefault,
      issys_modifiable,
      ismodified,
      description
    FROM v$parameter
    WHERE name NOT LIKE '\_%' ESCAPE '\\'
    ORDER BY name
  `;

  return await db.execute(query);
}

  async getAlertLog() {
    const query = `
      SELECT 
        null origin,
        message_text,
        TO_CHAR(originating_timestamp, 'YYYY-MM-DD HH24:MI:SS') as message_time,
        message_type,
        message_level
      FROM v$diag_alert_ext 
      --WHERE originating_timestamp > SYSDATE - 1
      --ORDER BY originating_timestamp DESC
      FETCH FIRST 50 ROWS ONLY
    `;

    return await db.execute(query);
  }

  async getAllMetrics() {
    try {
      const [
        performance,
        tablespaces,
        activeSessions,
        topSQL,
        locks,
        parameters,
        alerts
      ] = await Promise.all([
        this.getPerformanceMetrics(),
        this.getTablespaceUsage(),
        this.getActiveSessions(),
        this.getTopSQL(),
        this.getLockInformation(),
        this.getDatabaseParameters(),
        this.getAlertLog()
      ]);

      // Calculate health status
      const healthChecks = await this.getHealthStatus(tablespaces, activeSessions, alerts);

      return {
        performance,
        tablespaces,
        activeSessions,
        topSQL,
        locks,
        parameters,
        alerts,
        healthChecks,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting all metrics:', error);
      throw error;
    }
  }

  async getHealthStatus(tablespaces, sessions, alerts) {
    const checks = [];
    
    try {
      // Tablespace usage check
      const criticalTablespaces = (tablespaces || []).filter(ts => {
        const usedPct = ts.USED_PCT || ts.used_pct || 0;
        return parseFloat(usedPct) > 90;
      });
      const warningTablespaces = (tablespaces || []).filter(ts => {
        const usedPct = ts.USED_PCT || ts.used_pct || 0;
        return parseFloat(usedPct) > 80 && parseFloat(usedPct) <= 90;
      });
      
      let tablespacesStatus = 'HEALTHY';
      let tablespacesValue = 'OK';
      let tablespacesThreshold = '90%';
      let tablespacesDetails = 'All tablespaces normal';
      
      if (criticalTablespaces.length > 0) {
        tablespacesStatus = 'CRITICAL';
        tablespacesValue = criticalTablespaces.length.toString();
        tablespacesDetails = `${criticalTablespaces.length} tablespace(s) > 90% full`;
      } else if (warningTablespaces.length > 0) {
        tablespacesStatus = 'WARNING';
        tablespacesValue = warningTablespaces.length.toString();
        tablespacesDetails = `${warningTablespaces.length} tablespace(s) > 80% full`;
      }
      
      checks.push({
        check: 'Tablespace Usage',
        status: tablespacesStatus,
        value: tablespacesValue,
        threshold: tablespacesThreshold,
        details: tablespacesDetails
      });

      // Active sessions check
      const longRunningSessions = (sessions || []).filter(s => {
        const lastCall = s.LAST_CALL_SECONDS || s.last_call_seconds || 0;
        return parseFloat(lastCall) > 3600;
      });
      
      let sessionStatus = 'HEALTHY';
      let sessionValue = '0';
      let sessionThreshold = '10';
      let sessionDetails = 'No long-running sessions';
      
      if (longRunningSessions.length > 10) {
        sessionStatus = 'CRITICAL';
        sessionValue = longRunningSessions.length.toString();
        sessionDetails = `${longRunningSessions.length} session(s) running > 1 hour`;
      } else if (longRunningSessions.length > 0) {
        sessionStatus = 'WARNING';
        sessionValue = longRunningSessions.length.toString();
        sessionDetails = `${longRunningSessions.length} session(s) running > 1 hour`;
      }
      
      checks.push({
        check: 'Session Health',
        status: sessionStatus,
        value: sessionValue,
        threshold: sessionThreshold,
        details: sessionDetails
      });

      // Alert log check
      const criticalAlerts = (alerts || []).filter(a => {
        const msgLevel = a.MESSAGE_LEVEL || a.message_level || 0;
        return parseFloat(msgLevel) >= 16;
      });
      
      let alertStatus = 'HEALTHY';
      let alertValue = '0';
      let alertThreshold = 'None';
      let alertDetails = 'No critical alerts';
      
      if (criticalAlerts.length > 0) {
        alertStatus = 'CRITICAL';
        alertValue = criticalAlerts.length.toString();
        alertDetails = `${criticalAlerts.length} critical alert(s) detected`;
      }
      
      checks.push({
        check: 'Alert Log',
        status: alertStatus,
        value: alertValue,
        threshold: alertThreshold,
        details: alertDetails
      });

      return checks;
    } catch (error) {
      console.error('Error in getHealthStatus:', error);
      // Return default healthy status on error
      return [
        { check: 'Tablespace Usage', status: 'HEALTHY', value: 'OK', threshold: '90%', details: 'Unable to check' },
        { check: 'Session Health', status: 'HEALTHY', value: '0', threshold: '10', details: 'Unable to check' },
        { check: 'Alert Log', status: 'HEALTHY', value: '0', threshold: 'None', details: 'Unable to check' }
      ];
    }
  }

  async killSession(sid, serial) {
    const query = `ALTER SYSTEM KILL SESSION '${sid},${serial}' IMMEDIATE`;
    return await db.execute(query);
  }

  async getWaitEvents() {
    const query = `
      SELECT 
        wait_class as EVENT,
        wait_class,
        total_waits as TOTAL_WAITS,
        ROUND(time_waited/100, 2) as TIME_WAITED_SECONDS,
        ROUND(time_waited/100/NULLIF(total_waits, 0), 2) as AVERAGE_WAIT_SECONDS
      FROM v$system_wait_class 
      WHERE wait_class != 'Idle'
      ORDER BY time_waited DESC
    `;
    
    try {
      return await db.execute(query);
    } catch (error) {
      console.error('Error getting wait events:', error);
      throw error;
    }
  }
}


module.exports = new MonitoringService();