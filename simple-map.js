// Simple Map Loader - Alternative approach using OpenStreetMap
// This is a simpler, more reliable map solution

(function() {
    'use strict';
    
    // Simple map initialization using OpenStreetMap
    window.initSimpleMap = function(mapId, centerLat, centerLng, zoom = 12, markers = []) {
        // Check if Leaflet is available
        if (typeof L === 'undefined') {
            console.log('Leaflet not loaded, using fallback map');
            initFallbackMap(mapId, centerLat, centerLng, markers);
            return null;
        }
        
        try {
            const mapElement = document.getElementById(mapId);
            if (!mapElement) {
                console.error('Map element not found:', mapId);
                return null;
            }
            
            // Wait for element to have dimensions
            if (mapElement.offsetHeight === 0) {
                setTimeout(() => window.initSimpleMap(mapId, centerLat, centerLng, zoom, markers), 200);
                return null;
            }
            
            // Create map
            const map = L.map(mapId, {
                zoomControl: true,
                preferCanvas: false
            }).setView([centerLat, centerLng], zoom);
            
            // Add tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);
            
            // Add markers
            if (markers && markers.length > 0) {
                markers.forEach(marker => {
                    if (marker.lat && marker.lng) {
                        const m = L.marker([marker.lat, marker.lng]).addTo(map);
                        if (marker.popup) {
                            m.bindPopup(marker.popup);
                        }
                    }
                });
                
                // Fit bounds if multiple markers
                if (markers.length > 1) {
                    const group = new L.featureGroup(markers.map(m => 
                        L.marker([m.lat, m.lng])
                    ));
                    map.fitBounds(group.getBounds().pad(0.1));
                }
            }
            
            // Invalidate size
            setTimeout(() => {
                if (map) {
                    map.invalidateSize(true);
                }
            }, 300);
            
            return map;
        } catch (error) {
            console.error('Error initializing map:', error);
            initFallbackMap(mapId, centerLat, centerLng, markers);
            return null;
        }
    };
    
    // Fallback map using static image with clickable coordinates
    function initFallbackMap(mapId, centerLat, centerLng, markers) {
        const mapElement = document.getElementById(mapId);
        if (!mapElement) return;
        
        // Create a simple static map using OpenStreetMap static image
        const zoom = 13;
        const size = '800x400';
        const url = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng-0.1},${centerLat-0.1},${centerLng+0.1},${centerLat+0.1}&layer=mapnik&marker=${centerLat},${centerLng}`;
        
        mapElement.innerHTML = `
            <iframe 
                width="100%" 
                height="100%" 
                frameborder="0" 
                scrolling="no" 
                marginheight="0" 
                marginwidth="0" 
                src="${url}"
                style="border: 1px solid #ccc; border-radius: 10px;">
            </iframe>
            <div style="padding: 10px; background: #f8f9fa; border-radius: 0 0 10px 10px; text-align: center; color: #666; font-size: 0.9rem;">
                <i class="fas fa-map-marker-alt"></i> Map showing work locations
            </div>
        `;
    }
    
    // Wait for Leaflet with timeout
    function waitForLeaflet(callback, timeout = 5000) {
        const start = Date.now();
        const check = setInterval(() => {
            if (typeof L !== 'undefined' && window.leafletLoaded) {
                clearInterval(check);
                callback();
            } else if (Date.now() - start > timeout) {
                clearInterval(check);
                console.log('Leaflet timeout, using fallback');
                callback(); // Continue anyway
            }
        }, 100);
    }
    
    // Make function available globally
    window.waitForLeaflet = waitForLeaflet;
})();

