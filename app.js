// Global variables
let currentUser = null;
let map = null;
let reportMap = null;
let reports = [];
let currentPage = 1;
let totalPages = 1;

// API base URL
const API_BASE = '';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Setup event listeners FIRST (most important - makes page interactive)
    setupEventListeners();
    
    // Check if user is logged in
    checkAuthStatus();
    
    // Setup user menu dropdown (if user is logged in)
    if (currentUser) {
        setupUserMenuDropdown();
    }
    
    // Load initial data (non-blocking)
    setTimeout(() => {
        loadReports();
        loadStats();
    }, 100);
    
    // Initialize map (non-blocking, lazy)
    setTimeout(() => {
        initMap();
    }, 500);
    
    // Auto-refresh reports every 30 seconds to show updates
    setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadReports(currentPage, true); // Silent refresh
            if (currentUser) {
                loadMyReports(true); // Silent refresh
            }
        }
    }, 30000);
    
    // Refresh when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            loadReports(currentPage, true); // Silent refresh
            if (currentUser) {
                loadMyReports(true); // Silent refresh
            }
        }
    });
}

function setupEventListeners() {
    try {
        // Navigation
        const navToggle = document.getElementById('nav-toggle');
        if (navToggle) navToggle.addEventListener('click', toggleMobileMenu);
        
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) loginBtn.addEventListener('click', () => openModal('login-modal'));
        
        const registerBtn = document.getElementById('register-btn');
        if (registerBtn) registerBtn.addEventListener('click', () => openModal('register-modal'));
        
        const reportIssueBtn = document.getElementById('report-issue-btn');
        if (reportIssueBtn) reportIssueBtn.addEventListener('click', () => openModal('report-modal'));
        
        const viewReportsBtn = document.getElementById('view-reports-btn');
        if (viewReportsBtn) viewReportsBtn.addEventListener('click', () => scrollToSection('reports'));
        
        // Auth forms
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        
        const registerForm = document.getElementById('register-form');
        if (registerForm) registerForm.addEventListener('submit', handleRegister);
        
        const switchToRegister = document.getElementById('switch-to-register');
        if (switchToRegister) switchToRegister.addEventListener('click', () => switchModal('login-modal', 'register-modal'));
        
        const switchToLogin = document.getElementById('switch-to-login');
        if (switchToLogin) switchToLogin.addEventListener('click', () => switchModal('register-modal', 'login-modal'));
        
        // Report form
        const reportForm = document.getElementById('report-form');
        if (reportForm) reportForm.addEventListener('submit', handleReportSubmit);
        
        const reportImages = document.getElementById('report-images');
        if (reportImages) reportImages.addEventListener('change', handleImagePreview);
        
        // Filters
        const filterBtn = document.getElementById('filter-reports-btn');
        if (filterBtn) filterBtn.addEventListener('click', filterReports);
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
    
    // User menu - use event delegation to handle dynamically added elements
    document.addEventListener('click', (e) => {
        if (e.target.id === 'logout-link' || e.target.closest('#logout-link')) {
            e.preventDefault();
            handleLogout(e);
        }
        if (e.target.id === 'my-reports-link' || e.target.closest('#my-reports-link')) {
            e.preventDefault();
            loadMyReports();
        }
        if (e.target.id === 'admin-link' || e.target.closest('#admin-link')) {
            e.preventDefault();
            openAdminPanel();
        }
        if (e.target.id === 'worker-link-nav' || e.target.closest('#worker-link-nav')) {
            e.preventDefault();
            window.location.href = '/worker';
        }
    });
    
    // Also set up direct listeners for existing elements
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
    const myReportsLink = document.getElementById('my-reports-link');
    if (myReportsLink) {
        myReportsLink.addEventListener('click', (e) => {
            e.preventDefault();
            loadMyReports();
        });
    }
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.addEventListener('click', (e) => {
            e.preventDefault();
            openAdminPanel();
        });
    }
    const workerLinkNav = document.getElementById('worker-link-nav');
    if (workerLinkNav) {
        workerLinkNav.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/worker';
        });
    }
    
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

