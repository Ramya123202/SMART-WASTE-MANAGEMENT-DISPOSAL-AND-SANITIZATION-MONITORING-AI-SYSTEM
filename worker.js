// Worker Panel JavaScript
let currentReportId = null;
let currentPage = 1;
let totalPages = 1;
let workerMap = null;
let assignedReports = [];

// Initialize worker panel
document.addEventListener('DOMContentLoaded', function() {
    initializeWorkerPanel();
});

function initializeWorkerPanel() {
    // Check if user is worker
    checkWorkerAuth();
    
    // Setup event listeners
    setupWorkerEventListeners();
    
    // Load dashboard data
    loadDashboardData();
    
    // Auto-refresh assigned reports every 30 seconds
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadAssignedReports(currentPage);
            loadDashboardData();
            if (workerMap) {
                loadWorkerMap();
            }
        }
    }, 30000);
    
    // Refresh when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            loadAssignedReports(currentPage);
            loadDashboardData();
            if (workerMap) {
                loadWorkerMap();
            }
        }
    });
}

function setupWorkerEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('data-section');
            if (section) {
                showWorkerSection(section);
            }
        });
    });
    
    // Logout
    document.getElementById('logout-link').addEventListener('click', handleLogout);
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModal();
        }
    });
}

async function checkWorkerAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    try {
        const response = await fetch('/api/auth/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const user = await response.json();
            if (user.role !== 'worker') {
                window.location.href = '/';
                return;
            }
            document.getElementById('worker-name').textContent = user.firstName;
        } else {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Worker auth check failed:', error);
        window.location.href = '/';
    }
}

