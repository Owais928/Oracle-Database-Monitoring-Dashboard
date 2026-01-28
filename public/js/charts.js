// Global chart manager instance - only create if not already defined
if (typeof ChartManager === 'undefined') {
    class ChartManager {
        constructor() {
            this.charts = {};
            this.colorPalette = {
                primary: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#d35400'],
                sequential: ['#e8f4f8', '#d4e9f1', '#a7d3e8', '#7bbdde', '#4fa7d5', '#3498db', '#2c81ba']
            };
        }
    
    createPerformanceChart(canvasId, data) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return null;
        
        this.charts.performance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [
                    {
                        label: 'CPU Usage',
                        data: data.cpu || [],
                        borderColor: this.colorPalette.primary[0],
                        backgroundColor: this.hexToRgba(this.colorPalette.primary[0], 0.1),
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2
                    },
                    {
                        label: 'Memory Usage',
                        data: data.memory || [],
                        borderColor: this.colorPalette.primary[1],
                        backgroundColor: this.hexToRgba(this.colorPalette.primary[1], 0.1),
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2
                    },
                    {
                        label: 'I/O Throughput',
                        data: data.io || [],
                        borderColor: this.colorPalette.primary[2],
                        backgroundColor: this.hexToRgba(this.colorPalette.primary[2], 0.1),
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2
                    }
                ]
            },
            options: this.getPerformanceChartOptions()
        });
        
        return this.charts.performance;
    }
    
    createSessionChart(canvasId, data) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return null;
        
        this.charts.sessions = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.labels || ['Active', 'Inactive', 'Background'],
                datasets: [{
                    data: data.values || [0, 0, 0],
                    backgroundColor: [
                        this.colorPalette.primary[0],
                        this.colorPalette.primary[1],
                        this.colorPalette.primary[2]
                    ],
                    borderWidth: 2,
                    borderColor: '#fff',
                    hoverOffset: 15
                }]
            },
            options: this.getSessionChartOptions()
        });
        
        return this.charts.sessions;
    }
    
    createTablespaceChart(canvasId, data) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return null;
        
        const backgroundColors = data.values?.map(value => {
            if (value > 90) return this.colorPalette.primary[2]; // Red for critical
            if (value > 80) return this.colorPalette.primary[3]; // Orange for warning
            return this.colorPalette.primary[1]; // Green for normal
        }) || [];
        
        this.charts.tablespaces = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Used Space (%)',
                    data: data.values || [],
                    backgroundColor: backgroundColors,
                    borderColor: backgroundColors.map(color => this.darkenColor(color, 20)),
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: this.getTablespaceChartOptions()
        });
        
        return this.charts.tablespaces;
    }
    
    createWaitEventsChart(canvasId, data) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return null;
        
        this.charts.waitEvents = new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: data.labels || [],
                datasets: [{
                    label: 'Time Waited (seconds)',
                    data: data.values || [],
                    backgroundColor: this.colorPalette.sequential,
                    borderColor: '#2c3e50',
                    borderWidth: 1
                }]
            },
            options: this.getWaitEventsChartOptions()
        });
        
        return this.charts.waitEvents;
    }
    
    createThroughputChart(canvasId, data) {
        const ctx = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return null;
        
        this.charts.throughput = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels || [],
                datasets: [
                    {
                        label: 'Transactions/sec',
                        data: data.transactions || [],
                        borderColor: this.colorPalette.primary[0],
                        backgroundColor: this.hexToRgba(this.colorPalette.primary[0], 0.1),
                        tension: 0.3,
                        fill: true,
                        borderWidth: 2
                    },
                    {
                        label: 'Redo Generated/sec',
                        data: data.redo || [],
                        borderColor: this.colorPalette.primary[1],
                        backgroundColor: this.hexToRgba(this.colorPalette.primary[1], 0.1),
                        tension: 0.3,
                        fill: true,
                        borderWidth: 2
                    },
                    {
                        label: 'Logical Reads/sec',
                        data: data.reads || [],
                        borderColor: this.colorPalette.primary[2],
                        backgroundColor: this.hexToRgba(this.colorPalette.primary[2], 0.1),
                        tension: 0.3,
                        fill: true,
                        borderWidth: 2
                    }
                ]
            },
            options: this.getThroughputChartOptions()
        });
        
        return this.charts.throughput;
    }
    
    // Chart options configurations
    getPerformanceChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: {
                            size: 11
                        },
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleFont: {
                        size: 12
                    },
                    bodyFont: {
                        size: 11
                    },
                    padding: 10
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 0,
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        font: {
                            size: 10
                        }
                    },
                    title: {
                        display: true,
                        text: 'Percentage (%)',
                        font: {
                            size: 11
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'nearest'
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        };
    }
    
    getSessionChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 11
                        },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        };
    }
    
    getTablespaceChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
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
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    title: {
                        display: true,
                        text: 'Used Percentage'
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        };
    }
    
    getWaitEventsChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Time Waited (seconds)'
                    }
                },
                y: {
                    ticks: {
                        font: {
                            size: 10
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        };
    }
    
    getThroughputChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Operations per Second'
                    }
                }
            }
        };
    }
    
    // Utility functions
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        
        return "#" + (
            0x1000000 +
            (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)
        ).toString(16).slice(1);
    }
    
    // Update chart data
    updateChart(chartName, newData) {
        const chart = this.charts[chartName];
        if (!chart) return;
        
        if (newData.labels) {
            chart.data.labels = newData.labels;
        }
        
        if (newData.datasets) {
            chart.data.datasets = newData.datasets;
        } else if (newData.values) {
            chart.data.datasets.forEach((dataset, index) => {
                if (newData.values[index]) {
                    dataset.data = newData.values[index];
                }
            });
        }
        
        chart.update();
    }
    
    // Add data point to time series chart
    addDataPoint(chartName, label, dataPoints) {
        const chart = this.charts[chartName];
        if (!chart) return;
        
        chart.data.labels.push(label);
        
        chart.data.datasets.forEach((dataset, index) => {
            if (dataPoints[index] !== undefined) {
                dataset.data.push(dataPoints[index]);
                
                // Keep only last 30 data points
                if (dataset.data.length > 30) {
                    dataset.data.shift();
                }
            }
        });
        
        // Keep labels in sync
        if (chart.data.labels.length > 30) {
            chart.data.labels.shift();
        }
        
        chart.update();
    }
    
    // Destroy all charts
    destroyAll() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
    }
    
    // Export chart as image
    exportChart(chartName, format = 'png') {
        const chart = this.charts[chartName];
        if (!chart) return null;
        
        return chart.toBase64Image(`image/${format}`);
    }
}

// Global chart manager instance - only create if not already created
if (typeof chartManager === 'undefined') {
    window.chartManager = new ChartManager();
}
}