// Authentication functions
async function checkAuthStatus() {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const response = await fetch(`${API_BASE}/api/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const user = await response.json();
                currentUser = user;
                updateUIForLoggedInUser();
            } else {
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
        }
    }
}

function updateUIForLoggedInUser() {
    const navAuth = document.getElementById('nav-auth');
    const navUser = document.getElementById('nav-user');
    
    if (navAuth) navAuth.style.display = 'none';
    if (navUser) {
        navUser.style.display = 'block';
        const userName = document.getElementById('user-name');
        if (userName) userName.textContent = currentUser.firstName;
    }
    
    // Show/hide admin link
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.style.display = currentUser.role === 'admin' ? 'block' : 'none';
    }
    
    // Show/hide worker link
    const workerLinkNav = document.getElementById('worker-link-nav');
    if (workerLinkNav) {
        workerLinkNav.style.display = currentUser.role === 'worker' ? 'block' : 'none';
    }
    
    // Ensure logout link is always visible and working
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        // Remove any existing event listeners by cloning
        const newLogoutLink = logoutLink.cloneNode(true);
        logoutLink.parentNode.replaceChild(newLogoutLink, logoutLink);
        newLogoutLink.addEventListener('click', handleLogout);
    }
    
    // Setup dropdown toggle for user menu
    setupUserMenuDropdown();
}

function setupUserMenuDropdown() {
    const userMenu = document.getElementById('user-menu-clickable');
    const userDropdown = document.getElementById('user-dropdown-menu');
    
    if (userMenu && userDropdown) {
        // Toggle dropdown on click
        userMenu.addEventListener('click', (e) => {
            // Don't toggle if clicking on a link inside
            if (e.target.closest('a')) {
                return;
            }
            e.stopPropagation();
            const isVisible = userDropdown.style.display === 'block';
            userDropdown.style.display = isVisible ? 'none' : 'block';
            userMenu.classList.toggle('active', !isVisible);
        });
        
        // Close dropdown when clicking outside
        const closeDropdownHandler = (e) => {
            if (userMenu && userDropdown && 
                !userMenu.contains(e.target) && 
                !userDropdown.contains(e.target)) {
                userDropdown.style.display = 'none';
                userMenu.classList.remove('active');
            }
        };
        
        // Remove any existing listener and add new one
        document.removeEventListener('click', closeDropdownHandler);
        setTimeout(() => {
            document.addEventListener('click', closeDropdownHandler);
        }, 100);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateUIForLoggedInUser();
            closeModal();
            showNotification('Login successful!', 'success');
            
            // Redirect based on role
            setTimeout(() => {
                redirectBasedOnRole(data.user.role);
            }, 1000);
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    // Get selected role
    const roleInput = document.querySelector('input[name="register-role"]:checked');
    const selectedRole = roleInput ? roleInput.value : 'user';
    
    const formData = {
        firstName: document.getElementById('register-firstname').value,
        lastName: document.getElementById('register-lastname').value,
        username: document.getElementById('register-username').value,
        email: document.getElementById('register-email').value,
        phone: document.getElementById('register-phone').value,
        password: document.getElementById('register-password').value,
        role: selectedRole
    };
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        // Check if response is ok before parsing JSON
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error('Failed to parse response:', jsonError);
            showNotification('Server returned invalid response. Please try again.', 'error');
            showLoading(false);
            return;
        }
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            updateUIForLoggedInUser();
            closeModal();
            showNotification('Registration successful!', 'success');
            
            // Redirect based on role
            setTimeout(() => {
                redirectBasedOnRole(data.user.role);
            }, 1000);
        } else {
            console.error('Registration failed:', data);
            if (data.errors && Array.isArray(data.errors)) {
                const errorMessages = data.errors.map(err => err.msg || err.message || JSON.stringify(err)).join(', ');
                showNotification(errorMessages || 'Validation failed', 'error');
            } else {
                showNotification(data.message || 'Registration failed. Please check your input and try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification(`Registration failed: ${error.message || 'Network error. Please check if the server is running.'}`, 'error');
    } finally {
        showLoading(false);
    }
}

function handleLogout(e) {
    if (e) {
        e.preventDefault();
    }
    
    localStorage.removeItem('token');
    currentUser = null;
    
    // Reset UI - check if elements exist first
    const navAuth = document.getElementById('nav-auth');
    const navUser = document.getElementById('nav-user');
    
    if (navAuth) navAuth.style.display = 'block';
    if (navUser) navUser.style.display = 'none';
    
    // Hide worker and admin links
    const workerLinkNav = document.getElementById('worker-link-nav');
    if (workerLinkNav) {
        workerLinkNav.style.display = 'none';
    }
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.style.display = 'none';
    }
    
    showNotification('Logged out successfully', 'success');
    
    // Redirect to home page after logout
    setTimeout(() => {
        window.location.href = '/';
    }, 500);
}

// Report functions
async function loadReports(page = 1, silent = false) {
    try {
        if (!silent) {
            showLoading(true);
        }
        
        const statusFilter = document.getElementById('status-filter');
        const categoryFilter = document.getElementById('category-filter');
        const status = statusFilter ? statusFilter.value : '';
        const category = categoryFilter ? categoryFilter.value : '';
        
        let url = `${API_BASE}/api/reports?page=${page}&limit=12`;
        if (status) url += `&status=${status}`;
        if (category) url += `&category=${category}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            reports = data.reports;
            currentPage = data.currentPage;
            totalPages = data.totalPages;
            displayReports();
            displayPagination();
            
            // Update global reports variable for map
            window.reports = reports;
            // Load reports on map if map is available
            if (typeof window.loadReportsOnMap === 'function') {
                window.loadReportsOnMap();
            }
        } else {
            if (!silent) {
                showNotification('Failed to load reports', 'error');
            }
        }
    } catch (error) {
        console.error('Load reports error:', error);
        if (!silent) {
            showNotification('Failed to load reports', 'error');
        }
    } finally {
        if (!silent) {
            showLoading(false);
        }
    }
}

