/**
 * Open Map Service utility that uses OpenStreetMap with Nominatim API for geocoding
 * This provides a free, open-source alternative to Google Maps
 */

import { geocodeLocation } from './openMapServiceFix';

// Debounce helper function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Search for location suggestions using OpenStreetMap's Nominatim API with robust error handling
 * @param {string} query - The search query
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} - Promise that resolves to an array of suggestions
 */
export const searchLocations = async (query, options = {}) => {
  // Validate and clean input
  if (!query || typeof query !== 'string') {
    console.warn('Invalid query provided to searchLocations:', query);
    return [];
  }

  const cleanQuery = query.trim();
  if (cleanQuery.length < 1) {
    return [];
  }

  try {
    // Use our improved geocoding service which handles all fallbacks internally
    console.log('Using enhanced geocoding service for:', cleanQuery);
    const results = await geocodeLocation(cleanQuery);
    
    if (results && results.length > 0) {
      console.log('Geocoding successful with results:', results.length);
      return results;
    }
    
    console.warn('No results found for location:', cleanQuery);
    return [];
  } catch (error) {
    console.error('Error in searchLocations:', error);
    return [];
  }
};

/**
 * Perform a search using Nominatim API with error handling and retries
 * @param {string} query - Search query
 * @param {Object} options - Search options
 * @returns {Promise<Array>} - Formatted search results
 */
const performNominatimSearch = async (query, options = {}) => {
  // Number of retry attempts for failed requests
  const MAX_RETRIES = 2;
  
  // Build the request URL with parameters
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: options.addressdetails !== undefined ? options.addressdetails : 1,
    limit: options.limit || 10,
    countrycodes: options.countryCode || 'us',
    'accept-language': 'en',
    dedupe: 1,
    polygon_geojson: 0 // No need for polygon data
  });

  // Add bounding box if provided for context
  if (options.bounds) {
    params.append('viewbox', options.bounds.join(','));
    params.append('bounded', '1');
  }

  // Setup multiple Nominatim servers to try if the main one fails
  const nominatimServers = [
    'https://nominatim.openstreetmap.org',
    'https://nominatim.openstreetmap.de' // Fallback server
  ];

  let lastError = null;
  let results = [];

  // Try each server up to MAX_RETRIES times
  for (const server of nominatimServers) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Add a small delay on retry attempts to avoid hammering the server
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        const response = await fetch(`${server}/search?${params.toString()}`, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Spotter Trip Planner App' // It's good practice to identify your app
          },
          // Add timeout to avoid hanging requests
          signal: AbortSignal.timeout(8000) // 8 second timeout
        });

        if (!response.ok) {
          throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data = await response.json();

        // Format the results to resemble our expected structure
        results = formatNominatimResults(data);
        
        // If we got results, no need to retry
        if (results.length > 0) {
          return results;
        }
        
        // If no results from this server, try the next one
        break;
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} failed for server ${server}:`, error);
        lastError = error;
        // Continue to next attempt or server
      }
    }
  }

  // If we reached here with results, return them
  if (results.length > 0) {
    return results;
  }

  // Otherwise, throw the last error
  if (lastError) {
    console.error('All Nominatim search attempts failed:', lastError);
  }
  
  return [];
};

/**
 * Format Nominatim API results to match our application's expected structure
 * @param {Array} data - Raw data from Nominatim API
 * @returns {Array} - Formatted results
 */
const formatNominatimResults = (data) => {
  if (!Array.isArray(data)) {
    console.warn('Invalid data format from Nominatim:', data);
    return [];
  }

  // Filter out results without proper coordinates
  const validResults = data.filter(item => 
    item && typeof item.lat === 'string' && typeof item.lon === 'string' &&
    !isNaN(parseFloat(item.lat)) && !isNaN(parseFloat(item.lon))
  );

  const formattedResults = validResults.map(item => {
    try {
      // Create a readable formatted address from components
      const address = item.address || {};
      
      // Build the primary component of the address (most specific part)
      const primaryComponent = 
        address.road || 
        address.pedestrian ||
        address.neighbourhood || 
        address.suburb || 
        address.hamlet ||
        address.town ||
        address.city ||
        item.name ||
        '';
      
      // Build the secondary component (broader context)
      const secondaryComponents = [
        address.house_number,
        address.city || address.town || address.village || address.county,
        address.state || address.region,
        address.postcode,
        address.country
      ].filter(Boolean);
      
      // Join components or create parts from display_name as fallback
      const secondaryComponent = secondaryComponents.length > 0 
        ? secondaryComponents.join(', ')
        : item.display_name.split(',').slice(1).join(',').trim();

      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      
      // Return a consistent structure that our application expects
      return {
        place_id: item.place_id || `nominatim_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        osm_id: item.osm_id,
        osm_type: item.osm_type,
        description: item.display_name,
        formatted_address: item.display_name,
        name: item.name || primaryComponent || item.display_name.split(',')[0].trim(),
        geometry: {
          location: {
            lat,
            lng,
            // Add compatibility functions
            lat: function() { return lat; },
            lng: function() { return lng; }
          }
        },
        structured_formatting: {
          main_text: primaryComponent || item.display_name.split(',')[0].trim(),
          secondary_text: secondaryComponent
        },
        types: item.class ? [item.class, item.type].filter(Boolean) : [],
        importance: item.importance || 0.5
      };
    } catch (error) {
      console.error('Error formatting Nominatim result:', error, item);
      // Return null for this item, we'll filter these out
      return null;
    }
  });

  // Filter out any null results from errors and sort by importance
  return formattedResults
    .filter(Boolean)
    .sort((a, b) => b.importance - a.importance);
};

