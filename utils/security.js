// utils/security.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class Security {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'oracle-dashboard-secret-key';
        this.jwtExpiry = '24h';
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-32chars-';
        this.ivLength = 16;
    }
    
    // JWT Authentication
    generateToken(user) {
        const payload = {
            userId: user.id,
            username: user.username,
            role: user.role,
            email: user.email
        };
        
        return jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.jwtExpiry,
            issuer: 'oracle-dashboard',
            audience: 'dashboard-users'
        });
    }
    
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret, {
                issuer: 'oracle-dashboard',
                audience: 'dashboard-users'
            });
        } catch (error) {
            return null;
        }
    }
    
    decodeToken(token) {
        try {
            return jwt.decode(token);
        } catch (error) {
            return null;
        }
    }
    
    // Password Hashing
    async hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return { salt, hash };
    }
    
    async verifyPassword(password, storedHash, salt) {
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return hash === storedHash;
    }
    
    // Encryption/Decryption
    encrypt(text) {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv('aes-256-cbc', 
            Buffer.from(this.encryptionKey), iv);
        
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }
    
    decrypt(text) {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift(), 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        
        const decipher = crypto.createDecipheriv('aes-256-cbc',
            Buffer.from(this.encryptionKey), iv);
        
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted.toString();
    }
    
    // Input Validation
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        // Remove potentially dangerous characters
        return input
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/[&]/g, '&amp;')
            .replace(/["]/g, '&quot;')
            .replace(/[']/g, '&#x27;')
            .replace(/[/]/g, '&#x2F;')
            .trim();
    }
    
    validateSQLInput(sql) {
        if (!sql || typeof sql !== 'string') {
            return { valid: false, error: 'SQL query is required' };
        }
        
        // Check for dangerous patterns
        const dangerousPatterns = [
            /DROP\s+(DATABASE|USER|TABLE)\s+/i,
            /TRUNCATE\s+TABLE\s+/i,
            /ALTER\s+SYSTEM\s+(KILL|DISCONNECT)\s+/i,
            /SHUTDOWN/i,
            /STARTUP/i,
            /GRANT\s+/i,
            /REVOKE\s+/i,
            /\bUNION\s+SELECT\b/i,
            /\bOR\b.*\b1\s*=\s*1\b/i,
            /EXEC\s+/i,
            /EXECUTE\s+/i,
            /;\s*DROP/i,
            /;\s*DELETE/i,
            /;\s*UPDATE/i,
            /;\s*INSERT/i
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(sql)) {
                return { 
                    valid: false, 
                    error: 'Potentially dangerous SQL detected',
                    pattern: pattern.toString()
                };
            }
        }
        
        // Check query length
        if (sql.length > 10000) {
            return { valid: false, error: 'SQL query too long' };
        }
        
        return { valid: true };
    }
    
    // Rate Limiting
    createRateLimiter(maxRequests, windowMs) {
        const requests = new Map();
        
        return (identifier) => {
            const now = Date.now();
            const windowStart = now - windowMs;
            
            // Clean old entries
            for (const [key, timestamp] of requests.entries()) {
                if (timestamp < windowStart) {
                    requests.delete(key);
                }
            }
            
            // Count requests in current window
            const userRequests = Array.from(requests.values())
                .filter(timestamp => timestamp > windowStart)
                .length;
            
            if (userRequests >= maxRequests) {
                return false; // Rate limit exceeded
            }
            
            requests.set(identifier, now);
            return true; // Request allowed
        };
    }
    
    // CSRF Protection
    generateCSRFToken() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    validateCSRFToken(token, sessionToken) {
        if (!token || !sessionToken) return false;
        return crypto.timingSafeEqual(
            Buffer.from(token),
            Buffer.from(sessionToken)
        );
    }
    
    // Session Security
    generateSessionId() {
        return crypto.randomBytes(32).toString('hex');
    }
    
    secureSessionCookie() {
        return {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        };
    }
    
    // Audit Logging
    createAuditLog(user, action, details = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            userId: user.id,
            username: user.username,
            ipAddress: user.ip,
            userAgent: user.userAgent,
            action,
            details: JSON.stringify(details),
            severity: this.getActionSeverity(action)
        };
        
        // Here you would typically save to database
        console.log('[AUDIT]', logEntry);
        
        return logEntry;
    }
    
    getActionSeverity(action) {
        const criticalActions = [
            'USER_LOGIN_FAILED',
            'SESSION_KILLED',
            'DATABASE_SHUTDOWN',
            'BACKUP_DELETED',
            'USER_CREATED',
            'USER_DELETED'
        ];
        
        const warningActions = [
            'USER_LOGIN',
            'USER_LOGOUT',
            'SQL_EXECUTED',
            'BACKUP_STARTED',
            'TABLESPACE_RESIZED'
        ];
        
        if (criticalActions.includes(action)) return 'CRITICAL';
        if (warningActions.includes(action)) return 'WARNING';
        return 'INFO';
    }
    
    // IP Address Validation
    validateIPAddress(ip) {
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        
        return ipv4Regex.test(ip) || ipv6Regex.test(ip);
    }
    
    // File Upload Security
    validateFileUpload(file, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']) {
        if (!file) {
            return { valid: false, error: 'No file provided' };
        }
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return { valid: false, error: 'File too large (max 10MB)' };
        }
        
        // Check file type
        if (!allowedTypes.includes(file.mimetype)) {
            return { valid: false, error: 'Invalid file type' };
        }
        
        // Check file extension
        const allowedExtensions = allowedTypes.map(type => 
            type.split('/')[1]
        );
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        
        if (!allowedExtensions.includes(fileExtension)) {
            return { valid: false, error: 'Invalid file extension' };
        }
        
        // Scan for malicious content (basic check)
        const maliciousPatterns = [
            /<\?php/i,
            /<script/i,
            /eval\(/i,
            /base64_decode/i,
            /system\(/i,
            /exec\(/i
        ];
        
        for (const pattern of maliciousPatterns) {
            if (pattern.test(file.buffer.toString())) {
                return { valid: false, error: 'Malicious content detected' };
            }
        }
        
        return { valid: true };
    }
    
    // API Key Generation
    generateAPIKey() {
        return crypto.randomBytes(32).toString('base64')
            .replace(/[+/=]/g, '') // Remove URL-unsafe characters
            .substring(0, 32);
    }
    
    // Password Strength Check
    checkPasswordStrength(password) {
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        };
        
        const score = Object.values(checks).filter(Boolean).length;
        
        let strength;
        if (score >= 5) strength = 'strong';
        else if (score >= 3) strength = 'medium';
        else strength = 'weak';
        
        return {
            strength,
            score,
            checks,
            valid: score >= 3
        };
    }
    
    // Data Masking
    maskSensitiveData(data, fields = ['password', 'token', 'secret', 'key']) {
        if (typeof data !== 'object' || data === null) {
            return data;
        }
        
        const masked = Array.isArray(data) ? [] : {};
        
        for (const key in data) {
            if (fields.some(field => key.toLowerCase().includes(field))) {
                masked[key] = '***MASKED***';
            } else if (typeof data[key] === 'object' && data[key] !== null) {
                masked[key] = this.maskSensitiveData(data[key], fields);
            } else {
                masked[key] = data[key];
            }
        }
        
        return masked;
    }
    
    // Request Signature
    signRequest(data, secret) {
        const hmac = crypto.createHmac('sha256', secret);
        hmac.update(JSON.stringify(data));
        return hmac.digest('hex');
    }
    
    verifyRequestSignature(data, signature, secret) {
        const expectedSignature = this.signRequest(data, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }
}

module.exports = new Security();