function displayReports() {
    const container = document.getElementById('reports-grid');
    
    if (reports.length === 0) {
        container.innerHTML = '<p class="no-reports">No reports found.</p>';
        return;
    }
    
    container.innerHTML = reports.map(report => `
        <div class="report-card">
            ${report.images && report.images.length > 0 ? 
                `<img src="${API_BASE}/${report.images[0].path}" alt="${report.title}" class="report-image">` : 
                '<div class="report-image" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center;"><i class="fas fa-image" style="font-size: 3rem; color: #ccc;"></i></div>'
            }
            <div class="report-content">
                <div class="report-header">
                    <div>
                        <h3 class="report-title">${report.title}</h3>
                        <span class="report-category">${formatCategory(report.category)}</span>
                    </div>
                    <span class="report-status status-${report.status}">${formatStatus(report.status)}</span>
                </div>
                <p class="report-description">${report.description}</p>
                <div class="report-meta">
                    <div class="report-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${report.location.address}</span>
                    </div>
                    <span>${formatDate(report.createdAt)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function displayPagination() {
    const container = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="loadReports(${currentPage - 1})">Previous</button>`;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage || i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="loadReports(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += '<span>...</span>';
        }
    }
    
    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="loadReports(${currentPage + 1})">Next</button>`;
    
    container.innerHTML = html;
}

async function handleReportSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Please login to submit a report', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('title', document.getElementById('report-title').value);
    formData.append('description', document.getElementById('report-description').value);
    formData.append('category', document.getElementById('report-category').value);
    formData.append('priority', document.getElementById('report-priority').value);
    formData.append('location[address]', document.getElementById('report-address').value);
    
    // Add coordinates if map is initialized and user has clicked on map
    if (window.currentCoordinates) {
        formData.append('location[coordinates][lat]', window.currentCoordinates.lat);
        formData.append('location[coordinates][lng]', window.currentCoordinates.lng);
    } else {
        // Use default coordinates if no location selected
        formData.append('location[coordinates][lat]', '40.7128');
        formData.append('location[coordinates][lng]', '-74.0060');
    }
    
    // Add images
    const imageFiles = document.getElementById('report-images').files;
    for (let i = 0; i < imageFiles.length; i++) {
        formData.append('images', imageFiles[i]);
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`${API_BASE}/api/reports`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Report submitted successfully!', 'success');
            closeModal();
            document.getElementById('report-form').reset();
            document.getElementById('image-preview').innerHTML = '';
            loadReports();
        } else {
            if (data.errors) {
                showNotification(data.errors.map(err => err.msg).join(', '), 'error');
            } else {
                showNotification(data.message || 'Failed to submit report', 'error');
            }
        }
    } catch (error) {
        console.error('Report submission error:', error);
        showNotification('Failed to submit report', 'error');
    } finally {
        showLoading(false);
    }
}

function handleImagePreview(e) {
    const files = e.target.files;
    const preview = document.getElementById('image-preview');
    
    preview.innerHTML = '';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
            };
            reader.readAsDataURL(file);
        }
    }
}

async function loadMyReports(silent = false) {
    if (!currentUser) {
        if (!silent) {
            showNotification('Please login to view your reports', 'error');
        }
        return;
    }
    
    try {
        if (!silent) {
            showLoading(true);
        }
        
        const response = await fetch(`${API_BASE}/api/reports/my-reports`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            reports = data.reports;
            displayMyReports(data.reports);
            if (!silent) {
                showNotification('Your reports loaded', 'success');
                scrollToSection('reports');
            }
        } else {
            if (!silent) {
                showNotification('Failed to load your reports', 'error');
            }
        }
    } catch (error) {
        console.error('Load my reports error:', error);
        if (!silent) {
            showNotification('Failed to load your reports', 'error');
        }
    } finally {
        if (!silent) {
            showLoading(false);
        }
    }
}

function displayMyReports(reports) {
    const container = document.getElementById('reports-grid');
    
    if (reports.length === 0) {
        container.innerHTML = '<p class="no-reports">You haven\'t submitted any reports yet.</p>';
        return;
    }
    
    container.innerHTML = `
        <div style="grid-column: 1 / -1; margin-bottom: 1rem;">
            <h3>Your Submitted Reports</h3>
            <p>Total: ${reports.length} report(s)</p>
        </div>
        ${reports.map(report => `
        <div class="report-card">
            ${report.images && report.images.length > 0 ? 
                `<img src="${API_BASE}/${report.images[0].path}" alt="${report.title}" class="report-image">` : 
                '<div class="report-image" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center;"><i class="fas fa-image" style="font-size: 3rem; color: #ccc;"></i></div>'
            }
            <div class="report-content">
                <div class="report-header">
                    <div>
                        <h3 class="report-title">${report.title}</h3>
                        <span class="report-category">${formatCategory(report.category)}</span>
                    </div>
                    <span class="report-status status-${report.status}">${formatStatus(report.status)}</span>
                </div>
                <p class="report-description">${report.description}</p>
                <div class="report-meta">
                    <div class="report-location">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${report.location.address}</span>
                    </div>
                    <span>${formatDate(report.createdAt)}</span>
                </div>
                ${report.assignedTo ? `
                    <div style="margin-top: 0.5rem; padding: 0.5rem; background: #e8f4f8; border-radius: 5px;">
                        <i class="fas fa-user-hard-hat"></i> <strong>Assigned to:</strong> ${report.assignedTo.firstName} ${report.assignedTo.lastName}
                    </div>
                ` : ''}
                ${report.resolvedAt ? `
                    <div style="margin-top: 0.5rem; padding: 0.5rem; background: #d4edda; border-radius: 5px;">
                        <i class="fas fa-check-circle"></i> <strong>Resolved on:</strong> ${formatDate(report.resolvedAt)}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('')}
    `;
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/api/reports`);
        const data = await response.json();
        
        if (response.ok) {
            // This is a simplified version - in a real app, you'd have a dedicated stats endpoint
            document.getElementById('total-reports').textContent = data.total || 0;
            document.getElementById('resolved-reports').textContent = data.reports.filter(r => r.status === 'resolved').length;
            document.getElementById('active-users').textContent = '0'; // Would need user count endpoint
        }
    } catch (error) {
        console.error('Load stats error:', error);
    }
}

