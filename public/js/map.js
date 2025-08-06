let map;
let locations = [];
let markers = [];
let markersLayer;

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', initMap);



async function initMap() {
    try {
       
        const response = await fetch('/api/locations');
        const data = await response.json();
        locations = data.tennis_locations;
        
        

        // Initialize Leaflet map with US bounds and zoom restrictions
        map = L.map('map', {
            center: [39.8283, -98.5795], // Center of US
            zoom: 4,
            minZoom: 4,
            maxZoom: 18,
            maxBounds: [
                [20.0, -130.0],
                [50.0, -60.0]
            ],
            maxBoundsViscosity: 1.0
        });

        // Add tile layer with enhanced styling
        L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_satellite/{z}/{x}/{y}{r}.{ext}', {
            minZoom: 0,
            maxZoom: 20,
            attribution: '&copy; CNES, Distribution Airbus DS, © Airbus DS, © PlanetObserver (Contains Copernicus Data) | &copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            ext: 'jpg'
        }).addTo(map);

        // Create a layer group for markers
        markersLayer = L.layerGroup().addTo(map);

        // Add markers for each location
        addMarkersToMap();

        // Update location counter
        updateLocationCounter();

        // Populate location panel
        populateLocationPanel();

        // Set up floating search functionality
        setupFloatingSearch();

        // Set up floating interface interactions
        setupFloatingInterface();

        // Set up touch gestures for mobile
        setupTouchGestures();

    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

function addMarkersToMap() {
    markersLayer.clearLayers();
    markers = [];

    locations.forEach((location, index) => {
        const tennisIcon = L.divIcon({
            className: 'tennis-marker',
            html: '<div class="tennis-ball">🎾</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker(
            [location.coordinates.latitude, location.coordinates.longitude],
            { icon: tennisIcon }
        );

        const popupContent = `
            <div class="popup-content">
                <h3>${location.name}</h3>
                <p><strong>${location.city}, ${location.state}</strong></p>
                
            </div>
        `;

        marker.bindPopup(popupContent);
        markersLayer.addLayer(marker);
        markers.push({ marker, location, index });
    });
}

function updateLocationCounter() {
    const countElement = document.getElementById('location-count');
    countElement.textContent = locations.length;
}

function populateLocationPanel() {
    const listContainer = document.getElementById('location-list');
    listContainer.innerHTML = '';
    
    locations.forEach((location, index) => {
        const div = document.createElement('div');
        div.className = 'location-item';
        div.dataset.index = index;
        div.innerHTML = `
            <h4>${location.name}</h4>
            <p>${location.city}, ${location.state}</p>
            
        `;
        
        div.addEventListener('click', () => {
            const marker = markers[index];
            map.setView([location.coordinates.latitude, location.coordinates.longitude], 15);
            marker.marker.openPopup();
            
            // Highlight selected item
            document.querySelectorAll('.location-item').forEach(item => 
                item.classList.remove('selected'));
            div.classList.add('selected');
            
            // Close panel on mobile after selection
            if (window.innerWidth <= 768) {
                closeLocationPanel();
            }
        });
        
        listContainer.appendChild(div);
    });
}

function setupFloatingSearch() {
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm.length === 0) {
            searchResults.classList.remove('active');
            showAllMarkers();
            return;
        }
        
        if (searchTerm.length < 2) {
            return;
        }
        
        const filteredLocations = locations.filter(location => {
            const searchText = `${location.name} ${location.city} ${location.state}`.toLowerCase();
            return searchText.includes(searchTerm);
        });
        
        displaySearchResults(filteredLocations, searchTerm);
        filterMarkersOnMap(searchTerm);
    });
    
    // Enhanced click outside to close
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-overlay')) {
            searchResults.classList.remove('active');
        }
    });
    
    // Clear search on escape key
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchResults.classList.remove('active');
            showAllMarkers();
        }
    });
}

function displaySearchResults(filteredLocations, searchTerm) {
    const searchResults = document.getElementById('search-results');
    
    if (filteredLocations.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item"><p>No locations found</p></div>';
        searchResults.classList.add('active');
        return;
    }
    
    searchResults.innerHTML = '';
    
    filteredLocations.slice(0, 6).forEach(location => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        
        const nameHighlighted = highlightText(location.name, searchTerm);
        const cityStateHighlighted = highlightText(`${location.city}, ${location.state}`, searchTerm);
        
        div.innerHTML = `
            <h4>${nameHighlighted}</h4>
            <p>${cityStateHighlighted}</p>
        `;
        
        div.addEventListener('click', () => {
            map.setView([location.coordinates.latitude, location.coordinates.longitude], 15);
            
            const markerData = markers.find(m => m.location.name === location.name);
            if (markerData) {
                markerData.marker.openPopup();
            }
            
            searchInput.value = location.name;
            searchResults.classList.remove('active');
        });
        
        searchResults.appendChild(div);
    });
    
    searchResults.classList.add('active');
}

function highlightText(text, searchTerm) {
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark style="background: rgba(23, 173, 78, 0.2); padding: 1px 3px; border-radius: 3px; color:rgb(21, 135, 62); font-weight: 600;">$1</mark>');
}

