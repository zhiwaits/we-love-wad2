<template>
  <div class="location-picker">
    <div class="location-header">
      <h3>Select Event Location</h3>
      <p>Drag the map or click to pinpoint your event location</p>
    </div>

    <!-- Map Container -->
    <div class="map-container">
      <div ref="map" class="map"></div>
      <div v-if="loading" class="map-loading">
        <span>Loading map...</span>
      </div>
    </div>

    <!-- Location Display (Hidden - still recorded for backend) -->
    <!-- Address is captured internally but not shown to user -->

    <!-- Search Bar -->
    <div class="search-section">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search for a location (e.g., 'SMU', 'Marina Bay')"
        class="search-input"
        @keydown.enter.prevent="searchLocation"
      />
      <button type="button" @click="searchLocation" class="btn-search" :disabled="!searchQuery.trim()">
        Search
      </button>
      <button type="button" @click="getCurrentLocation" class="btn-location" title="Use current location">
        📍 Current Location
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

// Props and emits
const props = defineProps({
  initialLat: {
    type: Number,
    default: 1.3521 // Singapore default
  },
  initialLng: {
    type: Number,
    default: 103.8198 // Singapore default
  }
});

const emit = defineEmits(['location-selected']);

// Refs
const map = ref(null);
const latitude = ref(props.initialLat);
const longitude = ref(props.initialLng);
const address = ref('');
const searchQuery = ref('');
const error = ref('');
const loading = ref(true);

let googleMap;
let marker;
let geocoder;

// Initialize Google Map
onMounted(async () => {
  try {
    // Ensure Google Maps API is loaded
    if (!window.google?.maps) {
      error.value = 'Google Maps API is not loaded. Please check your API key configuration.';
      loading.value = false;
      return;
    }

    const { Map } = window.google.maps;
    geocoder = new window.google.maps.Geocoder();

    // Create map
    googleMap = new Map(map.value, {
      zoom: 14,
      center: { lat: props.initialLat, lng: props.initialLng },
      mapTypeId: window.google.maps.MapTypeId.ROADMAP,
      fullscreenControl: true,
      zoomControl: true,
      mapTypeControl: true,
      streetViewControl: false
    });

    // Create draggable marker
    const { Marker } = window.google.maps;
    marker = new Marker({
      position: { lat: props.initialLat, lng: props.initialLng },
      map: googleMap,
      draggable: true,
      title: 'Drag to select location'
    });

    // Update coordinates when marker is dragged
    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      latitude.value = pos.lat().toFixed(6);
      longitude.value = pos.lng().toFixed(6);
      googleMap.panTo(pos);
      reverseGeocode(pos);
      emitLocationSelected(true);  // User action: dragging marker
    });

    // Allow clicking on map to place marker
    googleMap.addListener('click', (event) => {
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      latitude.value = lat.toFixed(6);
      longitude.value = lng.toFixed(6);
      
      marker.setPosition({ lat, lng });
      googleMap.panTo({ lat, lng });
      reverseGeocode({ lat, lng });
      emitLocationSelected(true);  // User action: clicking on map
    });

    // Initial address lookup
    reverseGeocode({ lat: props.initialLat, lng: props.initialLng });
    loading.value = false;
  } catch (err) {
    console.error('Error initializing map:', err);
    error.value = 'Failed to initialize map. Please try refreshing the page.';
    loading.value = false;
  }
});

// Reverse geocode: convert coordinates to address
const reverseGeocode = async (latlng) => {
  if (!geocoder) return;

  try {
    geocoder.geocode({ location: latlng }, (results, status) => {
      if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
        address.value = results[0].formatted_address;
      }
    });
  } catch (err) {
    console.error('Reverse geocoding error:', err);
  }
};

// Search for location by name
const searchLocation = async () => {
  if (!searchQuery.value.trim() || !geocoder) return;

  try {
    error.value = '';
    geocoder.geocode({ address: searchQuery.value }, (results, status) => {
      if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
        const location = results[0].geometry.location;
        const lat = location.lat();
        const lng = location.lng();

        latitude.value = lat.toFixed(6);
        longitude.value = lng.toFixed(6);
        address.value = results[0].formatted_address;

        marker.setPosition({ lat, lng });
        googleMap.setCenter({ lat, lng });
        googleMap.setZoom(15);

        searchQuery.value = '';
        emitLocationSelected(true);  // User action: searching location
      } else {
        error.value = 'Location not found. Please try another search.';
      }
    });
  } catch (err) {
    console.error('Search error:', err);
    error.value = 'Search failed. Please try again.';
  }
};

