/**
 * Fixed implementation of OpenMapService geocoding functions
 * This addresses the DNS resolution errors with nominatim.openstreetmap.de
 */

// Cache successful results to reduce API calls
const geocodeCache = new Map();

/**
 * Perform a geocode search with multiple APIs and built-in fallbacks
 * @param {string} query Location to geocode
 * @returns {Promise<Array>} Array of location results with coordinates
 */
export const geocodeLocation = async (query) => {
  if (!query) return [];
  
  // Check cache first
  const cacheKey = query.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    console.log('Using cached geocode result for:', query);
    return geocodeCache.get(cacheKey);
  }

  console.log('Geocoding location:', query);
  
  // Try multiple geocoding services in sequence until one works
  const results = await tryMultipleGeocodingServices(query);
  
  // Cache successful results
  if (results && results.length > 0) {
    geocodeCache.set(cacheKey, results);
  }
  
  return results;
};

/**
 * Try multiple geocoding services in sequence
 * @param {string} query Location to geocode
 * @returns {Promise<Array>} Location results
 */
async function tryMultipleGeocodingServices(query) {
  // First try OpenStreetMap's primary server
  try {
    const osmResults = await searchWithOSM(query);
    if (osmResults && osmResults.length > 0) {
      console.log('OSM geocoding succeeded with', osmResults.length, 'results');
      return osmResults;
    }
  } catch (error) {
    console.warn('OSM geocoding failed:', error.message);
  }
  
  // Then try MapTiler (more reliable than BigDataCloud)
  try {
    const mapTilerResults = await searchWithMapTiler(query);
    if (mapTilerResults && mapTilerResults.length > 0) {
      console.log('MapTiler geocoding succeeded with', mapTilerResults.length, 'results');
      return mapTilerResults;
    }
  } catch (error) {
    console.warn('MapTiler geocoding failed:', error.message);
  }
  
  // Then try LocationIQ with updated API key
  try {
    const liqResults = await searchWithLocationIQ(query);
    if (liqResults && liqResults.length > 0) {
      console.log('LocationIQ geocoding succeeded with', liqResults.length, 'results');
      return liqResults;
    }
  } catch (error) {
    console.warn('LocationIQ geocoding failed:', error.message);
  }
  
  // Finally, try to extract any place names we can recognize
  console.log('All API geocoding attempts failed, trying place name matching');
  return extractPlaceCoordinates(query);
}

/**
 * Search with OpenStreetMap Nominatim API
 * @param {string} query Location query
 * @returns {Promise<Array>} Results
 */
async function searchWithOSM(query) {
  // Use only the primary server - avoid .de server with DNS issues
  const server = 'https://nominatim.openstreetmap.org';
  
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: 1,
    limit: 5,
    'accept-language': 'en',
    dedupe: 1
  });
  
  // Set up timeout to avoid hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    console.log(`Attempting OSM geocoding for "${query}" via ${server}`);
    const response = await fetch(`${server}/search?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Spotter Trip Planner App'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`OSM API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`OSM returned ${data.length} results`);
    
    return data.map(item => ({
      description: item.display_name,
      formatted_address: item.display_name,
      lat: item.lat,
      lng: item.lon,
      place_id: item.place_id,
      source: 'osm'
    }));
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Search with MapTiler Geocoding API (more reliable than BigDataCloud)
 * @param {string} query Location query
 * @returns {Promise<Array>} Results
 */
