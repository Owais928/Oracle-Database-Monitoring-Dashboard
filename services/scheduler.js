// services/scheduler.js
const cron = require('node-cron');
const monitoring = require('./monitoring');
const database = require('./database');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

class SchedulerService {
    constructor() {
        this.jobs = new Map();
        this.metricsHistory = [];
        this.maxHistorySize = 1000; // Keep last 1000 data points
    }
    
    initialize() {
        this.startMetricsCollection();
        this.startHealthCheck();
        this.startAlertMonitoring();
        this.startCleanupJob();
        this.startBackupScheduler();
    }
    
    startMetricsCollection() {
        // Collect metrics every 30 seconds
        this.jobs.set('metrics', cron.schedule('*/30 * * * * *', async () => {
            try {
                const metrics = await monitoring.getAllMetrics();
                this.storeMetrics(metrics);
                this.checkThresholds(metrics);
            } catch (error) {
                console.error('Error collecting metrics:', error);
            }
        }));
        
        console.log('Metrics collection scheduler started');
    }
    
    startHealthCheck() {
        // Health check every 5 minutes
        this.jobs.set('health', cron.schedule('*/5 * * * *', async () => {
            try {
                const healthStatus = await this.performHealthCheck();
                this.logHealthStatus(healthStatus);
                
                // Send alerts for critical issues
                if (healthStatus.critical.length > 0) {
                    await this.sendAlerts(healthStatus.critical);
                }
            } catch (error) {
                console.error('Error performing health check:', error);
            }
        }));
        
        console.log('Health check scheduler started');
    }
    
    startAlertMonitoring() {
        // Check alerts every minute
        this.jobs.set('alerts', cron.schedule('* * * * *', async () => {
            try {
                const alerts = await monitoring.getAlertLog();
                const criticalAlerts = alerts.filter(alert => 
                    alert.MESSAGE_LEVEL >= 16 && 
                    alert.MESSAGE_TIME > new Date(Date.now() - 5 * 60000) // Last 5 minutes
                );
                
                if (criticalAlerts.length > 0) {
                    await this.sendAlerts(criticalAlerts.map(alert => ({
                        type: 'ALERT_LOG',
                        severity: 'CRITICAL',
                        message: alert.MESSAGE_TEXT,
                        timestamp: alert.MESSAGE_TIME
                    })));
                }
            } catch (error) {
                console.error('Error monitoring alerts:', error);
            }
        }));
        
        console.log('Alert monitoring scheduler started');
    }
    
    startCleanupJob() {
        // Daily cleanup at 2 AM
        this.jobs.set('cleanup', cron.schedule('0 2 * * *', async () => {
            try {
                await this.cleanupOldData();
                await this.cleanupTempFiles();
                console.log('Cleanup job completed');
            } catch (error) {
                console.error('Error in cleanup job:', error);
            }
        }));
        
        console.log('Cleanup scheduler started');
    }
    
    startBackupScheduler() {
        // Check for backup schedule every hour
        this.jobs.set('backup', cron.schedule('0 * * * *', async () => {
            try {
                await this.checkBackupSchedule();
            } catch (error) {
                console.error('Error checking backup schedule:', error);
            }
        }));
        
        console.log('Backup scheduler started');
    }
    
