// public/js/dba.js
class DBAManager {
    constructor() {
        this.selectedSessions = new Set();
        this.queryHistory = JSON.parse(localStorage.getItem('dba_query_history') || '[]');
        this.favoriteQueries = JSON.parse(localStorage.getItem('dba_favorite_queries') || '[]');
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadQueryHistory();
        this.loadFavoriteQueries();
        this.loadDatabaseInfo();
    }
    
    bindEvents() {
        // Session management
        document.getElementById('killSessionBtn')?.addEventListener('click', () => this.killSelectedSessions());
        document.getElementById('disconnectSessionBtn')?.addEventListener('click', () => this.disconnectSelectedSessions());
        document.getElementById('refreshSessionsBtn')?.addEventListener('click', () => this.loadSessions());
        
        // SQL Executor
        document.getElementById('executeSqlBtn')?.addEventListener('click', () => this.executeSQL());
        document.getElementById('explainPlanBtn')?.addEventListener('click', () => this.explainPlan());
        document.getElementById('exportResultsBtn')?.addEventListener('click', () => this.exportResults());
        document.getElementById('clearSqlBtn')?.addEventListener('click', () => this.clearSQL());
        document.getElementById('saveQueryBtn')?.addEventListener('click', () => this.saveQuery());
        
        // Tablespace operations
        document.getElementById('addDatafileBtn')?.addEventListener('click', () => this.showAddDatafileModal());
        document.getElementById('resizeTablespaceBtn')?.addEventListener('click', () => this.showResizeTablespaceModal());
        
        // Database operations
        document.getElementById('flushBufferBtn')?.addEventListener('click', () => this.flushBufferCache());
        document.getElementById('flushSharedPoolBtn')?.addEventListener('click', () => this.flushSharedPool());
        document.getElementById('switchLogfileBtn')?.addEventListener('click', () => this.switchLogfile());
        document.getElementById('checkpointBtn')?.addEventListener('click', () => this.forceCheckpoint());
        document.getElementById('backupBtn')?.addEventListener('click', () => this.showBackupModal());
        
        // Parameter search
        document.getElementById('paramSearch')?.addEventListener('input', (e) => this.searchParameters(e.target.value));
    }
    
    // Session Management
    async loadSessions() {
        try {
            const response = await fetch('/api/dashboard/metrics/sessions');
            const data = await response.json();
            
            if (data.success) {
                this.displaySessions(data.data);
            }
        } catch (error) {
            this.showError('Failed to load sessions');
        }
    }
    
