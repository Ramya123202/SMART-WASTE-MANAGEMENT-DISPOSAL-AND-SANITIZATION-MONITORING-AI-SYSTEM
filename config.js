// Google Maps API Configuration
const MAPS_CONFIG = {
    // Replace this with your own Google Maps API key
    API_KEY: 'AIzaSyBFw0Qbyq9zTFTd-tUY6dOWWgUYQoUzS0Y',
    
    // Default location (New York City)
    DEFAULT_LOCATION: {
        lat: 40.7128,
        lng: -74.0060
    },
    
    // Map settings
    ZOOM_LEVELS: {
        main: 12,
        report: 15
    },
    
    // Marker colors for different report statuses
    MARKER_COLORS: {
        'pending': '#f39c12',
        'in_progress': '#3498db',
        'resolved': '#27ae60',
        'rejected': '#e74c3c'
    }
};

// Function to get the maps API URL
function getMapsAPIUrl() {
    return `https://maps.googleapis.com/maps/api/js?key=${MAPS_CONFIG.API_KEY}&libraries=places`;
}

// Function to update the API key
function updateAPIKey(newKey) {
    MAPS_CONFIG.API_KEY = newKey;
    console.log('API key updated. Please refresh the page for changes to take effect.');
}
