// Admin Panel JavaScript
let currentReportId = null;
let currentPage = 1;
let totalPages = 1;
let adminMap = null;
let allWorkers = [];

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
});

function initializeAdminPanel() {
    // Check if user is admin
    checkAdminAuth();
    
    // Setup event listeners
    setupAdminEventListeners();
    
    // Load dashboard data
    loadDashboardData();
    
    // Auto-refresh reports every 30 seconds to show updates
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            if (document.getElementById('reports-section').style.display !== 'none') {
                loadAdminReports(currentPage);
            }
            if (adminMap && document.getElementById('map-section').style.display !== 'none') {
                loadAdminMap();
            }
            loadDashboardData();
        }
    }, 30000);
    
    // Refresh when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            if (document.getElementById('reports-section').style.display !== 'none') {
                loadAdminReports(currentPage);
            }
            if (adminMap && document.getElementById('map-section').style.display !== 'none') {
                loadAdminMap();
            }
            loadDashboardData();
        }
    });
}

function setupAdminEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('data-section');
            if (section) {
                showAdminSection(section);
            }
        });
    });
    
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
    
    // Add note form
    document.getElementById('add-note-form').addEventListener('submit', handleAddNote);
    
    // Logout
    const adminLogoutLink = document.getElementById('admin-logout-link');
    if (adminLogoutLink) {
        adminLogoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            handleAdminLogout();
        });
    }
}

async function checkAdminAuth() {
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
            if (user.role !== 'admin') {
                window.location.href = '/';
                return;
            }
            document.getElementById('admin-name').textContent = user.firstName;
        } else {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Admin auth check failed:', error);
        window.location.href = '/';
    }
}

function showAdminSection(section) {
    // Hide all sections
    document.querySelectorAll('[id$="-section"]').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
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
        case 'reports':
            loadAdminReports();
            break;
        case 'map':
            loadAdminMap();
            break;
        case 'users':
            loadAdminUsers();
            break;
    }
}

async function loadDashboardData() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/admin/dashboard', {
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
            <h3>${data.totalReports || 0}</h3>
            <p>Total Reports</p>
        </div>
        <div class="stat-card">
            <h3>${data.activeReports || 0}</h3>
            <p>Active Reports</p>
        </div>
        <div class="stat-card">
            <h3>${data.resolvedReports || 0}</h3>
            <p>Resolved Reports</p>
        </div>
        <div class="stat-card">
            <h3>${data.totalUsers || 0}</h3>
            <p>Total Users</p>
        </div>
    `;
}

function displayRecentReports(reports) {
    const container = document.getElementById('recent-reports');
    
    if (!reports || reports.length === 0) {
        container.innerHTML = '<p>No recent reports</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Reporter</th>
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
                        <td>${report.reporter ? report.reporter.firstName + ' ' + report.reporter.lastName : 'Unknown'}</td>
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

async function loadAdminReports(page = 1) {
    try {
        showLoading(true);
        
        const status = document.getElementById('admin-status-filter').value;
        const category = document.getElementById('admin-category-filter').value;
        const search = document.getElementById('admin-search').value;
        
        let url = `/api/admin/reports?page=${page}&limit=20`;
        if (status) url += `&status=${status}`;
        if (category) url += `&category=${category}`;
        if (search) url += `&search=${search}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayAdminReports(data.reports);
            currentPage = data.currentPage;
            totalPages = data.totalPages;
            displayAdminPagination();
        } else {
            showNotification('Failed to load reports', 'error');
        }
    } catch (error) {
        console.error('Load admin reports error:', error);
        showNotification('Failed to load reports', 'error');
    } finally {
        showLoading(false);
    }
}