function showWorkerSection(section) {
    // Hide all sections
    document.querySelectorAll('[id$="-section"]').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${section}-section`).style.display = 'block';
    
    // Add active class to clicked link
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    // Load section data
    switch(section) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'assigned':
            loadAssignedReports();
            break;
        case 'map':
            loadWorkerMap();
            break;
    }
}

async function loadDashboardData() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/worker/dashboard', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayDashboardStats(data);
            displayRecentReports(data.recentReports);
        } else {
            showNotification('Failed to load dashboard data', 'error');
        }
    } catch (error) {
        console.error('Load dashboard error:', error);
        showNotification('Failed to load dashboard data', 'error');
    } finally {
        showLoading(false);
    }
}

function displayDashboardStats(data) {
    const statsGrid = document.getElementById('stats-grid');
    
    statsGrid.innerHTML = `
        <div class="stat-card">
            <h3>${data.totalAssigned || 0}</h3>
            <p>Total Assigned</p>
        </div>
        <div class="stat-card">
            <h3>${data.pending || 0}</h3>
            <p>Pending</p>
        </div>
        <div class="stat-card">
            <h3>${data.inProgress || 0}</h3>
            <p>In Progress</p>
        </div>
        <div class="stat-card">
            <h3>${data.resolved || 0}</h3>
            <p>Resolved</p>
        </div>
    `;
}

function displayRecentReports(reports) {
    const container = document.getElementById('recent-reports');
    
    if (!reports || reports.length === 0) {
        container.innerHTML = '<p>No recent reports assigned</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="worker-table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Date</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${reports.map(report => `
                    <tr>
                        <td>${report.title}</td>
                        <td>${formatCategory(report.category)}</td>
                        <td><span class="status-badge status-${report.status}">${formatStatus(report.status)}</span></td>
                        <td>${report.location.address}</td>
                        <td>${formatDate(report.createdAt)}</td>
                        <td>
                            <button class="btn btn-primary btn-sm" onclick="viewReportDetails('${report._id}')">View</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function loadAssignedReports(page = 1) {
    try {
        showLoading(true);
        
        const status = document.getElementById('status-filter-worker').value;
        
        let url = `/api/worker/assigned-reports?page=${page}&limit=20`;
        if (status) url += `&status=${status}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            assignedReports = data.reports;
            displayAssignedReports(data.reports);
            currentPage = data.currentPage;
            totalPages = data.totalPages;
            displayAssignedPagination();
        } else {
            showNotification('Failed to load assigned reports', 'error');
        }
    } catch (error) {
        console.error('Load assigned reports error:', error);
        showNotification('Failed to load assigned reports', 'error');
    } finally {
        showLoading(false);
    }
}

function displayAssignedReports(reports) {
    const tbody = document.getElementById('assigned-reports-table');
    
    if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No reports assigned</td></tr>';
        return;
    }
    
    tbody.innerHTML = reports.map(report => `
        <tr>
            <td>${report.title}</td>
            <td>${formatCategory(report.category)}</td>
            <td><span class="status-badge status-${report.status}">${formatStatus(report.status)}</span></td>
            <td>${formatPriority(report.priority)}</td>
            <td>${report.location.address}</td>
            <td>${report.reporter ? report.reporter.firstName + ' ' + report.reporter.lastName : 'Unknown'}</td>
            <td>${formatDate(report.createdAt)}</td>
            <td>
                <div class="worker-actions">
                    <button class="btn btn-primary btn-sm" onclick="viewReportDetails('${report._id}')">View</button>
                    ${report.status !== 'resolved' ? `<button class="btn btn-outline btn-sm" onclick="updateReportStatus('${report._id}', 'in_progress')">Start</button>` : ''}
                    ${report.status === 'in_progress' ? `<button class="btn btn-outline btn-sm" onclick="openResolveModal('${report._id}')">Resolve</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function displayAssignedPagination() {
    const container = document.getElementById('assigned-pagination');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="loadAssignedReports(${currentPage - 1})">Previous</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="loadAssignedReports(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span>...</span>';
        }
    }
    
    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="loadAssignedReports(${currentPage + 1})">Next</button>`;
    
    container.innerHTML = html;
}

function filterAssignedReports() {
    loadAssignedReports(1);
}

async function loadWorkerMap() {
    try {
        showLoading(true);
        
        const mapElement = document.getElementById('worker-map');
        if (!mapElement) {
            console.error('Worker map element not found');
            showLoading(false);
            return;
        }
        
        // Load assigned reports first
        const response = await fetch('/api/worker/assigned-reports?limit=100', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // Prepare markers data
            const markers = [];
            let centerLat = 40.7128;
            let centerLng = -74.0060;
            
            if (data.reports && data.reports.length > 0) {
                data.reports.forEach(report => {
                    if (report.location && report.location.coordinates) {
                        markers.push({
                            lat: report.location.coordinates.lat,
                            lng: report.location.coordinates.lng,
                            popup: `
                                <div style="padding: 10px; min-width: 200px;">
                                    <h3 style="margin: 0 0 10px 0; color: #2c3e50;">${report.title}</h3>
                                    <p style="margin: 5px 0;"><strong>Status:</strong> ${formatStatus(report.status)}</p>
                                    <p style="margin: 5px 0;"><strong>Category:</strong> ${formatCategory(report.category)}</p>
                                    <p style="margin: 5px 0;"><strong>Address:</strong> ${report.location.address}</p>
                                    <button class="btn btn-primary btn-sm" onclick="viewReportDetails('${report._id}')" style="margin-top: 10px;">View Details</button>
                                </div>
                            `
                        });
                        // Use first report as center
                        if (markers.length === 1) {
                            centerLat = report.location.coordinates.lat;
                            centerLng = report.location.coordinates.lng;
                        }
                    }
                });
            }
            
            // Use static map (no dependencies, always works)
            if (typeof window.initStaticMap === 'function') {
                workerMap = window.initStaticMap('worker-map', centerLat, centerLng, 12, markers);
            } else {
                // Wait for static-map.js to load
                setTimeout(() => {
                    if (typeof window.initStaticMap === 'function') {
                        workerMap = window.initStaticMap('worker-map', centerLat, centerLng, 12, markers);
                    } else {
                        // Ultimate fallback - show coordinates
                        mapElement.innerHTML = `
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 15px;">
                                <i class="fas fa-map" style="font-size: 4rem; color: #27ae60; margin-bottom: 1.5rem;"></i>
                                <h3 style="color: #2c3e50; margin-bottom: 1rem;">Work Locations</h3>
                                <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                    ${markers.map((m, i) => `
                                        <div style="margin: 0.5rem 0; padding: 0.75rem; background: #f8f9fa; border-radius: 5px;">
                                            <i class="fas fa-map-pin" style="color: #27ae60;"></i> 
                                            <strong>Location ${i + 1}:</strong> ${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}
                                            <br>
                                            <a href="https://www.google.com/maps?q=${m.lat},${m.lng}" target="_blank" style="color: #27ae60; text-decoration: none; font-size: 0.9rem;">
                                                <i class="fas fa-external-link-alt"></i> View on Google Maps
                                            </a>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }
                }, 500);
            }
        }
    } catch (error) {
        console.error('Load worker map error:', error);
        showNotification('Failed to load map', 'error');
    } finally {
        showLoading(false);
    }
}

function createStatusIcon(status) {
    const colors = {
        'pending': '#f39c12',
        'in_progress': '#3498db',
        'resolved': '#27ae60',
        'rejected': '#e74c3c'
    };
    
    const color = colors[status] || '#666';
    
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                background-color: ${color};
                width: 30px;
                height: 30px;
                border-radius: 50%;
                border: 3px solid white;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 16px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ">!</div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
}

async function viewReportDetails(reportId) {
    try {
        showLoading(true);
        
        const response = await fetch(`/api/worker/assigned-reports/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const report = await response.json();
        
        if (response.ok) {
            displayReportDetails(report);
            currentReportId = reportId;
            openModal('report-details-modal');
        } else {
            showNotification('Failed to load report details', 'error');
        }
    } catch (error) {
        console.error('View report details error:', error);
        showNotification('Failed to load report details', 'error');
    } finally {
        showLoading(false);
    }
}

function displayReportDetails(report) {
    const content = document.getElementById('report-details-content');
    
    content.innerHTML = `
        <div class="report-details">
            <div>
                <h3>Report Information</h3>
                <p><strong>Title:</strong> ${report.title}</p>
                <p><strong>Description:</strong> ${report.description}</p>
                <p><strong>Category:</strong> ${formatCategory(report.category)}</p>
                <p><strong>Priority:</strong> ${formatPriority(report.priority)}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${report.status}">${formatStatus(report.status)}</span></p>
                <p><strong>Location:</strong> ${report.location.address}</p>
                <p><strong>Reporter:</strong> ${report.reporter ? report.reporter.firstName + ' ' + report.reporter.lastName : 'Unknown'}</p>
                <p><strong>Created:</strong> ${formatDate(report.createdAt)}</p>
                
                ${report.status !== 'resolved' ? `
                    <h4>Update Status</h4>
                    <div class="form-group">
                        <label for="update-status-worker">Status</label>
                        <select id="update-status-worker">
                            <option value="in_progress" ${report.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                            <option value="resolved" ${report.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="resolution-notes-worker">Resolution Notes</label>
                        <textarea id="resolution-notes-worker" rows="3" placeholder="Add notes about the resolution...">${report.resolutionNotes || ''}</textarea>
                    </div>
                    <button class="btn btn-primary" onclick="saveReportStatus()">Update Status</button>
                ` : `
                    <h4>Resolution Notes</h4>
                    <p>${report.resolutionNotes || 'No resolution notes provided.'}</p>
                    <p><strong>Resolved At:</strong> ${formatDate(report.resolvedAt)}</p>
                `}
            </div>
            
            <div>
                ${report.images && report.images.length > 0 ? `
                    <h3>Images</h3>
                    <div class="report-images">
                        ${report.images.map(image => `
                            <img src="/${image.path}" alt="Report image">
                        `).join('')}
                    </div>
                ` : '<p>No images available</p>'}
            </div>
        </div>
    `;
}

async function updateReportStatus(reportId, status) {
    try {
        const response = await fetch(`/api/worker/assigned-reports/${reportId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showNotification('Report status updated successfully', 'success');
            loadAssignedReports(currentPage);
            if (workerMap) {
                loadWorkerMap();
            }
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to update report status', 'error');
        }
    } catch (error) {
        console.error('Update report status error:', error);
        showNotification('Failed to update report status', 'error');
    }
}

async function saveReportStatus() {
    const status = document.getElementById('update-status-worker').value;
    const resolutionNotes = document.getElementById('resolution-notes-worker').value;
    
    try {
        const response = await fetch(`/api/worker/assigned-reports/${currentReportId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ status, resolutionNotes })
        });
        
        if (response.ok) {
            showNotification('Report status updated successfully', 'success');
            closeModal();
            loadAssignedReports(currentPage);
            loadDashboardData();
            if (workerMap) {
                loadWorkerMap();
            }
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to update report status', 'error');
        }
    } catch (error) {
        console.error('Save report status error:', error);
        showNotification('Failed to update report status', 'error');
    }
}

function openResolveModal(reportId) {
    viewReportDetails(reportId);
    // Auto-select resolved status
    setTimeout(() => {
        const statusSelect = document.getElementById('update-status-worker');
        if (statusSelect) {
            statusSelect.value = 'resolved';
        }
    }, 100);
}

function handleLogout(e) {
    if (e) {
        e.preventDefault();
    }
    localStorage.removeItem('token');
    showNotification('Logged out successfully', 'success');
    setTimeout(() => {
        window.location.href = '/';
    }, 500);
}

// Utility functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 4000;
        animation: slideInRight 0.3s ease;
    `;
    
    if (type === 'success') {
        notification.style.backgroundColor = '#27ae60';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#e74c3c';
    } else {
        notification.style.backgroundColor = '#3498db';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function formatCategory(category) {
    const categories = {
        'garbage': 'Garbage',
        'potholes': 'Potholes',
        'broken_streetlights': 'Broken Streetlights',
        'graffiti': 'Graffiti',
        'overgrown_vegetation': 'Overgrown Vegetation',
        'water_leakage': 'Water Leakage',
        'damaged_sidewalks': 'Damaged Sidewalks',
        'traffic_signs': 'Traffic Signs',
        'other': 'Other'
    };
    return categories[category] || category;
}

function formatStatus(status) {
    const statuses = {
        'pending': 'Pending',
        'in_progress': 'In Progress',
        'resolved': 'Resolved',
        'rejected': 'Rejected'
    };
    return statuses[status] || status;
}

function formatPriority(priority) {
    const priorities = {
        'low': 'Low',
        'medium': 'Medium',
        'high': 'High',
        'urgent': 'Urgent'
    };
    return priorities[priority] || priority;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

