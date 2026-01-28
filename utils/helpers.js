// utils/helpers.js
const moment = require('moment');

class Helpers {
    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
    
    static formatDuration(seconds) {
        if (seconds < 60) {
            return `${seconds.toFixed(1)}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
        } else if (seconds < 86400) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        } else {
            const days = Math.floor(seconds / 86400);
            const hours = Math.floor((seconds % 86400) / 3600);
            return `${days}d ${hours}h`;
        }
    }
    
    static formatNumber(num) {
        if (num === null || num === undefined) return '0';
        
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(2) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
        }
        
        return num.toString();
    }
    
    static formatPercentage(value, total, decimals = 1) {
        if (!total || total === 0) return '0%';
        return ((value / total) * 100).toFixed(decimals) + '%';
    }
    
    static formatDateTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
        return moment(date).format(format);
    }
    
    static timeAgo(date) {
        return moment(date).fromNow();
    }
    
    static truncateText(text, maxLength = 100) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    static escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    static isValidSQL(sql) {
        // Basic SQL validation
        if (!sql || typeof sql !== 'string') return false;
        
        // Check for dangerous patterns
        const dangerousPatterns = [
            /DROP\s+DATABASE/i,
            /DROP\s+USER/i,
            /ALTER\s+SYSTEM\s+KILL/i,
            /SHUTDOWN/i,
            /STARTUP/i,
            /\bOR\b.*\b1\s*=\s*1\b/i, // SQL injection pattern
            /\bUNION\s+SELECT\b/i
        ];
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(sql)) {
                return false;
            }
        }
        
        return true;
    }
    
    static parseSQL(sql) {
        // Simple SQL parser for display purposes
        const keywords = [
            'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING',
            'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE',
            'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'GRANT', 'REVOKE',
            'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON',
            'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL',
            'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX'
        ];
        
        let formatted = sql;
        
        // Highlight keywords
        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            formatted = formatted.replace(regex, `<strong class="sql-keyword">${keyword}</strong>`);
        });
        
        // Highlight strings
        formatted = formatted.replace(/'[^']*'/g, '<span class="sql-string">$&</span>');
        
        // Highlight numbers
        formatted = formatted.replace(/\b\d+\b/g, '<span class="sql-number">$&</span>');
        
        // Highlight comments
        formatted = formatted.replace(/--.*$/gm, '<span class="sql-comment">$&</span>');
        formatted = formatted.replace(/\/\*[\s\S]*?\*\//g, '<span class="sql-comment">$&</span>');
        
        return formatted;
    }
    
    static generateRandomId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
    
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
    
    static mergeObjects(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                this.mergeObjects(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
        return target;
    }
    
    static flattenObject(obj, prefix = '') {
        return Object.keys(obj).reduce((acc, key) => {
            const pre = prefix.length ? prefix + '.' : '';
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                Object.assign(acc, this.flattenObject(obj[key], pre + key));
            } else {
                acc[pre + key] = obj[key];
            }
            return acc;
        }, {});
    }
    
    static getColorForPercentage(percentage) {
        if (percentage >= 90) return '#dc3545'; // Red
        if (percentage >= 80) return '#ffc107'; // Yellow
        if (percentage >= 70) return '#17a2b8'; // Cyan
        return '#28a745'; // Green
    }
    
    static getStatusColor(status) {
        const colors = {
            'ONLINE': 'success',
            'OFFLINE': 'danger',
            'READ ONLY': 'warning',
            'ACTIVE': 'success',
            'INACTIVE': 'secondary',
            'CRITICAL': 'danger',
            'WARNING': 'warning',
            'HEALTHY': 'success',
            'NORMAL': 'info'
        };
        return colors[status] || 'secondary';
    }
    
    static formatQueryTime(milliseconds) {
        if (milliseconds < 1000) {
            return `${milliseconds.toFixed(0)} ms`;
        } else if (milliseconds < 60000) {
            return `${(milliseconds / 1000).toFixed(2)} s`;
        } else {
            return `${(milliseconds / 60000).toFixed(2)} min`;
        }
    }
    
    static calculatePercentChange(oldValue, newValue) {
        if (!oldValue || oldValue === 0) return 0;
        return ((newValue - oldValue) / oldValue) * 100;
    }
    
    static groupBy(array, key) {
        return array.reduce((result, currentValue) => {
            (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
            return result;
        }, {});
    }
    
    static sortBy(array, key, descending = false) {
        return array.sort((a, b) => {
            const valA = a[key];
            const valB = b[key];
            
            if (valA < valB) return descending ? 1 : -1;
            if (valA > valB) return descending ? -1 : 1;
            return 0;
        });
    }
    
    static filterBy(array, filters) {
        return array.filter(item => {
            for (const key in filters) {
                if (filters[key] !== undefined && item[key] !== filters[key]) {
                    return false;
                }
            }
            return true;
        });
    }
    
    static paginate(array, page = 1, pageSize = 10) {
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return {
            data: array.slice(startIndex, endIndex),
            page: page,
            pageSize: pageSize,
            total: array.length,
            totalPages: Math.ceil(array.length / pageSize)
        };
    }
    
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }
    
    static validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = Helpers;