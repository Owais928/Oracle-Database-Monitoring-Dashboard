-- Create tables for dashboard metrics storage
BEGIN
    -- Metrics history table
    EXECUTE IMMEDIATE '
    CREATE TABLE dashboard_metrics_history (
        metric_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        metric_type VARCHAR2(50) NOT NULL,
        metric_name VARCHAR2(100) NOT NULL,
        metric_value NUMBER,
        metric_unit VARCHAR2(50),
        timestamp TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
        instance_name VARCHAR2(100),
        CONSTRAINT chk_metric_type CHECK (metric_type IN (''SYSTEM_STAT'', ''TABLESPACE'', ''SESSION_COUNT'', ''WAIT_EVENT''))
    )';
    
    -- Create index for faster queries
    EXECUTE IMMEDIATE '
    CREATE INDEX idx_metrics_timestamp ON dashboard_metrics_history(timestamp)';
    
    EXECUTE IMMEDIATE '
    CREATE INDEX idx_metrics_type_name ON dashboard_metrics_history(metric_type, metric_name)';
    
    -- Alerts table
    EXECUTE IMMEDIATE '
    CREATE TABLE dashboard_alerts (
        alert_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        alert_type VARCHAR2(50) NOT NULL,
        severity VARCHAR2(20) NOT NULL,
        message VARCHAR2(500) NOT NULL,
        details CLOB,
        timestamp TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
        acknowledged NUMBER(1) DEFAULT 0,
        acknowledged_by VARCHAR2(100),
        acknowledged_at TIMESTAMP,
        CONSTRAINT chk_severity CHECK (severity IN (''CRITICAL'', ''WARNING'', ''INFO'')),
        CONSTRAINT chk_acknowledged CHECK (acknowledged IN (0, 1))
    )';
    
    -- Health check log table
    EXECUTE IMMEDIATE '
    CREATE TABLE dashboard_health_log (
        log_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
        critical_count NUMBER DEFAULT 0,
        warning_count NUMBER DEFAULT 0,
        healthy_count NUMBER DEFAULT 0,
        details CLOB
    )';
    
    -- Audit log table
    EXECUTE IMMEDIATE '
    CREATE TABLE dashboard_audit_log (
        audit_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
        user_id VARCHAR2(100),
        username VARCHAR2(100),
        ip_address VARCHAR2(45),
        user_agent VARCHAR2(500),
        action VARCHAR2(100) NOT NULL,
        details CLOB,
        severity VARCHAR2(20) DEFAULT ''INFO'',
        CONSTRAINT chk_audit_severity CHECK (severity IN (''CRITICAL'', ''WARNING'', ''INFO''))
    )';
    
    -- Create index for audit log
    EXECUTE IMMEDIATE '
    CREATE INDEX idx_audit_timestamp ON dashboard_audit_log(timestamp)';
    
    EXECUTE IMMEDIATE '
    CREATE INDEX idx_audit_action ON dashboard_audit_log(action)';
    
    -- User sessions table (for tracking dashboard users)
    EXECUTE IMMEDIATE '
    CREATE TABLE dashboard_user_sessions (
        session_id VARCHAR2(100) PRIMARY KEY,
        user_id VARCHAR2(100) NOT NULL,
        username VARCHAR2(100) NOT NULL,
        login_time TIMESTAMP DEFAULT SYSTIMESTAMP,
        last_activity TIMESTAMP DEFAULT SYSTIMESTAMP,
        ip_address VARCHAR2(45),
        user_agent VARCHAR2(500),
        is_active NUMBER(1) DEFAULT 1,
        CONSTRAINT chk_session_active CHECK (is_active IN (0, 1))
    )';
    
    DBMS_OUTPUT.PUT_LINE('✓ Tables created successfully');
    
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -955 THEN
            DBMS_OUTPUT.PUT_LINE('⚠ Tables already exist');
        ELSE
            RAISE;
        END IF;
END;
/

-- Create views for reporting
CREATE OR REPLACE VIEW dashboard_metrics_daily AS
SELECT 
    TRUNC(timestamp) as metric_date,
    metric_type,
    metric_name,
    ROUND(AVG(metric_value), 2) as avg_value,
    ROUND(MAX(metric_value), 2) as max_value,
    ROUND(MIN(metric_value), 2) as min_value,
    COUNT(*) as sample_count
FROM dashboard_metrics_history
WHERE timestamp >= SYSDATE - 30
GROUP BY TRUNC(timestamp), metric_type, metric_name;

CREATE OR REPLACE VIEW dashboard_alerts_summary AS
SELECT 
    alert_type,
    severity,
    COUNT(*) as alert_count,
    MIN(timestamp) as first_occurrence,
    MAX(timestamp) as last_occurrence
FROM dashboard_alerts
WHERE timestamp >= SYSDATE - 7
GROUP BY alert_type, severity;

-- Create procedures for data cleanup
CREATE OR REPLACE PROCEDURE cleanup_old_metrics(
    p_days_to_keep NUMBER DEFAULT 90
) AS
BEGIN
    DELETE FROM dashboard_metrics_history
    WHERE timestamp < SYSDATE - p_days_to_keep;
    
    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Cleaned up old metrics data');
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
/

-- Grant necessary privileges to dashboard user
-- Run as SYS or SYSTEM user
DECLARE
    v_user VARCHAR2(30) := 'DBMONT';
BEGIN
    EXECUTE IMMEDIATE 'GRANT CREATE SESSION TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ANY DICTIONARY TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ON V_$SESSION TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ON V_$SYSTEM_EVENT TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ON V_$SYSSTAT TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ON V_$INSTANCE TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ON DBA_DATA_FILES TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ON DBA_FREE_SPACE TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ON DBA_TABLESPACES TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ON V_$LOCKED_OBJECT TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ON DBA_OBJECTS TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ON V_$SQLSTATS TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ON V_$PARAMETER TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ON V_$DIAG_ALERT_EXT TO ' || v_user;
    EXECUTE IMMEDIATE 'GRANT SELECT ON V_$SYSTEM_WAIT_CLASS TO ' || v_user;
    DBMS_OUTPUT.PUT_LINE('Privileges granted to ' || v_user);
END;
/