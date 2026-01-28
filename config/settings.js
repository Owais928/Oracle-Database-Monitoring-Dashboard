// config/settings.js
const path = require('path');
require('dotenv').config();

class Settings {
    constructor() {
        this.loadEnvironment();
        this.validateSettings();
    }
    
    loadEnvironment() {
        // Application Settings
        this.app = {
            name: process.env.APP_NAME || 'Oracle Dashboard',
            version: process.env.APP_VERSION || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            port: parseInt(process.env.PORT) || 3000,
            host: process.env.HOST || 'localhost',
            baseUrl: process.env.BASE_URL || `http://localhost:${this.app.port}`,
            sessionSecret: process.env.SESSION_SECRET || 'oracle-dashboard-secret',
            jwtSecret: process.env.JWT_SECRET || 'jwt-secret-key-change-in-production',
            encryptionKey: process.env.ENCRYPTION_KEY || 'encryption-key-32-chars-long',
            enableHTTPS: process.env.ENABLE_HTTPS === 'true',
            sslCertPath: process.env.SSL_CERT_PATH,
            sslKeyPath: process.env.SSL_KEY_PATH
        };
        
        // Database Settings
        this.database = {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 1521,
            service: process.env.DB_SERVICE || 'ORCLCDB',
            user: process.env.DB_USER || 'system',
            password: process.env.DB_PASSWORD || 'password',
            poolMin: parseInt(process.env.DB_POOL_MIN) || 2,
            poolMax: parseInt(process.env.DB_POOL_MAX) || 10,
            poolIncrement: parseInt(process.env.DB_POOL_INCREMENT) || 1,
            poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT) || 60,
            queueTimeout: parseInt(process.env.DB_QUEUE_TIMEOUT) || 60000,
            oracleClientPath: process.env.ORACLE_CLIENT_PATH,
            connectString: `${this.database.host}:${this.database.port}/${this.database.service}`
        };
        
        // Authentication Settings
        this.auth = {
            enabled: process.env.AUTH_ENABLED !== 'false',
            adminUser: process.env.ADMIN_USER || 'admin',
            adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
            sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 24 * 60 * 60 * 1000, // 24 hours
            maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5,
            lockoutTime: parseInt(process.env.LOCKOUT_TIME) || 15 * 60 * 1000, // 15 minutes
            require2FA: process.env.REQUIRE_2FA === 'true',
            allowedIPs: process.env.ALLOWED_IPS ? process.env.ALLOWED_IPS.split(',') : []
        };
        