function filterMarkersOnMap(searchTerm) {
    markersLayer.clearLayers();
    
    markers.forEach(({ marker, location }) => {
        const searchText = `${location.name} ${location.city} ${location.state}`.toLowerCase();
        
        if (searchText.includes(searchTerm)) {
            markersLayer.addLayer(marker);
        }
    });
    
    // Update counter with filtered results
    const filteredCount = markers.filter(({ location }) => {
        const searchText = `${location.name} ${location.city} ${location.state}`.toLowerCase();
        return searchText.includes(searchTerm);
    }).length;
    
    document.getElementById('location-count').textContent = filteredCount;
}

function showAllMarkers() {
    markersLayer.clearLayers();
    markers.forEach(({ marker }) => {
        markersLayer.addLayer(marker);
    });
    
    // Reset counter
    document.getElementById('location-count').textContent = locations.length;
}

function setupFloatingInterface() {
    const locationCounter = document.getElementById('location-counter');
    const locationPanel = document.getElementById('location-panel');
    const panelClose = document.getElementById('panel-close');
    const panelBackdrop = document.getElementById('panel-backdrop');
    // const filtersToggle = document.getElementById('filters-toggle');
    
    // Open location panel when clicking counter
    locationCounter.addEventListener('click', () => {
        openLocationPanel();
    });
    
    // Close panel
    panelClose.addEventListener('click', () => {
        closeLocationPanel();
    });
    
    // Close panel when clicking backdrop
    panelBackdrop.addEventListener('click', () => {
        closeLocationPanel();
    });
    
    // Filters toggle (placeholder for now)
    // filtersToggle.addEventListener('click', () => {
    //     // You can implement filter functionality here
    //     showFilterOptions();
    // });
    
    // Close panel on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && locationPanel.classList.contains('active')) {
            closeLocationPanel();
        }
    });
    
    // Add subtle parallax effect to floating elements
    let ticking = false;
    
    function updateParallax() {
        const scrolled = window.pageYOffset;
        const parallax = scrolled * 0.2;
        
        document.querySelector('.search-overlay').style.transform = 
            `translateX(-50%) translateY(${parallax}px)`;
        document.querySelector('.location-counter').style.transform = 
            `translateY(${-parallax * 0.5}px)`;
        // document.querySelector('.filters-toggle').style.transform = 
        //     `translateY(${parallax * 0.3}px)`;
        
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }
    
    window.addEventListener('scroll', requestTick);
}

function openLocationPanel() {
    const locationPanel = document.getElementById('location-panel');
    const panelBackdrop = document.getElementById('panel-backdrop');
    
    locationPanel.classList.add('active');
    panelBackdrop.classList.add('active');
    
    // Disable map interaction when panel is open
    if (map) {
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
    }
}

function closeLocationPanel() {
    const locationPanel = document.getElementById('location-panel');
    const panelBackdrop = document.getElementById('panel-backdrop');
    
    locationPanel.classList.remove('active');
    panelBackdrop.classList.remove('active');
    
    // Re-enable map interaction
    if (map) {
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
        map.boxZoom.enable();
        map.keyboard.enable();
    }
}

// function showFilterOptions() {
//     // Placeholder for filter functionality
//     // You can implement a filter modal or dropdown here
//     console.log('Filters clicked - implement filter functionality');
    
//     // Example: You could show a modal with filter options like:
//     // - Distance radius
//     // - Court type (indoor/outdoor)
//     // - Availability
//     // - Rating
    
//     // For now, let's show a simple alert
//     alert('Filter options coming soon!\n\nPlanned filters:\n• Distance from location\n• Court type\n• Operating hours\n• Amenities');
// }

function setupTouchGestures() {
    const locationPanel = document.getElementById('location-panel');
    const dragHandle = document.querySelector('.panel-drag-handle');
    
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    
    // Touch events for panel dragging
    dragHandle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
        locationPanel.style.transition = 'none';
    });
    
    dragHandle.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        
        currentY = e.touches[0].clientY;
        const diffY = currentY - startY;
        
        // Only allow dragging down
        if (diffY > 0) {
            const translateY = Math.min(diffY, window.innerHeight * 0.6);
            locationPanel.style.transform = `translateY(${translateY}px)`;
        }
    });
    
    dragHandle.addEventListener('touchend', () => {
        if (!isDragging) return;
        
        isDragging = false;
        locationPanel.style.transition = '';
        locationPanel.style.transform = '';
        
        const diffY = currentY - startY;
        
        // Close panel if dragged down more than 100px
        if (diffY > 100) {
            closeLocationPanel();
        }
    });
    
    // Prevent scrolling when touching the drag handle
    dragHandle.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
}

// Utility function to fit map to show all markers
function fitMapToMarkers() {
    if (markers.length > 0) {
        const group = new L.featureGroup(markers.map(m => m.marker));
        map.fitBounds(group.getBounds().pad(0.1));
    }
}

// Add smooth zoom to location function
function zoomToLocation(location, zoomLevel = 15) {
    if (map) {
        map.flyTo([location.coordinates.latitude, location.coordinates.longitude], zoomLevel, {
            animate: true,
            duration: 1.5
        });
    }
}

// Enhanced marker clustering for better performance with many locations
function addMarkerClustering() {
    // This would require MarkerCluster plugin
    // For now, we'll keep the simple approach
    // You can add this later: https://github.com/Leaflet/Leaflet.markercluster
}

// Add location search by proximity
function findNearbyLocations(lat, lng, radiusKm = 50) {
    return locations.filter(location => {
        const distance = calculateDistance(
            lat, lng,
            location.coordinates.latitude,
            location.coordinates.longitude
        );
        return distance <= radiusKm;
    });
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}