async function searchWithMapTiler(query) {
  const encodedQuery = encodeURIComponent(query);
  // Using MapTiler's free API key
  const url = `https://api.maptiler.com/geocoding/${encodedQuery}.json?key=yCM85lfPFcra71EaoAfs`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    console.log(`Attempting MapTiler geocoding for "${query}"`);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`MapTiler API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.features || data.features.length === 0) {
      console.log('MapTiler returned no results');
      return [];
    }
    
    console.log(`MapTiler returned ${data.features.length} results`);
    
    return data.features.map(feature => {
      const [lng, lat] = feature.center;
      return {
        description: feature.place_name,
        formatted_address: feature.place_name,
        lat: lat.toString(),
        lng: lng.toString(),
        place_id: `maptiler_${feature.id || Date.now()}`,
        source: 'maptiler'
      };
    });
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Search with LocationIQ Geocoding API
 * @param {string} query Location query
 * @returns {Promise<Array>} Results
 */
async function searchWithLocationIQ(query) {
  const encodedQuery = encodeURIComponent(query);
  // Using a fresh, valid API key
  const url = `https://us1.locationiq.com/v1/search?key=pk.13e4a3ade9845cc90db3b54c6a1b079b&q=${encodedQuery}&format=json`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    console.log(`Attempting LocationIQ geocoding for "${query}"`);
    const response = await fetch(url, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`LocationIQ API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`LocationIQ returned ${data.length} results`);
    
    return data.map(item => ({
      description: item.display_name,
      formatted_address: item.display_name,
      lat: item.lat,
      lng: item.lon,
      place_id: item.place_id || `liq_${Date.now()}`,
      source: 'locationiq'
    }));
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Fallback function to extract place coordinates from known locations
 * @param {string} query Location query
 * @returns {Array} Estimated coordinates
 */
function extractPlaceCoordinates(query) {
  const lowercaseQuery = query.toLowerCase();
  
  // Map of known locations
  const placesMap = {
    'new york': { lat: 40.7128, lng: -74.0060 },
    'los angeles': { lat: 34.0522, lng: -118.2437 },
    'chicago': { lat: 41.8781, lng: -87.6298 },
    'houston': { lat: 29.7604, lng: -95.3698 },
    'philadelphia': { lat: 39.9526, lng: -75.1652 },
    'phoenix': { lat: 33.4484, lng: -112.0740 },
    'san antonio': { lat: 29.4241, lng: -98.4936 },
    'san diego': { lat: 32.7157, lng: -117.1611 },
    'dallas': { lat: 32.7767, lng: -96.7970 },
    'san francisco': { lat: 37.7749, lng: -122.4194 },
    'seattle': { lat: 47.6062, lng: -122.3321 },
    'miami': { lat: 25.7617, lng: -80.1918 },
    'atlanta': { lat: 33.7490, lng: -84.3880 },
    'boston': { lat: 42.3601, lng: -71.0589 },
    'las vegas': { lat: 36.1699, lng: -115.1398 },
    'denver': { lat: 39.7392, lng: -104.9903 },
    'colorado': { lat: 39.1130, lng: -105.3589 },
    'texas': { lat: 31.9686, lng: -99.9018 },
    'california': { lat: 36.7783, lng: -119.4179 },
    'new jersey': { lat: 40.0583, lng: -74.4057 },
    'florida': { lat: 27.6648, lng: -81.5158 },
    'north dakota': { lat: 47.5514, lng: -101.0020 },
    'south dakota': { lat: 43.9695, lng: -99.9018 },
    'montana': { lat: 46.8797, lng: -110.3626 },
    'wyoming': { lat: 43.0760, lng: -107.2903 },
    'idaho': { lat: 44.0682, lng: -114.7420 },
    'washington': { lat: 47.7511, lng: -120.7401 },
    'oregon': { lat: 43.8041, lng: -120.5542 },
    'utah': { lat: 39.3210, lng: -111.0937 },
  };
  
  // Check for direct matches
  for (const [place, coords] of Object.entries(placesMap)) {
    if (lowercaseQuery.includes(place)) {
      console.log('Found place match for:', place);
      
      return [{
        description: query,
        formatted_address: query,
        lat: coords.lat.toString(),
        lng: coords.lng.toString(),
        place_id: `place_${Date.now()}`,
        estimated: true,
        source: 'estimated'
      }];
    }
  }
  
  // Special handling for rest areas or stops
  if (lowercaseQuery.includes('rest') || lowercaseQuery.includes('stop') || lowercaseQuery.includes('break')) {
    // Check for "near X" pattern
    for (const [place, coords] of Object.entries(placesMap)) {
      if (lowercaseQuery.includes('near ' + place)) {
        console.log('Found rest area near:', place);
        
        // Add slight randomness to coordinates for rest areas
        const lat = coords.lat + (Math.random() * 0.05 - 0.025);
        const lng = coords.lng + (Math.random() * 0.05 - 0.025);
        
        return [{
          description: `Rest area near ${place.charAt(0).toUpperCase() + place.slice(1)}`,
          formatted_address: query,
          lat: lat.toString(),
          lng: lng.toString(),
          place_id: `rest_${Date.now()}`,
          estimated: true,
          source: 'estimated'
        }];
      }
    }
  }
  
  // Default to center of US if no match found
  console.log('No place match found, using US center coordinates');
  return [{
    description: query,
    formatted_address: query,
    lat: '39.8283',
    lng: '-98.5795',
    place_id: `default_${Date.now()}`,
    estimated: true,
    source: 'estimated'
  }];
} 