        // Monitoring Settings
        this.monitoring = {
            refreshInterval: parseInt(process.env.REFRESH_INTERVAL) || 30000, // 30 seconds
            metricsHistorySize: parseInt(process.env.METRICS_HISTORY_SIZE) || 1000,
            enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false',
            healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 5 * 60 * 1000, // 5 minutes
            alertCheckInterval: parseInt(process.env.ALERT_CHECK_INTERVAL) || 60 * 1000, // 1 minute
            enableAlerting: process.env.ENABLE_ALERTING !== 'false',
            cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL) || 24 * 60 * 60 * 1000 // 24 hours
        };
        
        // Alert Thresholds
        this.thresholds = {
            tablespaceCritical: parseFloat(process.env.TABLESPACE_CRITICAL) || 90,
            tablespaceWarning: parseFloat(process.env.TABLESPACE_WARNING) || 80,
            sessionCritical: parseInt(process.env.SESSION_CRITICAL) || 500,
            sessionWarning: parseInt(process.env.SESSION_WARNING) || 300,
            cpuCritical: parseFloat(process.env.CPU_CRITICAL) || 90,
            cpuWarning: parseFloat(process.env.CPU_WARNING) || 70,
            memoryCritical: parseFloat(process.env.MEMORY_CRITICAL) || 90,
            memoryWarning: parseFloat(process.env.MEMORY_WARNING) || 70,
            iowaitCritical: parseFloat(process.env.IOWAIT_CRITICAL) || 50,
            iowaitWarning: parseFloat(process.env.IOWAIT_WARNING) || 30,
            lockCritical: parseInt(process.env.LOCK_CRITICAL) || 20,
            lockWarning: parseInt(process.env.LOCK_WARNING) || 10
        };
        
        // Email Settings (for alerts)
        this.email = {
            enabled: process.env.EMAIL_ENABLED === 'true',
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASSWORD,
            from: process.env.EMAIL_FROM || 'oracle-dashboard@localhost',
            alertRecipients: process.env.ALERT_RECIPIENTS ? 
                process.env.ALERT_RECIPIENTS.split(',') : []
        };
        
        // Webhook Settings
        this.webhooks = {
            enabled: process.env.WEBHOOKS_ENABLED === 'true',
            url: process.env.WEBHOOK_URL,
            secret: process.env.WEBHOOK_SECRET,
            events: process.env.WEBHOOK_EVENTS ? 
                process.env.WEBHOOK_EVENTS.split(',') : ['CRITICAL', 'WARNING']
        };
        
        // Logging Settings
        this.logging = {
            level: process.env.LOG_LEVEL || 'info',
            directory: process.env.LOG_DIRECTORY || path.join(__dirname, '../logs'),
            maxSize: parseInt(process.env.LOG_MAX_SIZE) || 10 * 1024 * 1024, // 10MB
            maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
            enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
            enableFile: process.env.LOG_ENABLE_FILE === 'true',
            format: process.env.LOG_FORMAT || 'combined'
        };
        
        // Backup Settings
        this.backup = {
            enabled: process.env.BACKUP_ENABLED === 'true',
            directory: process.env.BACKUP_DIRECTORY || path.join(__dirname, '../backups'),
            schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
            retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 30,
            compression: process.env.BACKUP_COMPRESSION !== 'false',
            encryption: process.env.BACKUP_ENCRYPTION === 'true',
            encryptionKey: process.env.BACKUP_ENCRYPTION_KEY
        };
        
        // Security Settings
        this.security = {
            rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
            rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
            rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100,
            corsOrigin: process.env.CORS_ORIGIN || '*',
            enableCSP: process.env.ENABLE_CSP === 'true',
            enableHSTS: process.env.ENABLE_HSTS === 'true',
            enableXSSProtection: process.env.ENABLE_XSS_PROTECTION !== 'false',
            enableNosniff: process.env.ENABLE_NOSNIFF !== 'false',
            enableFrameGuard: process.env.ENABLE_FRAME_GUARD !== 'false'
        };
        
        // UI Settings
        this.ui = {
            theme: process.env.UI_THEME || 'dark',
            defaultPage: process.env.UI_DEFAULT_PAGE || 'dashboard',
            refreshOptions: [10000, 30000, 60000, 300000, 0], // 10s, 30s, 1m, 5m, manual
            chartsEnabled: process.env.UI_CHARTS_ENABLED !== 'false',
            realtimeUpdates: process.env.UI_REALTIME_UPDATES !== 'false',
            exportEnabled: process.env.UI_EXPORT_ENABLED !== 'false',
            maxExportRows: parseInt(process.env.UI_MAX_EXPORT_ROWS) || 10000
        };
    }
    
    validateSettings() {
        const errors = [];
        
        // Validate required settings
        if (!this.database.host) errors.push('DB_HOST is required');
        if (!this.database.user) errors.push('DB_USER is required');
        if (!this.database.password) errors.push('DB_PASSWORD is required');
        if (!this.database.service) errors.push('DB_SERVICE is required');
        
        // Validate port numbers
        if (this.app.port < 1 || this.app.port > 65535) {
            errors.push(`Invalid PORT: ${this.app.port}`);
        }
        
        if (this.database.port < 1 || this.database.port > 65535) {
            errors.push(`Invalid DB_PORT: ${this.database.port}`);
        }
        
        // Validate thresholds
        if (this.thresholds.tablespaceWarning >= this.thresholds.tablespaceCritical) {
            errors.push('TABLESPACE_WARNING must be less than TABLESPACE_CRITICAL');
        }
        
        if (this.thresholds.sessionWarning >= this.thresholds.sessionCritical) {
            errors.push('SESSION_WARNING must be less than SESSION_CRITICAL');
        }
        
        // Validate email settings if enabled
        if (this.email.enabled) {
            if (!this.email.host) errors.push('EMAIL_HOST is required when email is enabled');
            if (!this.email.user) errors.push('EMAIL_USER is required when email is enabled');
            if (!this.email.password) errors.push('EMAIL_PASSWORD is required when email is enabled');
        }
        
        // Validate backup settings if enabled
        if (this.backup.enabled && this.backup.encryption && !this.backup.encryptionKey) {
            errors.push('BACKUP_ENCRYPTION_KEY is required when backup encryption is enabled');
        }
        
        if (errors.length > 0) {
            console.error('Configuration errors:', errors);
            throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
        }
    }
    
    // Getters for specific settings groups
    getDatabaseConfig() {
        return {
            ...this.database,
            connectString: `${this.database.host}:${this.database.port}/${this.database.service}`
        };
    }
    
    getAppConfig() {
        return this.app;
    }
    
    getAuthConfig() {
        return this.auth;
    }
    
    getMonitoringConfig() {
        return this.monitoring;
    }
    
    getThresholds() {
        return this.thresholds;
    }
    
    getLoggingConfig() {
        return this.logging;
    }
    
    getSecurityConfig() {
        return this.security;
    }
    
    getUIConfig() {
        return this.ui;
    }
    
    getEmailConfig() {
        return this.email;
    }
    
    getBackupConfig() {
        return this.backup;
    }
    
    // Helper methods
    isProduction() {
        return this.app.environment === 'production';
    }
    
    isDevelopment() {
        return this.app.environment === 'development';
    }
    
    getBaseURL() {
        return this.app.baseUrl;
    }
    
    getRefreshIntervals() {
        return this.ui.refreshOptions;
    }
    
    // Update settings dynamically
    updateSetting(category, key, value) {
        if (this[category] && this[category][key] !== undefined) {
            this[category][key] = value;
            return true;
        }
        return false;
    }
    
    // Export all settings (for debugging)
    getAllSettings() {
        return {
            app: this.app,
            database: this.database,
            auth: this.auth,
            monitoring: this.monitoring,
            thresholds: this.thresholds,
            email: this.email,
            webhooks: this.webhooks,
            logging: this.logging,
            backup: this.backup,
            security: this.security,
            ui: this.ui
        };
    }
    
    // Get settings for client-side (safe settings only)
    getClientSettings() {
        return {
            app: {
                name: this.app.name,
                version: this.app.version,
                baseUrl: this.app.baseUrl
            },
            ui: this.ui,
            monitoring: {
                refreshInterval: this.monitoring.refreshInterval
            }
        };
    }
}

// Singleton instance
module.exports = new Settings();