// Map functions
function initMap() {
    // Maps are now initialized in map-init.js with Leaflet
    // This function is kept for compatibility - non-blocking
    try {
        // Update global variables if maps exist
        if (typeof window.map !== 'undefined' && window.map) {
            map = window.map;
            // Invalidate size to ensure proper rendering
            if (map && typeof map.invalidateSize === 'function') {
                setTimeout(() => {
                    map.invalidateSize(true);
                }, 300);
            }
        }
        if (typeof window.reportMap !== 'undefined' && window.reportMap) {
            reportMap = window.reportMap;
        }
    } catch (error) {
        // Silently fail - maps are not critical for page functionality
        console.log('Map initialization deferred');
    }
}

// Utility functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // If opening report modal, ensure report map is initialized
    if (modalId === 'report-modal' && typeof window.initializeReportMap === 'function') {
        const defaultLocation = [40.7128, -74.0060];
        // Initialize immediately with default location (non-blocking)
        window.initializeReportMap(defaultLocation);
        
        // Optionally try to get user location in background (non-blocking)
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLocation = [position.coords.latitude, position.coords.longitude];
                    // Update map if it exists
                    if (window.reportMap) {
                        window.reportMap.setView(userLocation, 15);
                    } else {
                        window.initializeReportMap(userLocation);
                    }
                },
                () => {
                    // Silently fail - already using default location
                },
                {
                    timeout: 5000,
                    enableHighAccuracy: false
                }
            );
        }
    }
}

function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
    document.body.style.overflow = 'auto';
}

function switchModal(fromId, toId) {
    document.getElementById(fromId).style.display = 'none';
    document.getElementById(toId).style.display = 'block';
}

function toggleMobileMenu() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.toggle('active');
}

function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
}

function filterReports() {
    loadReports(1);
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
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
    
    // Remove notification after 3 seconds
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

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

function openAdminPanel() {
    if (currentUser && currentUser.role === 'admin') {
        window.location.href = '/admin';
    }
}

function redirectBasedOnRole(role) {
    if (role === 'admin') {
        window.location.href = '/admin';
    } else if (role === 'worker') {
        window.location.href = '/worker';
    }
    // For 'user' role, stay on the current page
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); }
        to { transform: translateX(100%); }
    }
    
    .no-reports {
        grid-column: 1 / -1;
        text-align: center;
        padding: 2rem;
        color: #666;
        font-size: 1.1rem;
    }
`;
document.head.appendChild(style);