function displayAdminReports(reports) {
    const tbody = document.getElementById('admin-reports-table');
    
    if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No reports found</td></tr>';
        return;
    }
    
    tbody.innerHTML = reports.map(report => {
        const assignedWorker = report.assignedTo ? `${report.assignedTo.firstName} ${report.assignedTo.lastName}` : 'Not assigned';
        return `
        <tr>
            <td>${report._id.substring(0, 8)}...</td>
            <td>${report.title}</td>
            <td>${formatCategory(report.category)}</td>
            <td><span class="status-badge status-${report.status}">${formatStatus(report.status)}</span></td>
            <td>${formatPriority(report.priority)}</td>
            <td>${report.reporter ? report.reporter.firstName + ' ' + report.reporter.lastName : 'Unknown'}</td>
            <td>${assignedWorker}</td>
            <td>${formatDate(report.createdAt)}</td>
            <td>
                <div class="admin-actions">
                    <button class="btn btn-primary btn-sm" onclick="viewReportDetails('${report._id}')">View & Assign</button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

function displayAdminPagination() {
    const container = document.getElementById('admin-pagination');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="loadAdminReports(${currentPage - 1})">Previous</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="loadAdminReports(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span>...</span>';
        }
    }
    
    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="loadAdminReports(${currentPage + 1})">Next</button>`;
    
    container.innerHTML = html;
}

async function loadAdminUsers(page = 1) {
    try {
        showLoading(true);
        
        const role = document.getElementById('user-role-filter').value;
        const search = document.getElementById('user-search').value;
        
        let url = `/api/admin/users?page=${page}&limit=20`;
        if (role) url += `&role=${role}`;
        if (search) url += `&search=${search}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            displayAdminUsers(data.users);
            currentPage = data.currentPage;
            totalPages = data.totalPages;
            displayAdminUsersPagination();
        } else {
            showNotification('Failed to load users', 'error');
        }
    } catch (error) {
        console.error('Load admin users error:', error);
        showNotification('Failed to load users', 'error');
    } finally {
        showLoading(false);
    }
}

function displayAdminUsers(users) {
    const tbody = document.getElementById('admin-users-table');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.email}</td>
            <td>${user.role}</td>
            <td><span class="status-badge ${user.isActive ? 'status-resolved' : 'status-rejected'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>${formatDate(user.createdAt)}</td>
            <td>${user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</td>
            <td>
                <div class="admin-actions">
                    <button class="btn btn-outline btn-sm" onclick="toggleUserStatus('${user._id}', ${user.isActive})">${user.isActive ? 'Deactivate' : 'Activate'}</button>
                    ${user.role !== 'admin' ? `<button class="btn btn-primary btn-sm" onclick="changeUserRole('${user._id}', '${user.role}')">Change Role</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function displayAdminUsersPagination() {
    const container = document.getElementById('admin-users-pagination');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="loadAdminUsers(${currentPage - 1})">Previous</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="loadAdminUsers(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span>...</span>';
        }
    }
    
    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="loadAdminUsers(${currentPage + 1})">Next</button>`;
    
    container.innerHTML = html;
}

async function viewReportDetails(reportId) {
    try {
        showLoading(true);
        
        const response = await fetch(`/api/reports/${reportId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const report = await response.json();
        
        if (response.ok) {
            window.currentReport = report;
            displayReportDetails(report);
            currentReportId = reportId;
            // Load workers for assignment dropdown
            await loadWorkers();
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

async function editReport(reportId) {
    // Same as viewReportDetails - opens the modal for editing
    await viewReportDetails(reportId);
}

function displayReportDetails(report) {
    const content = document.getElementById('report-details-content');
    
    const assignedWorkerName = report.assignedTo ? `${report.assignedTo.firstName} ${report.assignedTo.lastName}` : 'Not assigned';
    
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
                <p><strong>Assigned To:</strong> <span id="current-assigned-worker">${assignedWorkerName}</span></p>
                <p><strong>Created:</strong> ${formatDate(report.createdAt)}</p>
                
                <h4>Update Report</h4>
                <div class="form-group">
                    <label for="update-status">Status</label>
                    <select id="update-status">
                        <option value="pending" ${report.status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="in_progress" ${report.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="resolved" ${report.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                        <option value="rejected" ${report.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="update-priority">Priority</label>
                    <select id="update-priority">
                        <option value="low" ${report.priority === 'low' ? 'selected' : ''}>Low</option>
                        <option value="medium" ${report.priority === 'medium' ? 'selected' : ''}>Medium</option>
                        <option value="high" ${report.priority === 'high' ? 'selected' : ''}>High</option>
                        <option value="urgent" ${report.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="assign-worker">Assign Worker</label>
                    <select id="assign-worker">
                        <option value="">-- Select Worker --</option>
                    </select>
                    <button class="btn btn-outline btn-sm" onclick="loadWorkers()" style="margin-top: 0.5rem;">Refresh Workers</button>
                    <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">Current: <strong>${assignedWorkerName}</strong></p>
                </div>
                <div class="form-group">
                    <label for="resolution-notes">Resolution Notes</label>
                    <textarea id="resolution-notes" rows="3" placeholder="Add resolution notes...">${report.resolutionNotes || ''}</textarea>
                </div>
                <button class="btn btn-primary" onclick="saveReportUpdates()">Save Updates & Assign</button>
            </div>
            
            <div>
                ${report.images && report.images.length > 0 ? `
                    <h3>Images</h3>
                    <div class="report-images">
                        ${report.images.map(image => `
                            <img src="/${image.path}" alt="Report image" onclick="openImageModal('${image.path}')">
                        `).join('')}
                    </div>
                ` : '<p>No images available</p>'}
                
                <h3>Admin Notes</h3>
                <div class="admin-notes">
                    ${report.adminNotes && report.adminNotes.length > 0 ? 
                        report.adminNotes.map(note => `
                            <div class="note">
                                <div class="note-header">
                                    <span class="note-author">${note.addedBy ? note.addedBy.firstName + ' ' + note.addedBy.lastName : 'Unknown'}</span>
                                    <span class="note-date">${formatDate(note.addedAt)}</span>
                                </div>
                                <p>${note.note}</p>
                            </div>
                        `).join('') : 
                        '<p>No notes yet</p>'
                    }
                    <button class="btn btn-outline" onclick="openAddNoteModal()">Add Note</button>
                </div>
            </div>
        </div>
    `;
}

async function updateReportStatus() {
    const status = document.getElementById('update-status').value;
    await updateReport({ status });
}

async function updateReportPriority() {
    const priority = document.getElementById('update-priority').value;
    await updateReport({ priority });
}

async function saveReportUpdates() {
    const status = document.getElementById('update-status').value;
    const priority = document.getElementById('update-priority').value;
    const assignedTo = document.getElementById('assign-worker').value;
    const resolutionNotes = document.getElementById('resolution-notes').value;
    
    await updateReport({ status, priority, assignedTo, resolutionNotes });
}

async function loadWorkers() {
    try {
        showLoading(true);
        const response = await fetch('/api/admin/workers', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            allWorkers = data.workers;
            const select = document.getElementById('assign-worker');
            if (select) {
                select.innerHTML = '<option value="">-- Select Worker --</option>';
                if (allWorkers && allWorkers.length > 0) {
                    allWorkers.forEach(worker => {
                        const option = document.createElement('option');
                        option.value = worker._id;
                        option.textContent = `${worker.firstName} ${worker.lastName} (${worker.email})`;
                        if (currentReportId && window.currentReport && window.currentReport.assignedTo && window.currentReport.assignedTo._id === worker._id) {
                            option.selected = true;
                        }
                        select.appendChild(option);
                    });
                } else {
                    select.innerHTML = '<option value="">No workers available</option>';
                }
            }
            showNotification('Workers loaded', 'success');
        } else {
            showNotification('Failed to load workers', 'error');
        }
    } catch (error) {
        console.error('Load workers error:', error);
        showNotification('Failed to load workers', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadAdminMap() {
    try {
        showLoading(true);
        
        const mapElement = document.getElementById('admin-map');
        if (!mapElement) {
            console.error('Admin map element not found');
            showLoading(false);
            return;
        }
        
        // Get status filter
        const status = document.getElementById('map-status-filter').value;
        
        // Load reports
        let url = '/api/admin/reports?limit=1000';
        if (status) url += `&status=${status}`;
        
        const response = await fetch(url, {
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
                        const assignedWorker = report.assignedTo ? `${report.assignedTo.firstName} ${report.assignedTo.lastName}` : 'Not assigned';
                        
                        markers.push({
                            lat: report.location.coordinates.lat,
                            lng: report.location.coordinates.lng,
                            popup: `
                                <div style="padding: 10px; min-width: 250px;">
                                    <h3 style="margin: 0 0 10px 0; color: #2c3e50;">${report.title}</h3>
                                    <p style="margin: 5px 0;"><strong>Status:</strong> ${formatStatus(report.status)}</p>
                                    <p style="margin: 5px 0;"><strong>Category:</strong> ${formatCategory(report.category)}</p>
                                    <p style="margin: 5px 0;"><strong>Priority:</strong> ${formatPriority(report.priority)}</p>
                                    <p style="margin: 5px 0;"><strong>Assigned To:</strong> ${assignedWorker}</p>
                                    <p style="margin: 5px 0;"><strong>Address:</strong> ${report.location.address}</p>
                                    <button class="btn btn-primary btn-sm" onclick="viewReportDetails('${report._id}')" style="margin-top: 10px; width: 100%;">View & Assign</button>
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
                adminMap = window.initStaticMap('admin-map', centerLat, centerLng, 12, markers);
            } else {
                // Wait for static-map.js to load
                setTimeout(() => {
                    if (typeof window.initStaticMap === 'function') {
                        adminMap = window.initStaticMap('admin-map', centerLat, centerLng, 12, markers);
                    } else {
                        // Ultimate fallback - show coordinates
                        mapElement.innerHTML = `
                            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 15px;">
                                <i class="fas fa-map" style="font-size: 4rem; color: #3498db; margin-bottom: 1.5rem;"></i>
                                <h3 style="color: #2c3e50; margin-bottom: 1rem;">Report Locations</h3>
                                <div style="background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-height: 400px; overflow-y: auto;">
                                    ${markers.map((m, i) => `
                                        <div style="margin: 0.5rem 0; padding: 0.75rem; background: #f8f9fa; border-radius: 5px;">
                                            <i class="fas fa-map-pin" style="color: #3498db;"></i> 
                                            <strong>Location ${i + 1}:</strong> ${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}
                                            <br>
                                            <a href="https://www.google.com/maps?q=${m.lat},${m.lng}" target="_blank" style="color: #3498db; text-decoration: none; font-size: 0.9rem;">
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
        console.error('Load admin map error:', error);
        showNotification('Failed to load map', 'error');
    } finally {
        showLoading(false);
    }
}

function createAdminStatusIcon(status) {
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

async function updateReport(updates) {
    try {
        showLoading(true);
        
        // If assigning a worker, ensure status is set to in_progress
        if (updates.assignedTo && updates.assignedTo !== '') {
            if (!updates.status || updates.status === 'pending') {
                updates.status = 'in_progress';
            }
        }
        
        const response = await fetch(`/api/admin/reports/${currentReportId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(updates)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            const message = updates.assignedTo ? 
                `Report assigned to worker and updated successfully!` : 
                'Report updated successfully';
            showNotification(message, 'success');
            
            // Reload data
            loadAdminReports(currentPage);
            if (adminMap) {
                loadAdminMap();
            }
            
            // Update the current report object
            if (data.report) {
                window.currentReport = data.report;
            }
            
            closeModal();
        } else {
            showNotification(data.message || 'Failed to update report', 'error');
        }
    } catch (error) {
        console.error('Update report error:', error);
        showNotification('Failed to update report', 'error');
    } finally {
        showLoading(false);
    }
}

function openAddNoteModal() {
    openModal('add-note-modal');
}

async function handleAddNote(e) {
    e.preventDefault();
    
    const note = document.getElementById('note-text').value;
    
    try {
        const response = await fetch(`/api/admin/reports/${currentReportId}/notes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ note })
        });
        
        if (response.ok) {
            showNotification('Note added successfully', 'success');
            closeModal();
            document.getElementById('add-note-form').reset();
            viewReportDetails(currentReportId);
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to add note', 'error');
        }
    } catch (error) {
        console.error('Add note error:', error);
        showNotification('Failed to add note', 'error');
    }
}

async function toggleUserStatus(userId, currentStatus) {
    try {
        const response = await fetch(`/api/admin/users/${userId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ isActive: !currentStatus })
        });
        
        if (response.ok) {
            showNotification(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`, 'success');
            loadAdminUsers(currentPage);
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to update user status', 'error');
        }
    } catch (error) {
        console.error('Toggle user status error:', error);
        showNotification('Failed to update user status', 'error');
    }
}

async function changeUserRole(userId, currentRole) {
    const newRole = currentRole === 'user' ? 'admin' : 'user';
    
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ role: newRole })
        });
        
        if (response.ok) {
            showNotification(`User role changed to ${newRole} successfully`, 'success');
            loadAdminUsers(currentPage);
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to change user role', 'error');
        }
    } catch (error) {
        console.error('Change user role error:', error);
        showNotification('Failed to change user role', 'error');
    }
}

function filterAdminReports() {
    loadAdminReports(1);
}

function filterUsers() {
    loadAdminUsers(1);
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

function handleAdminLogout() {
    localStorage.removeItem('token');
    window.location.href = '/';
}