    async performHealthCheck() {
        const checks = {
            critical: [],
            warning: [],
            healthy: []
        };
        
        try {
            // Check tablespace usage
            const tablespaces = await monitoring.getTablespaceUsage();
            const criticalTablespaces = tablespaces.filter(ts => ts.USED_PCT > 90);
            const warningTablespaces = tablespaces.filter(ts => ts.USED_PCT > 80 && ts.USED_PCT <= 90);
            
            if (criticalTablespaces.length > 0) {
                checks.critical.push({
                    check: 'TABLESPACE_USAGE',
                    message: `${criticalTablespaces.length} tablespace(s) > 90% full`,
                    details: criticalTablespaces.map(ts => `${ts.TABLESPACE_NAME} (${ts.USED_PCT}%)`)
                });
            }
            
            if (warningTablespaces.length > 0) {
                checks.warning.push({
                    check: 'TABLESPACE_USAGE',
                    message: `${warningTablespaces.length} tablespace(s) > 80% full`,
                    details: warningTablespaces.map(ts => `${ts.TABLESPACE_NAME} (${ts.USED_PCT}%)`)
                });
            }
            
            // Check session count
            const performance = await monitoring.getPerformanceMetrics();
            const sessionInfo = performance.sessionInfo || {};
            
            if (sessionInfo.TOTAL_SESSIONS > 500) {
                checks.warning.push({
                    check: 'SESSION_COUNT',
                    message: `High session count: ${sessionInfo.TOTAL_SESSIONS}`,
                    details: `Total sessions exceeding 500`
                });
            }
            
            // Check for long running transactions
            const activeSessions = await monitoring.getActiveSessions();
            const longRunningSessions = activeSessions.filter(s => s.LAST_CALL_SECONDS > 3600);
            
            if (longRunningSessions.length > 5) {
                checks.warning.push({
                    check: 'LONG_RUNNING_SESSIONS',
                    message: `${longRunningSessions.length} session(s) running > 1 hour`,
                    details: longRunningSessions.map(s => `SID ${s.SID}: ${s.LAST_CALL_SECONDS}s`)
                });
            }
            
            // Check for locks
            const locks = await monitoring.getLockInformation();
            if (locks.length > 10) {
                checks.warning.push({
                    check: 'LOCK_CONTENTION',
                    message: `High lock contention: ${locks.length} locks detected`,
                    details: locks.map(l => `${l.OBJECT_NAME} (${l.LOCK_MODE_DESC})`)
                });
            }
            
            // Check database parameters
            const parameters = await monitoring.getDatabaseParameters();
            const importantParams = parameters.filter(p => 
                p.NAME.includes('processes') || 
                p.NAME.includes('sessions') ||
                p.NAME.includes('memory')
            );
            
            const criticalParams = importantParams.filter(p => {
                if (p.NAME === 'processes' && parseInt(p.VALUE) < 300) return true;
                if (p.NAME === 'sessions' && parseInt(p.VALUE) < 500) return true;
                return false;
            });
            
            if (criticalParams.length > 0) {
                checks.warning.push({
                    check: 'DATABASE_PARAMETERS',
                    message: 'Suboptimal database parameters',
                    details: criticalParams.map(p => `${p.NAME}=${p.VALUE}`)
                });
            }
            
            // If no issues found
            if (checks.critical.length === 0 && checks.warning.length === 0) {
                checks.healthy.push({
                    check: 'OVERALL_HEALTH',
                    message: 'All systems operational',
                    details: 'No critical or warning issues detected'
                });
            }
            
        } catch (error) {
            checks.critical.push({
                check: 'HEALTH_CHECK_ERROR',
                message: 'Failed to perform health check',
                details: error.message
            });
        }
        
        return checks;
    }
    
    async checkBackupSchedule() {
        try {
            // Check last backup time
            const backupQuery = `
                SELECT MAX(end_time) as last_backup
                FROM v$rman_backup_job_details 
                WHERE status = 'COMPLETED'
            `;
            
            const result = await database.execute(backupQuery);
            const lastBackup = result[0]?.LAST_BACKUP;
            
            if (lastBackup) {
                const lastBackupTime = new Date(lastBackup);
                const hoursSinceBackup = (Date.now() - lastBackupTime.getTime()) / (1000 * 60 * 60);
                
                if (hoursSinceBackup > 24) {
                    // Backup overdue - send alert
                    await this.sendAlerts([{
                        type: 'BACKUP_OVERDUE',
                        severity: 'WARNING',
                        message: `Last backup was ${Math.round(hoursSinceBackup)} hours ago`,
                        timestamp: new Date().toISOString()
                    }]);
                }
            } else {
                // No backups found
                await this.sendAlerts([{
                    type: 'NO_BACKUPS',
                    severity: 'CRITICAL',
                    message: 'No backups found in RMAN history',
                    timestamp: new Date().toISOString()
                }]);
            }
            
        } catch (error) {
            console.error('Error checking backup schedule:', error);
        }
    }
    
    storeMetrics(metrics) {
        // Store metrics in history
        this.metricsHistory.push({
            timestamp: new Date().toISOString(),
            metrics: metrics
        });
        
        // Trim history if too large
        if (this.metricsHistory.length > this.maxHistorySize) {
            this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
        }
        
        // Optionally store in database
        this.storeMetricsInDatabase(metrics).catch(error => {
            console.error('Error storing metrics in database:', error);
        });
    }
    
