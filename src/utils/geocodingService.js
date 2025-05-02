import { searchLocations } from './openMapService';
import { geocodeLocation } from './openMapServiceFix';

/**
 * Utility to automatically fetch coordinates for location text
 * This helps ensure that all locations have valid coordinates
 * without requiring manual intervention from the user
 */

// Configure API endpoints
const GEOCODING_CONFIG = {
  // Remove the problematic .de server and use only the main server
  nominatimServers: ['https://nominatim.openstreetmap.org'],
  // LocationIQ API key (free tier)
  locationIqApiKey: 'pk.13e4a3ade9845cc90db3b54c6a1b079b', 
  // Timeout for API requests in milliseconds
  requestTimeout: 6000
};

/**
 * Utility function to ensure coordinates are valid strings
 * @param {*} coord The coordinate value which might be a string, number or undefined
 * @returns {string|null} A properly formatted coordinate string or null if invalid
 */
const normalizeCoordinate = (coord) => {
  if (coord === undefined || coord === null) return null;
  
  // If it's already a string, clean it up
  if (typeof coord === 'string') {
    // Remove any non-numeric characters except decimal point and negative sign
    const cleaned = coord.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    
    if (!isNaN(parsed) && parsed !== 0) {
      return parsed.toString();
    }
    return null;
  }
  
  // If it's a number, convert to string
  if (typeof coord === 'number' && !isNaN(coord) && coord !== 0) {
    return coord.toString();
  }
  
  return null;
};

/**
 * Get coordinates for a text location
 * @param {string} locationText - The location text to geocode
 * @returns {Promise<Object>} - Promise that resolves to location data with coordinates
 */
export const getCoordinatesForLocation = async (locationText) => {
  if (!locationText || typeof locationText !== 'string' || locationText.trim() === '') {
    console.log('Invalid location text provided:', locationText);
    return null;
  }

  console.log('Attempting to get coordinates for:', locationText);

  try {
    // Use our improved geocoding service with multiple fallbacks
    const results = await geocodeLocation(locationText);
    
    // Check if we got valid results
    if (results && results.length > 0) {
      const result = results[0];
      
      // Validate and normalize coordinates
      const lat = normalizeCoordinate(result.lat);
      const lng = normalizeCoordinate(result.lng);
      
      if (lat && lng) {
        console.log('Successfully found coordinates via enhanced geocoding:', 
          lat, lng, result.source || 'unknown source');
        
        return {
          formatted_address: result.formatted_address || result.description,
          lat: lat,
          lng: lng,
          place_id: result.place_id || `geocode_${Date.now()}`,
          estimated: result.estimated || false
        };
      }
    }
    
    console.warn('Enhanced geocoding failed for location:', locationText);
    
    // Try the original implementation as a last resort
    return await legacyGetCoordinates(locationText);
  } catch (error) {
    console.error('Error in enhanced geocoding for location:', locationText, error);
    // Try the legacy implementation as fallback
    return await legacyGetCoordinates(locationText);
  }
};

/**
 * Legacy implementation of geocoding as a last-resort fallback
 * @param {string} locationText 
 * @returns {Promise<Object>}
 */
async function legacyGetCoordinates(locationText) {
  try {
    // First, try with the DirectGeocoding API (simple and reliable)
    const directGeocodingResult = await getDirectGeocoding(locationText);
    if (directGeocodingResult) {
      console.log('Successfully found coordinates via legacy direct geocoding:', 
        directGeocodingResult.lat, directGeocodingResult.lng);
      return directGeocodingResult;
    }
    
    // If direct geocoding fails, try with OpenStreetMap API
    // Search for the location using the openMapService
    const results = await searchLocations(locationText);
    
    // Use the first result if available
    if (results && results.length > 0) {
      const firstResult = results[0];
      
      // Validate that we have actual coordinates
      const lat = normalizeCoordinate(firstResult.lat);
      const lng = normalizeCoordinate(firstResult.lng);
      
      if (lat && lng) {
        console.log('Successfully found coordinates via legacy search:', lat, lng);
        
        return {
          formatted_address: firstResult.description || firstResult.formatted_address,
          lat: lat,
          lng: lng,
          place_id: firstResult.place_id || firstResult.osm_id
        };
      }
    }
    
    // Try the fallback geocoding API
    return await getFallbackCoordinates(locationText);
  } catch (error) {
    console.error('Error in legacy geocoding:', error);
    // Last resort: estimated coordinates
    return getEstimatedCoordinates(locationText);
  }
}

/**
 * Try a more direct geocoding service that's simpler and more reliable
 * @param {string} locationText 
 * @returns {Promise<Object>} Coordinates from geocoding
 */
