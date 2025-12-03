// Static Map Solution - No JavaScript libraries required
// Uses static map images and simple HTML/CSS

(function() {
    'use strict';
    
    // Initialize static map (no dependencies)
    window.initStaticMap = function(mapId, centerLat, centerLng, zoom = 12, markers = []) {
        const mapElement = document.getElementById(mapId);
        if (!mapElement) {
            console.error('Map element not found:', mapId);
            return null;
        }
        
        try {
            // Method 1: Try Google Maps Static API (if key available)
            if (typeof MAPS_CONFIG !== 'undefined' && MAPS_CONFIG.API_KEY) {
                return initGoogleStaticMap(mapElement, centerLat, centerLng, zoom, markers);
            }
            
            // Method 2: Use OpenStreetMap static image
            return initOSMStaticMap(mapElement, centerLat, centerLng, zoom, markers);
            
        } catch (error) {
            console.error('Error initializing static map:', error);
            // Fallback to simple display
            mapElement.innerHTML = createFallbackMap(centerLat, centerLng, markers);
            return null;
        }
    };
    
    // Google Maps Static API
    function initGoogleStaticMap(element, centerLat, centerLng, zoom, markers) {
        let url = `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=${zoom}&size=800x500&maptype=roadmap`;
        
        // Add markers
        if (markers && markers.length > 0) {
            markers.forEach((marker, index) => {
                const color = getMarkerColor(index);
                url += `&markers=color:${color}|${marker.lat},${marker.lng}`;
            });
        } else {
            // Add center marker
            url += `&markers=color:red|${centerLat},${centerLng}`;
        }
        
        url += `&key=${MAPS_CONFIG.API_KEY}`;
        
        element.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; border-radius: 15px; overflow: hidden;">
                <img src="${url}" 
                     alt="Map" 
                     style="width: 100%; height: 100%; object-fit: cover; border-radius: 15px;"
                     onerror="this.onerror=null; this.parentElement.innerHTML='${createFallbackMap(centerLat, centerLng, markers)}'">
                <div style="position: absolute; bottom: 10px; right: 10px; background: rgba(255,255,255,0.9); padding: 8px 12px; border-radius: 5px; font-size: 0.85rem; color: #666;">
                    <i class="fas fa-map-marker-alt"></i> ${markers.length || 1} location(s)
                </div>
            </div>
        `;
        
        return { type: 'static', url: url };
    }
    
    // OpenStreetMap Static (using Nominatim)
    function initOSMStaticMap(element, centerLat, centerLng, zoom, markers) {
        // Use OpenStreetMap embed with coordinates
        const bbox = calculateBoundingBox(centerLat, centerLng, markers, zoom);
        const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}&layer=mapnik&marker=${centerLat},${centerLng}`;
        
        element.innerHTML = `
            <div style="position: relative; width: 100%; height: 100%; border-radius: 15px; overflow: hidden;">
                <iframe 
                    width="100%" 
                    height="100%" 
                    frameborder="0" 
                    scrolling="no" 
                    marginheight="0" 
                    marginwidth="0" 
                    src="${embedUrl}"
                    style="border: none; border-radius: 15px;">
                </iframe>
                <div style="position: absolute; bottom: 10px; left: 10px; right: 10px; background: rgba(255,255,255,0.95); padding: 10px; border-radius: 8px; font-size: 0.9rem; color: #2c3e50; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span><i class="fas fa-map-marker-alt" style="color: #27ae60;"></i> <strong>${markers.length || 1}</strong> work location(s)</span>
                        <a href="https://www.openstreetmap.org/?mlat=${centerLat}&mlon=${centerLng}&zoom=${zoom}" 
                           target="_blank" 
                           style="color: #27ae60; text-decoration: none; font-weight: 600;">
                            <i class="fas fa-external-link-alt"></i> View on OpenStreetMap
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        return { type: 'iframe', url: embedUrl };
    }
    
    // Calculate bounding box for markers
    function calculateBoundingBox(centerLat, centerLng, markers, zoom) {
        if (markers && markers.length > 0) {
            let minLat = markers[0].lat;
            let maxLat = markers[0].lat;
            let minLng = markers[0].lng;
            let maxLng = markers[0].lng;
            
            markers.forEach(marker => {
                minLat = Math.min(minLat, marker.lat);
                maxLat = Math.max(maxLat, marker.lat);
                minLng = Math.min(minLng, marker.lng);
                maxLng = Math.max(maxLng, marker.lng);
            });
            
            // Add padding
            const latPadding = (maxLat - minLat) * 0.2 || 0.05;
            const lngPadding = (maxLng - minLng) * 0.2 || 0.05;
            
            return {
                minLat: minLat - latPadding,
                maxLat: maxLat + latPadding,
                minLng: minLng - lngPadding,
                maxLng: maxLng + lngPadding
            };
        }
        
        // Default bounding box around center
        const padding = 0.05;
        return {
            minLat: centerLat - padding,
            maxLat: centerLat + padding,
            minLng: centerLng - padding,
            maxLng: centerLng + padding
        };
    }
    
    // Fallback map display
    function createFallbackMap(centerLat, centerLng, markers) {
        const markerList = markers && markers.length > 0 
            ? markers.map((m, i) => `<li style="margin: 0.5rem 0;"><i class="fas fa-map-pin" style="color: #27ae60;"></i> Location ${i + 1}: ${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}</li>`).join('')
            : `<li><i class="fas fa-map-pin" style="color: #27ae60;"></i> Center: ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}</li>`;
        
        return `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); border-radius: 15px;">
                <i class="fas fa-map" style="font-size: 4rem; color: #27ae60; margin-bottom: 1.5rem;"></i>
                <h3 style="color: #2c3e50; margin-bottom: 1rem;">Work Locations</h3>
                <ul style="list-style: none; padding: 0; text-align: left; background: white; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); min-width: 300px;">
                    ${markerList}
                </ul>
                <p style="margin-top: 1.5rem; color: #666; font-size: 0.9rem;">
                    <a href="https://www.google.com/maps?q=${centerLat},${centerLng}" 
                       target="_blank" 
                       style="color: #27ae60; text-decoration: none; font-weight: 600;">
                        <i class="fas fa-external-link-alt"></i> Open in Google Maps
                    </a>
                </p>
            </div>
        `;
    }
    
    // Get marker color for Google Maps
    function getMarkerColor(index) {
        const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple'];
        return colors[index % colors.length];
    }
    
    console.log('Static map solution loaded');
})();

