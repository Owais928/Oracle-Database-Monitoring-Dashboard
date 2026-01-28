// public/js/dashboard.js
class DashboardManager {
    constructor() {
        this.socket = io();
        this.refreshInterval = 30000;
        this.charts = {};
        this.lastUpdateTime = null;
        this.autoRefresh = true;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initCharts();
        this.startAutoRefresh();
        this.loadInitialData();
    }
    
    setupEventListeners() {
        // Refresh controls
        document.getElementById('refreshInterval').addEventListener('change', (e) => {
            this.refreshInterval = parseInt(e.target.value);
            this.updateRefreshSettings();
        });
        
        // Manual refresh button
        document.querySelector('.refresh-controls .btn').addEventListener('click', () => {
            this.requestImmediateUpdate();
        });
        
        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementById('autoRefreshToggle');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                this.autoRefresh = e.target.checked;
                this.updateRefreshSettings();
            });
        }
    }
    
    initCharts() {
        // Destroy existing charts before creating new ones
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                try {
                    chart.destroy();
                } catch (e) {
                    console.warn('Error destroying chart:', e);
                }
            }
        });
        this.charts = {};
        
        // Performance Chart
        const perfCtx = document.getElementById('performanceChart')?.getContext('2d');
        if (perfCtx) {
            this.charts.performance = new Chart(perfCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'CPU Usage (%)',
                            data: [],
                            borderColor: 'rgb(255, 99, 132)',
                            backgroundColor: 'rgba(255, 99, 132, 0.1)',
                            tension: 0.1,
                            fill: true
                        },
                        {
                            label: 'Memory Usage (%)',
                            data: [],
                            borderColor: 'rgb(54, 162, 235)',
                            backgroundColor: 'rgba(54, 162, 235, 0.1)',
                            tension: 0.1,
                            fill: true
                        },
                        {
                            label: 'I/O Wait (%)',
                            data: [],
                            borderColor: 'rgb(255, 205, 86)',
                            backgroundColor: 'rgba(255, 205, 86, 0.1)',
                            tension: 0.1,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Time'
                            }
                        },
                        y: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Percentage (%)'
                            },
                            min: 0,
                            max: 100
                        }
                    }
                }
            });
        }
        
        // Session Chart
        const sessionCtx = document.getElementById('sessionChart')?.getContext('2d');
        if (sessionCtx) {
            this.charts.sessions = new Chart(sessionCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Active', 'Inactive', 'Background'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: [
                            'rgb(255, 99, 132)',
                            'rgb(54, 162, 235)',
                            'rgb(255, 205, 86)'
                        ],
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            });
        }
        
        // Tablespace Chart
        const tsCtx = document.getElementById('tablespaceChart')?.getContext('2d');
        if (tsCtx) {
            this.charts.tablespaces = new Chart(tsCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Used Space (%)',
                        data: [],
                        backgroundColor: function(context) {
                            const value = context.raw;
                            return value > 90 ? 'rgb(255, 99, 132)' :
                                   value > 80 ? 'rgb(255, 159, 64)' :
                                   'rgb(75, 192, 192)';
                        },
                        borderColor: function(context) {
                            const value = context.raw;
                            return value > 90 ? 'rgb(255, 99, 132)' :
                                   value > 80 ? 'rgb(255, 159, 64)' :
                                   'rgb(75, 192, 192)';
                        },
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Used %'
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Used: ${context.raw}%`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }
    
    loadInitialData() {
        this.showLoading();
        
        fetch('/api/dashboard/metrics')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.updateDashboard(data.data);
                    this.hideLoading();
                } else {
                    this.showError('Failed to load initial data');
                }
            })
            .catch(error => {
                console.error('Error loading initial data:', error);
                this.showError('Connection error. Please check your network.');
            });
    }
    
    updateDashboard(data) {
        this.lastUpdateTime = new Date(data.timestamp);
        document.getElementById('last-update').textContent = 
            this.lastUpdateTime.toLocaleTimeString();
        
        // Update performance metrics
        this.updatePerformanceMetrics(data.performance);
        
        // Update session metrics
        this.updateSessionMetrics(data.performance);
        
        // Update tablespace metrics
        this.updateTablespaceMetrics(data.tablespaces);
        
        // Update active sessions table
        this.updateActiveSessionsTable(data.activeSessions);
        
        // Update top SQL table
        this.updateTopSQLTable(data.topSQL);
        
        // Update health checks
        this.updateHealthChecks(data.healthChecks);
        
        // Update locks table
        this.updateLocksTable(data.locks);
        
        // Update alert log
        this.updateAlertLog(data.alerts);
    }
    
    updatePerformanceMetrics(performance) {
        if (!performance) return;
        
        // Update system metrics cards
        const systemStats = performance.systemStats || [];
        const sessionInfo = performance.sessionInfo || {};
        const waitStats = performance.waitStats || [];
        
        // Update cards
        const cards = {
            'total-sessions': sessionInfo.TOTAL_SESSIONS || 0,
            'active-sessions': sessionInfo.ACTIVE_SESSIONS || 0,
            'user-commits': systemStats.find(s => s.STAT_NAME === 'user commits')?.VALUE || 0,
            'physical-reads': systemStats.find(s => s.STAT_NAME === 'physical reads')?.VALUE || 0
        };
        
        Object.entries(cards).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value.toLocaleString();
            }
        });
        
        // Update performance chart
        if (this.charts.performance) {
            const timeLabel = this.lastUpdateTime.toLocaleTimeString();
            
            // Add new data point
            this.charts.performance.data.labels.push(timeLabel);
            
            // Simulate CPU usage (in real app, get from metrics)
            const cpuUsage = Math.random() * 100;
            const memoryUsage = 20 + Math.random() * 60;
            const ioWait = Math.random() * 30;
            
            this.charts.performance.data.datasets[0].data.push(cpuUsage);
            this.charts.performance.data.datasets[1].data.push(memoryUsage);
            this.charts.performance.data.datasets[2].data.push(ioWait);
            
            // Keep only last 20 points
            if (this.charts.performance.data.labels.length > 20) {
                this.charts.performance.data.labels.shift();
                this.charts.performance.data.datasets.forEach(dataset => {
                    dataset.data.shift();
                });
            }
            
            this.charts.performance.update();
        }
    }
    
    updateSessionMetrics(performance) {
        if (!performance || !this.charts.sessions) return;
        
        const sessionInfo = performance.sessionInfo || {};
        this.charts.sessions.data.datasets[0].data = [
            sessionInfo.ACTIVE_SESSIONS || 0,
            (sessionInfo.TOTAL_SESSIONS - sessionInfo.ACTIVE_SESSIONS - sessionInfo.BACKGROUND_SESSIONS) || 0,
            sessionInfo.BACKGROUND_SESSIONS || 0
        ];
        this.charts.sessions.update();
    }
    
    updateTablespaceMetrics(tablespaces) {
        if (!tablespaces) return;
        
        // Update tablespace chart
        if (this.charts.tablespaces) {
            const topTablespaces = tablespaces.slice(0, 10);
            this.charts.tablespaces.data.labels = topTablespaces.map(ts => ts.TABLESPACE_NAME);
            this.charts.tablespaces.data.datasets[0].data = topTablespaces.map(ts => ts.USED_PCT);
            this.charts.tablespaces.update();
        }
        
        // Update tablespace table
        this.updateTablespaceTable(tablespaces);
    }
    
    updateTablespaceTable(tablespaces) {
        const tbody = document.querySelector('#tablespaceTable tbody');
        if (!tbody) return;
        
        let html = '';
        tablespaces.slice(0, 10).forEach(ts => {
            const statusClass = ts.USED_PCT > 90 ? 'danger' :
                               ts.USED_PCT > 80 ? 'warning' : 'success';
            
            html += `
                <tr>
                    <td>${ts.TABLESPACE_NAME}</td>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="progress flex-grow-1" style="height: 20px;">
                                <div class="progress-bar bg-${statusClass}" 
                                     style="width: ${ts.USED_PCT}%">
                                    ${ts.USED_PCT.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    </td>
                    <td>${ts.USED_MB.toFixed(1)} MB</td>
                    <td>${ts.FREE_MB.toFixed(1)} MB</td>
                    <td>${ts.TOTAL_MB.toFixed(1)} MB</td>
                    <td>
                        <span class="badge bg-${statusClass}">
                            ${ts.STATUS}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-info" 
                                onclick="showTablespaceDetails('${ts.TABLESPACE_NAME}')">
                            <i class="bi bi-info-circle"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }
    
    updateActiveSessionsTable(sessions) {
        const tbody = document.querySelector('#sessionsTable tbody');
        const countElement = document.getElementById('active-sessions-count');
        if (!tbody || !countElement) return;
        
        const activeSessions = sessions.filter(s => s.STATUS === 'ACTIVE');
        countElement.textContent = activeSessions.length;
        
        let html = '';
        activeSessions.slice(0, 10).forEach(session => {
            const lastCallClass = session.LAST_CALL_SECONDS > 3600 ? 'danger' :
                                 session.LAST_CALL_SECONDS > 600 ? 'warning' : 'success';
            
            html += `
                <tr>
                    <td>
                        <strong>${session.SID}</strong>
                        <div class="small text-muted">${session.SERIAL}</div>
                    </td>
                    <td>${session.USERNAME || 'N/A'}</td>
                    <td>
                        <small class="d-block">${session.PROGRAM || 'N/A'}</small>
                        <small class="text-muted">${session.MACHINE || 'N/A'}</small>
                    </td>
                    <td>
                        <span class="badge bg-${session.STATUS === 'ACTIVE' ? 'danger' : 'secondary'}">
                            ${session.STATUS}
                        </span>
                    </td>
                    <td>${session.EVENT || 'N/A'}</td>
                    <td>
                        <span class="badge bg-${lastCallClass}">
                            ${session.LAST_CALL_SECONDS}s
                        </span>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-danger" 
                                    onclick="killSession(${session.SID}, ${session.SERIAL})">
                                <i class="bi bi-x-circle"></i>
                            </button>
                            <button class="btn btn-outline-info" 
                                    onclick="showSessionDetails(${session.SID}, ${session.SERIAL})">
                                <i class="bi bi-info-circle"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="7" class="text-center">No active sessions</td></tr>';
    }
    
    updateTopSQLTable(sqlList) {
        const tbody = document.querySelector('#topSqlTable tbody');
        if (!tbody) return;
        
        let html = '';
        sqlList.slice(0, 10).forEach(sql => {
            html += `
                <tr>
                    <td>
                        <code class="small">${sql.SQL_ID}</code>
                    </td>
                    <td>
                        <div class="sql-text" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${sql.SQL_TEXT || 'N/A'}
                        </div>
                    </td>
                    <td>${sql.EXECUTIONS.toLocaleString()}</td>
                    <td>${sql.ELAPSED_TIME_SECONDS.toFixed(2)}s</td>
                    <td>${sql.CPU_TIME_SECONDS.toFixed(2)}s</td>
                    <td>${sql.BUFFER_GETS.toLocaleString()}</td>
                    <td>${sql.DISK_READS.toLocaleString()}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-info" 
                                onclick="showSqlDetails('${sql.SQL_ID}')">
                            <i class="bi bi-search"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="8" class="text-center">No SQL data</td></tr>';
    }
    
    updateHealthChecks(healthChecks) {
        const container = document.getElementById('health-cards');
        if (!container) return;
        
        if (!healthChecks || healthChecks.length === 0) {
            container.innerHTML = '<div class="col-12"><div class="alert alert-info">No health checks available</div></div>';
            return;
        }
        
        let html = '';
        healthChecks.forEach(check => {
            const statusClass = check.status === 'HEALTHY' ? 'success' :
                               check.status === 'WARNING' ? 'warning' : 'danger';
            
            const iconName = check.status === 'HEALTHY' ? 'check-circle' : 
                            check.status === 'WARNING' ? 'exclamation-triangle' : 
                            'x-circle';
            
            html += `
                <div class="col-xl-3 col-lg-4 col-md-6 mb-3">
                    <div class="card border-${statusClass} h-100">
                        <div class="card-body">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="card-title mb-0">${check.check}</h6>
                                <span class="badge bg-${statusClass}">${check.status}</span>
                            </div>
                            <div class="d-flex align-items-center">
                                <div class="flex-grow-1">
                                    <h3 class="mb-0">${check.value}</h3>
                                    <small class="text-muted">Threshold: ${check.threshold}</small>
                                </div>
                                <div class="ms-2">
                                    <i class="bi bi-${iconName} fs-4 text-${statusClass}"></i>
                                </div>
                            </div>
                            ${check.details ? `<div class="mt-2"><small class="text-muted">${check.details}</small></div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }
    
    updateLocksTable(locks) {
        const tbody = document.querySelector('#locksTable tbody');
        if (!tbody) return;
        
        let html = '';
        locks.forEach(lock => {
            const lockClass = lock.LOCK_MODE === 'Exclusive (X)' ? 'danger' :
                             lock.LOCK_MODE.includes('Exclusive') ? 'warning' : 'info';
            
            html += `
                <tr>
                    <td>${lock.SID}</td>
                    <td>${lock.USERNAME || 'N/A'}</td>
                    <td>${lock.OBJECT_OWNER}.${lock.OBJECT_NAME}</td>
                    <td>${lock.OBJECT_TYPE}</td>
                    <td>
                        <span class="badge bg-${lockClass}">
                            ${lock.LOCK_MODE_DESC}
                        </span>
                    </td>
                    <td>${lock.OS_USER_NAME || 'N/A'}</td>
                    <td>${lock.PROGRAM || 'N/A'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="unlockObject(${lock.SID}, '${lock.OBJECT_NAME}')">
                            <i class="bi bi-unlock"></i>
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html || '<tr><td colspan="8" class="text-center">No locks found</td></tr>';
    }
    
    updateAlertLog(alerts) {
        const container = document.getElementById('alert-log');
        if (!container) return;
        
        let html = '';
        alerts.slice(0, 5).forEach(alert => {
            const levelClass = alert.MESSAGE_LEVEL >= 16 ? 'danger' :
                              alert.MESSAGE_LEVEL >= 8 ? 'warning' : 'info';
            
            html += `
                <div class="alert alert-${levelClass} alert-dismissible fade show mb-2 p-2" role="alert">
                    <small>
                        <strong>[${alert.MESSAGE_TIME}]</strong> 
                        ${alert.MESSAGE_TEXT.substring(0, 150)}...
                    </small>
                    <button type="button" class="btn-close btn-sm" data-bs-dismiss="alert"></button>
                </div>
            `;
        });
        
        container.innerHTML = html || '<div class="text-muted">No recent alerts</div>';
    }
    
    requestImmediateUpdate() {
        this.showLoading();
        this.socket.emit('requestUpdate');
    }
    
    startAutoRefresh() {
        this.autoRefreshInterval = setInterval(() => {
            if (this.autoRefresh && this.refreshInterval > 0) {
                this.requestImmediateUpdate();
            }
        }, this.refreshInterval);
    }
    
    updateRefreshSettings() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        if (this.autoRefresh && this.refreshInterval > 0) {
            this.startAutoRefresh();
        }
        
        // Save settings to localStorage
        localStorage.setItem('dashboardSettings', JSON.stringify({
            refreshInterval: this.refreshInterval,
            autoRefresh: this.autoRefresh
        }));
    }
    
    showLoading() {
        const spinner = document.createElement('div');
        spinner.className = 'spinner-border spinner-border-sm text-primary';
        spinner.role = 'status';
        
        const refreshBtn = document.querySelector('.refresh-controls .btn');
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Refreshing';
        }
    }
    
    hideLoading() {
        const refreshBtn = document.querySelector('.refresh-controls .btn');
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Refresh Now';
        }
    }
    
    showError(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-danger alert-dismissible fade show';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.getElementById('alerts-container');
        if (container) {
            container.prepend(alertDiv);
            
            // Auto remove after 5 seconds
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }
    
    // Socket event handlers
    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to WebSocket server');
            document.getElementById('connection-status').className = 'badge bg-success';
            document.getElementById('connection-status').textContent = 'Connected';
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket server');
            document.getElementById('connection-status').className = 'badge bg-danger';
            document.getElementById('connection-status').textContent = 'Disconnected';
        });
        
        this.socket.on('metricsUpdate', (data) => {
            this.updateDashboard(data);
            this.hideLoading();
        });
        
        this.socket.on('error', (error) => {
            this.showError(error.message || 'An error occurred');
            this.hideLoading();
        });
    }
}

// Global functions for HTML onclick handlers
function showTablespaceDetails(tablespaceName) {
    fetch(`/api/dashboard/tablespace/${encodeURIComponent(tablespaceName)}/details`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const modal = new bootstrap.Modal(document.getElementById('tablespaceDetailsModal'));
                document.getElementById('tablespaceDetailsContent').innerHTML = `
                    <h5>${data.data.TABLESPACE_NAME}</h5>
                    <table class="table table-sm">
                        ${Object.entries(data.data).map(([key, value]) => `
                            <tr>
                                <th>${key.replace(/_/g, ' ')}:</th>
                                <td>${value}</td>
                            </tr>
                        `).join('')}
                    </table>
                `;
                modal.show();
            }
        });
}

function showSessionDetails(sid, serial) {
    fetch(`/api/dashboard/session/${sid}/${serial}/details`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const modal = new bootstrap.Modal(document.getElementById('sessionDetailsModal'));
                document.getElementById('sessionDetailsContent').innerHTML = `
                    <h5>Session ${sid},${serial}</h5>
                    <table class="table table-sm">
                        ${Object.entries(data.data).map(([key, value]) => `
                            <tr>
                                <th>${key}:</th>
                                <td>${value || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </table>
                `;
                modal.show();
            }
        });
}

function killSession(sid, serial) {
    if (!confirm(`Are you sure you want to kill session ${sid},${serial}?`)) {
        return;
    }
    
    fetch('/api/dba/kill-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sid: sid, serial: serial })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Session killed successfully');
            dashboard.requestImmediateUpdate();
        } else {
            alert(`Error: ${data.message}`);
        }
    });
}

function showSqlDetails(sqlId) {
    fetch(`/api/dashboard/sql/${sqlId}/details`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const modal = new bootstrap.Modal(document.getElementById('sqlDetailsModal'));
                document.getElementById('sqlDetailsContent').innerHTML = `
                    <h5>SQL ID: ${sqlId}</h5>
                    <pre class="bg-light p-3"><code>${data.data.SQL_FULLTEXT || data.data.SQL_TEXT}</code></pre>
                    <table class="table table-sm">
                        ${Object.entries(data.data).filter(([key]) => key !== 'SQL_FULLTEXT' && key !== 'SQL_TEXT').map(([key, value]) => `
                            <tr>
                                <th>${key}:</th>
                                <td>${value}</td>
                            </tr>
                        `).join('')}
                    </table>
                `;
                modal.show();
            }
        });
}

function unlockObject(sid, objectName) {
    if (!confirm(`Unlock ${objectName} held by session ${sid}?`)) {
        return;
    }
    
    fetch('/api/dba/unlock-object', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sid: sid, objectName: objectName })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Object unlocked successfully');
            dashboard.requestImmediateUpdate();
        } else {
            alert(`Error: ${data.message}`);
        }
    });
}

// Initialize dashboard when DOM is loaded
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new DashboardManager();
    dashboard.setupSocketEvents();
});