async function getDirectGeocoding(locationText) {
  try {
    console.log('Trying direct geocoding for:', locationText);
    
    // Use BigDataCloud Reverse Geocoding API (free tier with no key required)
    const encodedLocation = encodeURIComponent(locationText);
    const url = `https://api.bigdatacloud.net/data/geocoding-api?localityLanguage=en&key=bdc_278cfb31bef24c1dbbf6c7df619dab65&address=${encodedLocation}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEOCODING_CONFIG.requestTimeout);
    
    try {
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Direct geocoding API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.latitude && data.longitude) {
        return {
          formatted_address: data.locality || data.formattedAddress || locationText,
          lat: data.latitude.toString(),
          lng: data.longitude.toString(),
          place_id: `direct_${Date.now()}`
        };
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      // If the fetch fails, we'll continue to the next method
      console.warn('Direct geocoding fetch failed:', fetchError.message);
    }
    
    return null;
  } catch (error) {
    console.warn('Direct geocoding error:', error);
    return null;
  }
}

/**
 * Try a fallback geocoding API when OpenStreetMap fails
 * @param {string} locationText 
 * @returns {Promise<Object>} Coordinates from fallback API
 */
async function getFallbackCoordinates(locationText) {
  try {
    console.log('Trying fallback geocoding API for:', locationText);
    
    // First try with LocationIQ which is very reliable
    const apiKey = GEOCODING_CONFIG.locationIqApiKey;
    const encodedLocation = encodeURIComponent(locationText);
    const url = `https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${encodedLocation}&format=json`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEOCODING_CONFIG.requestTimeout);
    
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.length > 0) {
          const result = data[0];
          console.log('Fallback API found result:', result);
          
          return {
            formatted_address: result.display_name || locationText,
            lat: result.lat,
            lng: result.lon || result.lng,
            place_id: result.place_id || `locationiq_${Date.now()}`
          };
        }
      } else {
        console.warn(`LocationIQ API error: ${response.status}`);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.warn('LocationIQ fetch failed:', fetchError.message);
    }
    
    // Try a second fallback with the newer Geoapify service
    try {
      const geoapifyUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodedLocation}&format=json&apiKey=b41daad836af4a2e8b0a44149e8b4314`;
      
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), GEOCODING_CONFIG.requestTimeout);
      
      const geoResponse = await fetch(geoapifyUrl, { signal: controller2.signal });
      clearTimeout(timeoutId2);
      
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        
        if (geoData && geoData.results && geoData.results.length > 0) {
          const geoResult = geoData.results[0];
          console.log('Geoapify API found result:', geoResult);
          
          return {
            formatted_address: geoResult.formatted || locationText,
            lat: geoResult.lat.toString(),
            lng: geoResult.lon.toString(),
            place_id: `geoapify_${Date.now()}`
          };
        }
      }
    } catch (geoError) {
      console.warn('Geoapify geocoding error:', geoError);
    }
    
    // If all APIs fail, use estimated coordinates
    console.log('All geocoding APIs failed, using estimation for:', locationText);
    return getEstimatedCoordinates(locationText);
  } catch (error) {
    console.error('Fallback geocoding API error:', error);
    // Last resort - use estimated coordinates
    return getEstimatedCoordinates(locationText);
  }
}

/**
 * Fallback geocoding using a simple coordinate estimation
 * Only use this for testing or when the main service fails
 * @param {string} locationText 
 * @returns {Object} Estimated coordinates
 */
const getEstimatedCoordinates = (locationText) => {
  // This is a very simplified fallback that returns coordinates
  // based on common US cities or regions as a last resort
  const cityMap = {
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
    'colorado': { lat: 39.1130, lng: -105.3589 }, // Center of Colorado
    'texas': { lat: 31.9686, lng: -99.9018 },  // Center of Texas
    'california': { lat: 36.7783, lng: -119.4179 }, // Center of California
    'new jersey': { lat: 40.0583, lng: -74.4057 },
    'florida': { lat: 27.6648, lng: -81.5158 },
  };
  
  const lowercaseText = locationText.toLowerCase();
  
  // Check if the location text contains any of our known cities or states
  for (const [place, coords] of Object.entries(cityMap)) {
    if (lowercaseText.includes(place)) {
      console.log('Using estimated coordinates for:', place);
      return {
        formatted_address: locationText,
        lat: coords.lat.toString(),
        lng: coords.lng.toString(),
        estimated: true
      };
    }
  }
  
  // Try to detect common location types
  if (lowercaseText.includes('rest') || lowercaseText.includes('stop') || lowercaseText.includes('break')) {
    // For rest areas/stops, try to find nearby cities/states
    for (const [place, coords] of Object.entries(cityMap)) {
      if (lowercaseText.includes('near ' + place)) {
        console.log('Using estimated rest area coordinates near:', place);
        // Slightly offset the coordinates to simulate a rest area
        return {
          formatted_address: `Rest area near ${place.charAt(0).toUpperCase() + place.slice(1)}`,
          lat: (coords.lat + (Math.random() * 0.05 - 0.025)).toString(),
          lng: (coords.lng + (Math.random() * 0.05 - 0.025)).toString(),
          estimated: true
        };
      }
    }
  }
  
  // If we can't match a city, use coordinates in the center of the US
  return {
    formatted_address: locationText,
    lat: '39.8283',  // Center of the US
    lng: '-98.5795',
    estimated: true
  };
};