    async storeMetricsInDatabase(metrics) {
        // Create metrics table if not exists
        const createTableSQL = `
            BEGIN
                EXECUTE IMMEDIATE '
                    CREATE TABLE dashboard_metrics_history (
                        metric_id NUMBER GENERATED ALWAYS AS IDENTITY,
                        metric_type VARCHAR2(50),
                        metric_name VARCHAR2(100),
                        metric_value NUMBER,
                        metric_unit VARCHAR2(50),
                        timestamp TIMESTAMP,
                        instance_name VARCHAR2(100),
                        CONSTRAINT pk_metrics PRIMARY KEY (metric_id)
                    )';
            EXCEPTION
                WHEN OTHERS THEN
                    IF SQLCODE != -955 THEN
                        RAISE;
                    END IF;
            END;
        `;
        
        try {
            await database.execute(createTableSQL);
            
            // Insert performance metrics
            if (metrics.performance?.systemStats) {
                for (const stat of metrics.performance.systemStats) {
                    await database.execute(
                        `INSERT INTO dashboard_metrics_history (metric_type, metric_name, metric_value, metric_unit, timestamp, instance_name)
                         VALUES (:type, :name, :value, :unit, :timestamp, :instance)`,
                        {
                            type: 'SYSTEM_STAT',
                            name: stat.STAT_NAME,
                            value: stat.VALUE,
                            unit: 'COUNT',
                            timestamp: new Date(),
                            instance: metrics.performance.instanceInfo?.INSTANCE_NAME
                        }
                    );
                }
            }
            
            // Insert tablespace metrics
            if (metrics.tablespaces) {
                for (const ts of metrics.tablespaces) {
                    await database.execute(
                        `INSERT INTO dashboard_metrics_history (metric_type, metric_name, metric_value, metric_unit, timestamp, instance_name)
                         VALUES (:type, :name, :value, :unit, :timestamp, :instance)`,
                        {
                            type: 'TABLESPACE',
                            name: ts.TABLESPACE_NAME,
                            value: ts.USED_PCT,
                            unit: 'PERCENT',
                            timestamp: new Date(),
                            instance: metrics.performance?.instanceInfo?.INSTANCE_NAME
                        }
                    );
                }
            }
            
        } catch (error) {
            console.error('Error storing metrics in database:', error);
        }
    }
    
    checkThresholds(metrics) {
        const alerts = [];
        
        // Check tablespace thresholds
        if (metrics.tablespaces) {
            metrics.tablespaces.forEach(ts => {
                if (ts.USED_PCT > 90) {
                    alerts.push({
                        type: 'TABLESPACE_CRITICAL',
                        severity: 'CRITICAL',
                        message: `Tablespace ${ts.TABLESPACE_NAME} is ${ts.USED_PCT.toFixed(1)}% full`,
                        details: {
                            tablespace: ts.TABLESPACE_NAME,
                            used_pct: ts.USED_PCT,
                            used_mb: ts.USED_MB,
                            total_mb: ts.TOTAL_MB
                        }
                    });
                } else if (ts.USED_PCT > 80) {
                    alerts.push({
                        type: 'TABLESPACE_WARNING',
                        severity: 'WARNING',
                        message: `Tablespace ${ts.TABLESPACE_NAME} is ${ts.USED_PCT.toFixed(1)}% full`,
                        details: {
                            tablespace: ts.TABLESPACE_NAME,
                            used_pct: ts.USED_PCT,
                            used_mb: ts.USED_MB,
                            total_mb: ts.TOTAL_MB
                        }
                    });
                }
            });
        }
        
        // Check session thresholds
        if (metrics.performance?.sessionInfo) {
            const sessionInfo = metrics.performance.sessionInfo;
            if (sessionInfo.ACTIVE_SESSIONS > 100) {
                alerts.push({
                    type: 'HIGH_ACTIVE_SESSIONS',
                    severity: 'WARNING',
                    message: `High active sessions: ${sessionInfo.ACTIVE_SESSIONS}`,
                    details: {
                        active_sessions: sessionInfo.ACTIVE_SESSIONS,
                        total_sessions: sessionInfo.TOTAL_SESSIONS
                    }
                });
            }
        }
        
        // Check wait events
        if (metrics.performance?.waitStats) {
            const totalWaitTime = metrics.performance.waitStats.reduce((sum, ws) => 
                sum + (ws.TIME_WAITED_SECONDS || 0), 0);
            
            if (totalWaitTime > 300) { // More than 5 minutes of waiting
                alerts.push({
                    type: 'HIGH_WAIT_TIME',
                    severity: 'WARNING',
                    message: `High total wait time: ${totalWaitTime.toFixed(2)} seconds`,
                    details: {
                        total_wait_time: totalWaitTime,
                        wait_events: metrics.performance.waitStats.slice(0, 5)
                    }
                });
            }
        }
        
        // Send alerts if any
        if (alerts.length > 0) {
            this.sendAlerts(alerts);
        }
    }
    
