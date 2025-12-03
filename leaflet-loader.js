// Leaflet Loader - Loads Leaflet with fallback CDNs (non-blocking)
(function() {
    'use strict';
    
    function loadLeafletScript(src, onSuccess, onError) {
        const script = document.createElement('script');
        script.src = src;
        script.async = true; // Make it async so it doesn't block
        script.onload = function() {
            setTimeout(function() {
                if (typeof L !== 'undefined') {
                    console.log('Leaflet loaded successfully from:', src);
                    window.leafletLoaded = true;
                    if (onSuccess) onSuccess();
                } else {
                    if (onError) onError();
                }
            }, 100);
        };
        script.onerror = function() {
            console.warn('Failed to load from:', src);
            if (onError) onError();
        };
        document.head.appendChild(script);
    }
    
    function loadLeafletCSS(src, onError) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = src;
        link.onerror = function() {
            if (onError) onError();
        };
        document.head.appendChild(link);
    }
    
    // Load CSS first
    const cssUrls = [
        'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    ];
    
    let cssIndex = 0;
    function tryLoadCSS() {
        if (cssIndex >= cssUrls.length) {
            console.warn('All CSS CDNs failed, continuing anyway...');
            tryLoadJS();
            return;
        }
        
        loadLeafletCSS(cssUrls[cssIndex], function() {
            cssIndex++;
            tryLoadCSS();
        });
        
        // Try JS after a short delay
        setTimeout(tryLoadJS, 100);
    }
    
    // Load JS
    const jsUrls = [
        'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js',
        'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js'
    ];
    
    let jsIndex = 0;
    function tryLoadJS() {
        if (typeof L !== 'undefined' && window.leafletLoaded) {
            console.log('Leaflet already loaded');
            return;
        }
        
        if (jsIndex >= jsUrls.length) {
            console.error('All Leaflet CDNs failed');
            document.body.insertAdjacentHTML('afterbegin', 
                '<div style="position:fixed;top:0;left:0;right:0;background:#e74c3c;color:white;padding:15px;text-align:center;z-index:10000;">' +
                '⚠️ Map library failed to load. Please check your internet connection and refresh the page.' +
                '</div>');
            return;
        }
        
        loadLeafletScript(
            jsUrls[jsIndex],
            function() {
                // Success
                console.log('Leaflet loaded and ready');
            },
            function() {
                jsIndex++;
                tryLoadJS();
            }
        );
    }
    
    // Start loading after a short delay to not block page rendering
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(tryLoadCSS, 100);
        });
    } else {
        setTimeout(tryLoadCSS, 100);
    }
})();