/**
 * Get detailed information about a location by its ID
 * @param {string} placeId - OSM place ID
 * @param {string} osmType - OSM type (node, way, relation)
 * @param {string} osmId - OSM ID
 * @returns {Promise<Object>} - Promise that resolves to location details
 */
export const getLocationDetails = async (placeId, osmType, osmId) => {
  // Number of retry attempts
  const MAX_RETRIES = 2;
  
  // Multiple servers to try
  const nominatimServers = [
    'https://nominatim.openstreetmap.org',
    'https://nominatim.openstreetmap.de' // Fallback server
  ];
  
  for (const server of nominatimServers) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Delay on retry attempts
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // If we have the OSM type and ID, use those for lookups
        let url;
        if (osmType && osmId) {
          // Convert osm_type to the format required by the lookup API
          const osmTypeFormatted = 
            osmType === 'node' ? 'N' : 
            osmType === 'way' ? 'W' : 
            osmType === 'relation' ? 'R' : '';
          
          url = `${server}/lookup?osm_ids=${osmTypeFormatted}${osmId}&format=json&addressdetails=1`;
        } else {
          // Fallback to direct place_id lookup
          url = `${server}/details?place_id=${placeId}&format=json&addressdetails=1`;
        }

        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Spotter Trip Planner App'
          },
          signal: AbortSignal.timeout(8000) // 8 second timeout
        });

        if (!response.ok) {
          throw new Error(`Nominatim API error: ${response.status}`);
        }

        let data;
        if (osmType && osmId) {
          data = await response.json();
          // The lookup endpoint returns an array, take the first result
          data = data[0] || null;
        } else {
          data = await response.json();
        }

        if (!data) {
          throw new Error('Location not found');
        }

        // Parse lat/lng ensuring they're valid numbers
        const lat = parseFloat(data.lat || (data.centroid?.coordinates ? data.centroid.coordinates[1] : 0));
        const lng = parseFloat(data.lon || (data.centroid?.coordinates ? data.centroid.coordinates[0] : 0));
        
        if (isNaN(lat) || isNaN(lng)) {
          throw new Error('Invalid coordinates from Nominatim');
        }

        // Format the details to match our expected structure
        return {
          place_id: data.place_id || placeId,
          osm_id: data.osm_id,
          osm_type: data.osm_type,
          formatted_address: data.display_name,
          name: data.name || data.display_name.split(',')[0].trim(),
          geometry: {
            location: {
              lat,
              lng,
              // Add convenience functions for compatibility
              lat: function() { return lat; },
              lng: function() { return lng; }
            }
          },
          address_components: Object.entries(data.address || {}).map(([key, value]) => ({
            long_name: value,
            short_name: value,
            types: [key]
          })),
          types: [data.class, data.type].filter(Boolean)
        };
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed for server ${server}:`, error);
        // Continue to next attempt or server
      }
    }
  }
  
  // If we get here, all attempts failed
  throw new Error('Failed to get location details after multiple attempts');
};

/**
 * Load Leaflet map scripts and styles
 * @returns {Promise} - Promise that resolves when Leaflet is loaded
 */
export const loadLeaflet = () => {
  return new Promise((resolve, reject) => {
    // Check if Leaflet is already loaded
    if (window.L) {
      // If the Leaflet polylinedecorator is not required, resolve immediately
      if (!window.L.polylineDecorator) {
        // Load the polylinedecorator plugin if needed
        loadPolylineDecorator().then(resolve).catch(err => {
          console.warn('Could not load polylinedecorator plugin, but will continue:', err);
          resolve(); // Continue even if decorator fails to load
        });
      } else {
        resolve();
      }
      return;
    }
    
    // Track loading state
    let cssLoaded = false;
    let jsLoaded = false;
    let polylineDecoratorLoaded = false;
    
    // Function to check if everything is loaded
    const checkAllLoaded = () => {
      if (cssLoaded && jsLoaded && (polylineDecoratorLoaded || window.L.polylineDecorator) && window.L) {
        resolve();
      }
    };

    // Load CSS
    const linkEl = document.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    linkEl.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    linkEl.crossOrigin = '';
    linkEl.onload = () => {
      cssLoaded = true;
      checkAllLoaded();
    };
    linkEl.onerror = () => reject(new Error('Failed to load Leaflet CSS'));
    document.head.appendChild(linkEl);

    // Load JS
    const scriptEl = document.createElement('script');
    scriptEl.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    scriptEl.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    scriptEl.crossOrigin = '';
    scriptEl.onload = () => {
      jsLoaded = true;
      
      // After leaflet is loaded, load the polylinedecorator plugin
      if (window.L) {
        loadPolylineDecorator()
          .then(() => {
            polylineDecoratorLoaded = true;
            checkAllLoaded();
          })
          .catch(err => {
            console.warn('Could not load polylinedecorator plugin, but will continue:', err);
            polylineDecoratorLoaded = true; // Mark as loaded even if it failed
            checkAllLoaded();
          });
      } else {
        // Set a small timeout to ensure Leaflet is fully initialized
        setTimeout(() => {
          if (window.L) {
            loadPolylineDecorator()
              .then(() => {
                polylineDecoratorLoaded = true;
                checkAllLoaded();
              })
              .catch(err => {
                console.warn('Could not load polylinedecorator plugin, but will continue:', err);
                polylineDecoratorLoaded = true; // Mark as loaded even if it failed
                checkAllLoaded();
              });
          } else {
            reject(new Error('Leaflet loaded but L object not available'));
          }
        }, 100);
      }
    };
    scriptEl.onerror = () => reject(new Error('Failed to load Leaflet script'));
    document.head.appendChild(scriptEl);
    
    // Set timeout for overall loading
    setTimeout(() => {
      if (!window.L) {
        reject(new Error('Leaflet loading timed out'));
      }
    }, 10000);
  });
};

/**
 * Helper function to load the polylinedecorator plugin
 * @returns {Promise} - Promise that resolves when the plugin is loaded
 */
const loadPolylineDecorator = () => {
  return new Promise((resolve, reject) => {
    // If already loaded, resolve immediately
    if (window.L && window.L.polylineDecorator) {
      resolve();
      return;
    }
    
    // Load the polylinedecorator plugin
    const scriptEl = document.createElement('script');
    scriptEl.src = 'https://unpkg.com/leaflet-polylinedecorator@1.6.0/dist/leaflet.polylineDecorator.js';
    scriptEl.crossOrigin = '';
    
    scriptEl.onload = () => {
      // Check if it loaded properly
      if (window.L && window.L.PolylineDecorator) {
        console.log('Polyline decorator plugin loaded successfully');
        resolve();
      } else {
        // Fail gracefully - we'll use our custom implementation
        console.warn('Polyline decorator plugin loaded but not available');
        resolve();
      }
    };
    
    scriptEl.onerror = (err) => {
      console.warn('Failed to load polyline decorator plugin:', err);
      resolve(); // Continue even if plugin fails to load
    };
    
    document.head.appendChild(scriptEl);
    
    // Set a timeout in case the script hangs
    setTimeout(() => {
      resolve(); // Resolve anyway after timeout
    }, 5000);
  });
};

/**
 * Check if a location object has valid coordinates
 * @param {Object} location - Location object to validate
 * @returns {boolean} - Whether the location is valid
 */
export const isValidLocation = (location) => {
  if (!location) return false;
  
  // Check if we have the geometry object with location
  if (!location.geometry || !location.geometry.location) return false;
  
  // Get coordinates
  let lat, lng;
  
  // Handle both function and direct value formats
  if (typeof location.geometry.location.lat === 'function') {
    lat = location.geometry.location.lat();
    lng = location.geometry.location.lng();
  } else {
    lat = location.geometry.location.lat;
    lng = location.geometry.location.lng;
  }
  
  // Validate coordinates are real numbers and in reasonable range
  const isValidLat = typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
  const isValidLng = typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180;
  
  // Check for place_id and formatted_address (but don't require them if we have valid coords)
  const hasIdentifiers = location.place_id || location.osm_id;
  const hasAddress = location.formatted_address || location.description;
  
  return isValidLat && isValidLng && (hasIdentifiers || hasAddress);
};

// Create a throttled version of the search function to prevent too many API calls
export const searchLocationsThrottled = debounce(async (query, callback, options = {}) => {
  try {
    const results = await searchLocations(query, options);
    callback(results);
  } catch (error) {
    console.error('Search error:', error);
    callback([]); // Return empty results array in case of error
  }
}, 300);

/**
 * Get the user's current location
 * @returns {Promise<Object>} - Promise that resolves to the user's location
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Reverse geocode the coordinates to get the address
          const params = new URLSearchParams({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            format: 'json',
            addressdetails: 1,
            zoom: 18
          });

          // Try multiple servers
          const servers = [
            'https://nominatim.openstreetmap.org',
            'https://nominatim.openstreetmap.de'
          ];
          
          let error = null;
          
          for (const server of servers) {
            try {
              const response = await fetch(
                `${server}/reverse?${params.toString()}`,
                {
                  headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Spotter Trip Planner App'
                  },
                  signal: AbortSignal.timeout(8000)
                }
              );
  
              if (!response.ok) {
                throw new Error(`Nominatim API error: ${response.status}`);
              }
  
              const data = await response.json();
              
              if (!data) {
                throw new Error('No data returned from reverse geocoding');
              }
              
              // Validate coordinates
              const lat = parseFloat(data.lat);
              const lng = parseFloat(data.lon);
              
              if (isNaN(lat) || isNaN(lng)) {
                throw new Error('Invalid coordinates in reverse geocoding response');
              }
  
              // Format the response to match our expected structure
              const result = {
                place_id: data.place_id || `manual_${Date.now()}`,
                osm_id: data.osm_id,
                osm_type: data.osm_type,
                formatted_address: data.display_name || `${position.coords.latitude}, ${position.coords.longitude}`,
                name: data.address?.road || data.address?.neighbourhood || data.display_name?.split(',')[0].trim() || 'Current Location',
                geometry: {
                  location: {
                    lat,
                    lng,
                    // Add convenience functions for compatibility
                    lat: function() { return lat; },
                    lng: function() { return lng; }
                  }
                },
                address_components: Object.entries(data.address || {}).map(([key, value]) => ({
                  long_name: value,
                  short_name: value,
                  types: [key]
                }))
              };
              
              // Successful result, resolve promise
              resolve(result);
              return; // Exit the loop and function
            } catch (e) {
              console.warn(`Error with server ${server}:`, e);
              error = e;
              // Continue to next server
            }
          }
          
          // If we get here, all servers failed
          if (error) {
            throw error;
          } else {
            throw new Error('Failed to get location details from any server');
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          
          // Fallback to raw coordinates if geocoding fails
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Create a minimal location object with just the coordinates
          resolve({
            place_id: `manual_coords_${Date.now()}`,
            formatted_address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            name: 'Current Location',
            geometry: {
              location: {
                lat,
                lng,
                lat: function() { return lat; },
                lng: function() { return lng; }
              }
            }
          });
        }
      },
      (error) => {
        let message = 'Unable to determine your location';
        if (error.code === 1) {
          message = 'Location access denied. Please enable location services or enter location manually.';
        } else if (error.code === 2) {
          message = 'Location unavailable. Your device cannot determine your current position.';
        } else if (error.code === 3) {
          message = 'Location request timed out. Please try again.';
        }
        reject(new Error(message));
      },
      { 
        enableHighAccuracy: true, 
        timeout: 10000, 
        maximumAge: 60000 
      }
    );
  });
}; 