/**
 * Enriches trip data with coordinates for all locations
 * @param {Object} tripData - The trip data to enrich
 * @returns {Promise<Object>} - Promise that resolves to enriched trip data
 */
export const enrichTripWithCoordinates = async (tripData) => {
  if (!tripData) return tripData;
  
  console.log('Enriching trip data with coordinates:', tripData);
  
  const enrichedTrip = { ...tripData };
  
  // Process current location
  if (tripData.current_location) {
    console.log('Processing current location:', tripData.current_location);
    
    const locationData = await getCoordinatesForLocation(tripData.current_location);
    
    if (locationData) {
      enrichedTrip.current_location_formatted = locationData.formatted_address;
      enrichedTrip.current_location_lat = locationData.lat;
      enrichedTrip.current_location_lng = locationData.lng;
      console.log('Updated current location coordinates:', locationData.lat, locationData.lng);
    } else {
      // Fallback to estimated coordinates if necessary
      console.log('Using fallback for current location');
      const fallbackData = getEstimatedCoordinates(tripData.current_location);
      enrichedTrip.current_location_formatted = fallbackData.formatted_address;
      enrichedTrip.current_location_lat = fallbackData.lat;
      enrichedTrip.current_location_lng = fallbackData.lng;
    }
  }
  
  // Process pickup location
  if (tripData.pickup_location) {
    console.log('Processing pickup location:', tripData.pickup_location);
    
    const locationData = await getCoordinatesForLocation(tripData.pickup_location);
    
    if (locationData) {
      enrichedTrip.pickup_location_formatted = locationData.formatted_address;
      enrichedTrip.pickup_location_lat = locationData.lat;
      enrichedTrip.pickup_location_lng = locationData.lng;
      console.log('Updated pickup location coordinates:', locationData.lat, locationData.lng);
    } else {
      // Fallback to estimated coordinates if necessary
      console.log('Using fallback for pickup location');
      const fallbackData = getEstimatedCoordinates(tripData.pickup_location);
      enrichedTrip.pickup_location_formatted = fallbackData.formatted_address;
      enrichedTrip.pickup_location_lat = fallbackData.lat;
      enrichedTrip.pickup_location_lng = fallbackData.lng;
    }
  }
  
  // Process dropoff location
  if (tripData.dropoff_location) {
    console.log('Processing dropoff location:', tripData.dropoff_location);
    
    const locationData = await getCoordinatesForLocation(tripData.dropoff_location);
    
    if (locationData) {
      enrichedTrip.dropoff_location_formatted = locationData.formatted_address;
      enrichedTrip.dropoff_location_lat = locationData.lat;
      enrichedTrip.dropoff_location_lng = locationData.lng;
      console.log('Updated dropoff location coordinates:', locationData.lat, locationData.lng);
    } else {
      // Fallback to estimated coordinates if necessary
      console.log('Using fallback for dropoff location');
      const fallbackData = getEstimatedCoordinates(tripData.dropoff_location);
      enrichedTrip.dropoff_location_formatted = fallbackData.formatted_address;
      enrichedTrip.dropoff_location_lat = fallbackData.lat;
      enrichedTrip.dropoff_location_lng = fallbackData.lng;
    }
  }
  
  // Also process any stops if they exist
  if (tripData.stops && Array.isArray(tripData.stops)) {
    console.log('Processing stops:', tripData.stops.length);
    
    const enrichedStops = await Promise.all(
      tripData.stops.map(async (stop, index) => {
        const enrichedStop = { ...stop };
        
        if (stop.location) {
          console.log(`Processing stop ${index}:`, stop.location);
          
          const locationData = await getCoordinatesForLocation(stop.location);
          
          if (locationData) {
            enrichedStop.location_formatted = locationData.formatted_address;
            enrichedStop.lat = locationData.lat;
            enrichedStop.lng = locationData.lng;
            console.log(`Updated stop ${index} coordinates:`, locationData.lat, locationData.lng);
          } else {
            // Fallback to estimated coordinates if necessary
            console.log(`Using fallback for stop ${index}`);
            const fallbackData = getEstimatedCoordinates(stop.location);
            enrichedStop.location_formatted = fallbackData.formatted_address;
            enrichedStop.lat = fallbackData.lat;
            enrichedStop.lng = fallbackData.lng;
          }
        }
        
        return enrichedStop;
      })
    );
    
    enrichedTrip.stops = enrichedStops;
  }
  
  console.log('Enriched trip data:', enrichedTrip);
  return enrichedTrip;
}; 