    displaySessions(sessions) {
        const container = document.getElementById('sessionsList');
        if (!container) return;
        
        let html = '';
        sessions.forEach(session => {
            const isSelected = this.selectedSessions.has(`${session.SID},${session.SERIAL}`);
            const statusClass = session.STATUS === 'ACTIVE' ? 'danger' : 'secondary';
            const lastCallClass = session.LAST_CALL_SECONDS > 3600 ? 'danger' : 
                                 session.LAST_CALL_SECONDS > 600 ? 'warning' : 'success';
            
            html += `
                <div class="card mb-2">
                    <div class="card-body p-2">
                        <div class="form-check d-flex align-items-center">
                            <input class="form-check-input me-2 session-checkbox" 
                                   type="checkbox" 
                                   value="${session.SID},${session.SERIAL}"
                                   ${isSelected ? 'checked' : ''}
                                   onchange="dbaManager.toggleSessionSelection(this)">
                            <div style="flex-grow: 1;">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <div>
                                        <strong>SID: ${session.SID}</strong> 
                                        <span class="badge bg-${statusClass} ms-2">${session.STATUS}</span>
                                        <span class="badge bg-${lastCallClass} ms-1">
                                            ${session.LAST_CALL_SECONDS}s
                                        </span>
                                    </div>
                                    <div class="text-end">
                                        <small class="text-muted">${session.USERNAME || 'N/A'}</small>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <small class="text-muted">
                                            <i class="bi bi-pc-display"></i> ${session.MACHINE || 'N/A'}
                                        </small>
                                    </div>
                                    <div class="col-md-6">
                                        <small class="text-muted">
                                            <i class="bi bi-terminal"></i> ${session.PROGRAM || 'N/A'}
                                        </small>
                                    </div>
                                </div>
                                <div class="mt-1">
                                    <small class="text-muted">
                                        <i class="bi bi-clock"></i> Event: ${session.EVENT || 'N/A'}
                                    </small>
                                </div>
                            </div>
                            <div class="ms-2">
                                <button class="btn btn-sm btn-outline-info" 
                                        onclick="dbaManager.showSessionDetails(${session.SID}, ${session.SERIAL})">
                                    <i class="bi bi-info-circle"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<p class="text-muted">No sessions found</p>';
        this.updateSessionActions();
    }
    
    toggleSessionSelection(checkbox) {
        const sessionId = checkbox.value;
        
        if (checkbox.checked) {
            this.selectedSessions.add(sessionId);
        } else {
            this.selectedSessions.delete(sessionId);
        }
        
        this.updateSessionActions();
    }
    
    updateSessionActions() {
        const hasSelection = this.selectedSessions.size > 0;
        const killBtn = document.getElementById('killSessionBtn');
        const disconnectBtn = document.getElementById('disconnectSessionBtn');
        
        if (killBtn) killBtn.disabled = !hasSelection;
        if (disconnectBtn) disconnectBtn.disabled = !hasSelection;
    }
    
    async killSelectedSessions() {
        if (this.selectedSessions.size === 0) {
            this.showWarning('Please select at least one session');
            return;
        }
        
        if (!confirm(`Kill ${this.selectedSessions.size} selected session(s)?`)) {
            return;
        }
        
        const results = [];
        for (const sessionId of this.selectedSessions) {
            const [sid, serial] = sessionId.split(',');
            try {
                const response = await fetch('/api/dba/kill-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ sid: parseInt(sid), serial: parseInt(serial) })
                });
                const data = await response.json();
                results.push({ sid, serial, success: data.success, message: data.message });
            } catch (error) {
                results.push({ sid, serial, success: false, message: 'Network error' });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        this.showResult(
            `Killed ${successCount} of ${this.selectedSessions.size} session(s)`,
            successCount === this.selectedSessions.size ? 'success' : 'warning'
        );
        
        this.selectedSessions.clear();
        this.loadSessions();
    }
    
    async disconnectSelectedSessions() {
        if (this.selectedSessions.size === 0) {
            this.showWarning('Please select at least one session');
            return;
        }
        
        if (!confirm(`Disconnect ${this.selectedSessions.size} selected session(s)?`)) {
            return;
        }
        
        // Similar to kill but with disconnect command
        this.showInfo('Disconnect functionality to be implemented');
    }
    
    async showSessionDetails(sid, serial) {
        try {
            const response = await fetch(`/api/dashboard/session/${sid}/${serial}/details`);
            const data = await response.json();
            
            if (data.success) {
                this.showModal('Session Details', this.formatSessionDetails(data.data));
            }
        } catch (error) {
            this.showError('Failed to load session details');
        }
    }
    
    formatSessionDetails(session) {
        let html = '<table class="table table-sm table-striped">';
        for (const [key, value] of Object.entries(session)) {
            html += `
                <tr>
                    <th style="width: 30%;">${this.formatKey(key)}:</th>
                    <td>${value || '<em>N/A</em>'}</td>
                </tr>
            `;
        }
        html += '</table>';
        
        html += `
            <div class="mt-3">
                <button class="btn btn-danger" onclick="dbaManager.killSession(${session.SID}, ${session.SERIAL})">
                    <i class="bi bi-x-circle"></i> Kill Session
                </button>
                <button class="btn btn-warning ms-2" onclick="dbaManager.traceSession(${session.SID})">
                    <i class="bi bi-binoculars"></i> Start Trace
                </button>
            </div>
        `;
        
        return html;
    }
    
    // SQL Executor
    async executeSQL() {
        const sql = document.getElementById('sqlEditor')?.value.trim();
        if (!sql) {
            this.showWarning('Please enter a SQL query');
            return;
        }
        
        try {
            const response = await fetch('/api/dba/execute-sql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sql: sql })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayResults(data);
                this.addToHistory(sql);
                this.showSuccess('Query executed successfully');
            } else {
                this.showError(`Execution failed: ${data.message}`);
            }
        } catch (error) {
            this.showError('Network error. Please check connection.');
        }
    }
    
    displayResults(data) {
        const container = document.getElementById('resultsContainer');
        if (!container) return;
        
        let html = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle"></i> 
                ${data.rowCount} rows returned in ${data.executionTime || 0} seconds
            </div>
        `;
        
        if (data.data && data.data.length > 0) {
            const headers = Object.keys(data.data[0]);
            
            html += `
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                ${headers.map(h => `<th>${h}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            data.data.forEach(row => {
                html += '<tr>';
                headers.forEach(header => {
                    const value = row[header];
                    html += `<td>${value !== null && value !== undefined ? 
                        this.escapeHtml(String(value)) : '<em>NULL</em>'}</td>`;
                });
                html += '</tr>';
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            html += '<p class="text-muted">No data returned</p>';
        }
        
        container.innerHTML = html;
        this.showResultsModal();
    }
    
    async explainPlan() {
        const sql = document.getElementById('sqlEditor')?.value.trim();
        if (!sql) {
            this.showWarning('Please enter a SQL query');
            return;
        }
        
        try {
            const response = await fetch('/api/dba/explain-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sql: sql })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayExplainPlan(data.data);
                this.showSuccess('Explain plan generated');
            } else {
                this.showError(`Failed to generate explain plan: ${data.message}`);
            }
        } catch (error) {
            this.showError('Network error');
        }
    }
    
    displayExplainPlan(plan) {
        const container = document.getElementById('resultsContainer');
        if (!container) return;
        
        let html = '<div class="alert alert-info">Explain Plan</div>';
        
        if (plan && plan.length > 0) {
            html += `
                <div class="table-responsive">
                    <table class="table table-sm table-striped">
                        <thead>
                            <tr>
                                <th>Operation</th>
                                <th>Cost</th>
                                <th>Cardinality</th>
                                <th>Bytes</th>
                                <th>CPU Cost</th>
                                <th>IO Cost</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            plan.forEach(row => {
                html += `
                    <tr>
                        <td><code>${row.OPERATION}</code></td>
                        <td>${row.COST || ''}</td>
                        <td>${row.CARDINALITY || ''}</td>
                        <td>${row.BYTES || ''}</td>
                        <td>${row.CPU_COST || ''}</td>
                        <td>${row.IO_COST || ''}</td>
                        <td>${row.TIME || ''}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            html += '<p class="text-muted">No explain plan available</p>';
        }
        
        container.innerHTML = html;
        this.showResultsModal();
    }
    
    async exportResults() {
        const sql = document.getElementById('sqlEditor')?.value.trim();
        if (!sql) {
            this.showWarning('Please enter a SQL query');
            return;
        }
        
        try {
            const response = await fetch('/api/dba/export-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    sql: sql, 
                    format: 'csv' 
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.downloadFile(data.data, data.filename || 'export.csv', 'text/csv');
                this.showSuccess('Export completed');
            } else {
                this.showError(`Export failed: ${data.message}`);
            }
        } catch (error) {
            this.showError('Network error');
        }
    }
    
    // Query History Management
    loadQueryHistory() {
        const container = document.getElementById('queryHistory');
        if (!container) return;
        
        let html = '';
        this.queryHistory.slice(0, 20).forEach((query, index) => {
            const timestamp = new Date(query.timestamp).toLocaleTimeString();
            html += `
                <div class="card mb-2">
                    <div class="card-body p-2">
                        <div class="d-flex justify-content-between align-items-start">
                            <div style="flex-grow: 1; overflow: hidden;">
                                <code class="small" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                    ${this.escapeHtml(query.sql.substring(0, 100))}${query.sql.length > 100 ? '...' : ''}
                                </code>
                                <div class="small text-muted mt-1">${timestamp}</div>
                            </div>
                            <div class="ms-2">
                                <button class="btn btn-sm btn-outline-primary" onclick="dbaManager.loadQueryFromHistory(${index})">
                                    <i class="bi bi-arrow-clockwise"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<p class="text-muted">No query history</p>';
    }
    
    addToHistory(sql) {
        const existingIndex = this.queryHistory.findIndex(q => q.sql === sql);
        
        if (existingIndex !== -1) {
            this.queryHistory.splice(existingIndex, 1);
        }
        
        this.queryHistory.unshift({
            sql: sql,
            timestamp: new Date().toISOString()
        });
        
        if (this.queryHistory.length > 100) {
            this.queryHistory = this.queryHistory.slice(0, 100);
        }
        
        localStorage.setItem('dba_query_history', JSON.stringify(this.queryHistory));
        this.loadQueryHistory();
    }
    
    loadQueryFromHistory(index) {
        if (this.queryHistory[index]) {
            document.getElementById('sqlEditor').value = this.queryHistory[index].sql;
        }
    }
    
    // Database Operations
    async flushBufferCache() {
        if (!confirm('Flush buffer cache? This may impact performance.')) return;
        
        await this.executeDBAOperation(
            'ALTER SYSTEM FLUSH BUFFER_CACHE',
            'Buffer cache flushed successfully'
        );
    }
    
    async flushSharedPool() {
        if (!confirm('Flush shared pool? This may impact performance.')) return;
        
        await this.executeDBAOperation(
            'ALTER SYSTEM FLUSH SHARED_POOL',
            'Shared pool flushed successfully'
        );
    }
    
    async switchLogfile() {
        await this.executeDBAOperation(
            'ALTER SYSTEM SWITCH LOGFILE',
            'Logfile switched successfully'
        );
    }
    
    async forceCheckpoint() {
        await this.executeDBAOperation(
            'ALTER SYSTEM CHECKPOINT',
            'Checkpoint completed successfully'
        );
    }
    
    async executeDBAOperation(sql, successMessage) {
        try {
            const response = await fetch('/api/dba/execute-sql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ sql: sql })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showSuccess(successMessage);
            } else {
                this.showError(`Operation failed: ${data.message}`);
            }
        } catch (error) {
            this.showError('Network error');
        }
    }
    
    // Utility Functions
    showModal(title, content) {
        const modal = document.getElementById('dbaModal');
        if (!modal) return;
        
        document.getElementById('dbaModalTitle').textContent = title;
        document.getElementById('dbaModalBody').innerHTML = content;
        
        new bootstrap.Modal(modal).show();
    }
    
    showResultsModal() {
        new bootstrap.Modal(document.getElementById('resultsModal')).show();
    }
    
    showSuccess(message) {
        this.showAlert(message, 'success');
    }
    
    showWarning(message) {
        this.showAlert(message, 'warning');
    }
    
    showError(message) {
        this.showAlert(message, 'danger');
    }
    
    showInfo(message) {
        this.showAlert(message, 'info');
    }
    
    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.getElementById('alerts-container');
        if (container) {
            container.prepend(alertDiv);
            
            setTimeout(() => {
                if (alertDiv.parentNode) {
                    alertDiv.remove();
                }
            }, 5000);
        }
    }
    
    showResult(message, type) {
        const resultDiv = document.createElement('div');
        resultDiv.className = `alert alert-${type}`;
        resultDiv.innerHTML = `
            <h5><i class="bi bi-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> Result</h5>
            <p>${message}</p>
        `;
        
        const container = document.getElementById('resultsContainer');
        if (container) {
            container.innerHTML = '';
            container.appendChild(resultDiv);
            this.showResultsModal();
        }
    }
    
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatKey(key) {
        return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    loadDatabaseInfo() {
        // Load database information on page load
        fetch('/api/dashboard/metrics')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.performance && data.performance.instanceInfo) {
                    this.displayDatabaseInfo(data.performance.instanceInfo);
                }
            });
    }
    
    displayDatabaseInfo(info) {
        const container = document.getElementById('databaseInfo');
        if (!container) return;
        
        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h6><i class="bi bi-database"></i> Database Information</h6>
                    <table class="table table-sm">
                        <tr><th>Instance:</th><td>${info.INSTANCE_NAME}</td></tr>
                        <tr><th>Host:</th><td>${info.HOST_NAME}</td></tr>
                        <tr><th>Version:</th><td>${info.VERSION}</td></tr>
                        <tr><th>Status:</th><td><span class="badge bg-success">${info.STATUS}</span></td></tr>
                        <tr><th>Startup Time:</th><td>${info.STARTUP_TIME}</td></tr>
                    </table>
                </div>
            </div>
        `;
    }
    
    // Stubbed methods for future implementation
    showAddDatafileModal() {
        this.showInfo('Add datafile functionality to be implemented');
    }
    
    showResizeTablespaceModal() {
        this.showInfo('Resize tablespace functionality to be implemented');
    }
    
    showBackupModal() {
        this.showInfo('Backup operations to be implemented');
    }
    
    traceSession(sid) {
        this.showInfo(`Trace session ${sid} functionality to be implemented`);
    }
    
    saveQuery() {
        const sql = document.getElementById('sqlEditor')?.value.trim();
        if (!sql) {
            this.showWarning('Please enter a SQL query to save');
            return;
        }
        
        const name = prompt('Enter a name for this query:');
        if (name) {
            this.favoriteQueries.push({ name, sql });
            localStorage.setItem('dba_favorite_queries', JSON.stringify(this.favoriteQueries));
            this.loadFavoriteQueries();
            this.showSuccess('Query saved to favorites');
        }
    }
    
    loadFavoriteQueries() {
        const container = document.getElementById('favoriteQueries');
        if (!container) return;
        
        let html = '';
        this.favoriteQueries.forEach((query, index) => {
            html += `
                <div class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                        <strong>${query.name}</strong>
                        <div class="small text-muted" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                            ${query.sql.substring(0, 50)}${query.sql.length > 50 ? '...' : ''}
                        </div>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-primary" onclick="dbaManager.loadFavoriteQuery(${index})">
                            <i class="bi bi-arrow-clockwise"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="dbaManager.removeFavoriteQuery(${index})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<div class="list-group-item text-muted">No favorite queries</div>';
    }
    
    loadFavoriteQuery(index) {
        if (this.favoriteQueries[index]) {
            document.getElementById('sqlEditor').value = this.favoriteQueries[index].sql;
        }
    }
    
    removeFavoriteQuery(index) {
        if (confirm('Remove this query from favorites?')) {
            this.favoriteQueries.splice(index, 1);
            localStorage.setItem('dba_favorite_queries', JSON.stringify(this.favoriteQueries));
            this.loadFavoriteQueries();
            this.showSuccess('Query removed from favorites');
        }
    }
    
    searchParameters(searchTerm) {
        const cards = document.querySelectorAll('#parametersList .card');
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
        });
    }
    
    clearSQL() {
        document.getElementById('sqlEditor').value = '';
    }
}

// Global DBA manager instance
const dbaManager = new DBAManager();