    async sendAlerts(alerts) {
        // Store alerts in database
        for (const alert of alerts) {
            try {
                await database.execute(
                    `INSERT INTO dashboard_alerts (alert_type, severity, message, details, timestamp, acknowledged)
                     VALUES (:type, :severity, :message, :details, :timestamp, :acknowledged)`,
                    {
                        type: alert.type,
                        severity: alert.severity,
                        message: alert.message,
                        details: JSON.stringify(alert.details),
                        timestamp: new Date(),
                        acknowledged: 0
                    }
                );
                
                // Log alert
                console.log(`[${alert.severity}] ${alert.type}: ${alert.message}`);
                
                // Here you could add email/SMS/webhook notifications
                // await this.sendEmailAlert(alert);
                // await this.sendWebhookNotification(alert);
                
            } catch (error) {
                console.error('Error storing alert:', error);
            }
        }
    }
    
    async sendEmailAlert(alert) {
        // Implement email notification
        // This is a placeholder for email integration
        console.log(`Would send email alert: ${alert.message}`);
    }
    
    async sendWebhookNotification(alert) {
        // Implement webhook notification
        // This is a placeholder for webhook integration
        console.log(`Would send webhook alert: ${alert.message}`);
    }
    
    async logHealthStatus(healthStatus) {
        try {
            await database.execute(
                `INSERT INTO dashboard_health_log (timestamp, critical_count, warning_count, healthy_count, details)
                 VALUES (:timestamp, :critical, :warning, :healthy, :details)`,
                {
                    timestamp: new Date(),
                    critical: healthStatus.critical.length,
                    warning: healthStatus.warning.length,
                    healthy: healthStatus.healthy.length,
                    details: JSON.stringify({
                        critical: healthStatus.critical,
                        warning: healthStatus.warning,
                        healthy: healthStatus.healthy
                    })
                }
            );
        } catch (error) {
            console.error('Error logging health status:', error);
        }
    }
    
    async cleanupOldData() {
        try {
            // Delete metrics older than 30 days
            await database.execute(
                `DELETE FROM dashboard_metrics_history 
                 WHERE timestamp < SYSDATE - 30`
            );
            
            // Delete alerts older than 90 days (except critical)
            await database.execute(
                `DELETE FROM dashboard_alerts 
                 WHERE timestamp < SYSDATE - 90 
                   AND severity != 'CRITICAL'`
            );
            
            // Delete health logs older than 90 days
            await database.execute(
                `DELETE FROM dashboard_health_log 
                 WHERE timestamp < SYSDATE - 90`
            );
            
            console.log('Old data cleanup completed');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
    
    async cleanupTempFiles() {
        const tempDir = path.join(__dirname, '../temp');
        
        try {
            await fs.access(tempDir);
            const files = await fs.readdir(tempDir);
            
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    await fs.unlink(filePath);
                    console.log(`Deleted temp file: ${file}`);
                }
            }
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error('Error cleaning temp files:', error);
            }
        }
    }
    
    getMetricsHistory(startTime, endTime) {
        return this.metricsHistory.filter(entry => {
            const entryTime = new Date(entry.timestamp).getTime();
            return (!startTime || entryTime >= startTime) && 
                   (!endTime || entryTime <= endTime);
        });
    }
    
    getHistoricalData(metricType, metricName, hours = 24) {
        const startTime = Date.now() - (hours * 60 * 60 * 1000);
        
        return this.metricsHistory
            .filter(entry => new Date(entry.timestamp).getTime() >= startTime)
            .map(entry => {
                let value;
                
                switch (metricType) {
                    case 'TABLESPACE':
                        const ts = entry.metrics.tablespaces?.find(t => 
                            t.TABLESPACE_NAME === metricName);
                        value = ts?.USED_PCT;
                        break;
                        
                    case 'SYSTEM_STAT':
                        const stat = entry.metrics.performance?.systemStats?.find(s => 
                            s.STAT_NAME === metricName);
                        value = stat?.VALUE;
                        break;
                        
                    case 'SESSION_COUNT':
                        value = entry.metrics.performance?.sessionInfo?.TOTAL_SESSIONS;
                        break;
                }
                
                return {
                    timestamp: entry.timestamp,
                    value: value
                };
            })
            .filter(entry => entry.value !== undefined);
    }
    
    stopAllJobs() {
        for (const [name, job] of this.jobs) {
            job.stop();
            console.log(`Stopped job: ${name}`);
        }
        this.jobs.clear();
    }
    
    async runImmediateHealthCheck() {
        return await this.performHealthCheck();
    }
    
    async runCustomJob(sql, description) {
        try {
            console.log(`Running custom job: ${description}`);
            const result = await database.execute(sql);
            return {
                success: true,
                result: result,
                description: description
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                description: description
            };
        }
    }
}

module.exports = new SchedulerService();