// Get user's current location
const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    error.value = 'Geolocation is not supported by your browser.';
    return;
  }

  error.value = '';
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      latitude.value = lat.toFixed(6);
      longitude.value = lng.toFixed(6);

      marker.setPosition({ lat, lng });
      googleMap.setCenter({ lat, lng });
      googleMap.setZoom(15);

      reverseGeocode({ lat, lng });
      emitLocationSelected(true);  // User action: using current location
    },
    (err) => {
      console.error('Geolocation error:', err);
      error.value = 'Could not get your current location. Please check permissions.';
    }
  );
};

// Watch for prop changes (when parent updates initialLat/initialLng)
watch([() => props.initialLat, () => props.initialLng], ([newLat, newLng]) => {
  if (googleMap && marker && newLat && newLng) {
    // Update map and marker to new coordinates
    const newPos = { lat: newLat, lng: newLng };
    latitude.value = newLat;
    longitude.value = newLng;
    marker.setPosition(newPos);
    googleMap.setCenter(newPos);
    googleMap.setZoom(15);
    reverseGeocode(newPos);
    // Don't emit here - this is initialization, not user action
  }
}, { immediate: false });

// Update marker from input (if user manually edits)
const updateMarkerFromInput = () => {
  const lat = parseFloat(latitude.value);
  const lng = parseFloat(longitude.value);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    marker.setPosition({ lat, lng });
    googleMap.panTo({ lat, lng });
    reverseGeocode({ lat, lng });
    emitLocationSelected();
  } else {
    error.value = 'Invalid coordinates. Please enter valid latitude and longitude.';
  }
};

// Emit selected location
const emitLocationSelected = (isUserAction = false) => {
  const lat = parseFloat(latitude.value);
  const lng = parseFloat(longitude.value);
  emit('location-selected', {
    latitude: lat,
    altitude: lng,
    address: address.value,
    isUserAction: isUserAction
  });
};

// Expose methods for parent component
defineExpose({
  getCoordinates: () => ({
    latitude: parseFloat(latitude.value),
    altitude: parseFloat(longitude.value),
    address: address.value
  })
});
</script>

<style scoped>
.location-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-16, 16px);
  padding: var(--space-16, 16px);
  background: var(--color-surface, #fff);
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border, #d9d9d9);
}

.location-header {
  display: flex;
  flex-direction: column;
  gap: var(--space-8, 8px);
}

.location-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text);
}

.location-header p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.map-container {
  position: relative;
  width: 100%;
  height: 400px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #d9d9d9);
  overflow: hidden;
  background: #f5f5f5;
}

.map {
  width: 100%;
  height: 100%;
}

.map-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 10;
}

.map-loading span {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}

.coordinates-display {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-12, 12px);
}

.address-display {
  grid-column: 1 / -1;
}

.coord-group,
.address-display {
  display: flex;
  flex-direction: column;
  gap: var(--space-6, 6px);
}

.coord-group label,
.address-display label {
  font-weight: var(--font-weight-medium, 500);
  font-size: 0.85rem;
  color: var(--color-text);
}

.coord-group input,
.address-display input {
  padding: var(--space-8, 8px) var(--space-12, 12px);
  border: 1px solid var(--color-border, #d9d9d9);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--color-text);
  background: var(--color-background, #f9fafb);
  cursor: default;
}

.search-section {
  display: flex;
  gap: var(--space-10, 10px);
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: var(--space-10, 10px) var(--space-14, 14px);
  border: 1px solid var(--color-border, #d9d9d9);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--color-text);
  background: var(--color-background, #f9fafb);
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.btn-search,
.btn-location {
  padding: var(--space-10, 10px) var(--space-16, 16px);
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.btn-search {
  background: var(--color-primary, #2563eb);
  color: white;
}

.btn-search:hover:not(:disabled) {
  background: #1e4fd6;
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.btn-search:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-location {
  background: transparent;
  border: 1px solid var(--color-border, #d9d9d9);
  color: var(--color-text);
}

.btn-location:hover {
  background: var(--color-background, #f9fafb);
  border-color: var(--color-primary, #2563eb);
}

.error-message {
  padding: var(--space-12, 12px) var(--space-14, 14px);
  background: rgba(220, 38, 38, 0.1);
  color: #991b1b;
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: 8px;
  font-size: 0.85rem;
}

@media (max-width: 640px) {
  .map-container {
    height: 300px;
  }

  .coordinates-display {
    grid-template-columns: 1fr;
  }

  .search-section {
    flex-direction: column;
  }

  .search-input {
    min-width: auto;
  }

  .btn-search,
  .btn-location {
    flex: 1;
  }
}
</style>
