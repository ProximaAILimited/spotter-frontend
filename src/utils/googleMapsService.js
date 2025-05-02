/**
 * Google Maps service utility for handling all Maps-related functionality
 * This centralized approach ensures more reliable integration with Google Maps
 */

// Keep track of the script loading state
let googleMapsLoaded = false;
let googleMapsLoadPromise = null;
let billingErrorDetected = false;

// Store API instances to prevent duplicate initialization
let autocompleteService = null;
let placesService = null;
let sessionToken = null;

// Debug helper - will log to console in non-production environments
const debug = (message, data) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[GoogleMapsService] ${message}`, data);
  }
};

/**
 * Check if the error is a billing-related error
 * @param {Error} error - The error to check
 * @returns {boolean} - Whether the error is billing-related
 */
const isBillingError = (error) => {
  if (!error) return false;
  
  const errorStr = error.toString().toLowerCase();
  return (
    errorStr.includes('billing') ||
    errorStr.includes('billing not enabled') ||
    errorStr.includes('billingnotenabled') ||
    errorStr.includes('you must enable billing')
  );
};

/**
 * Load the Google Maps API script
 * @returns {Promise} A promise that resolves when the Google Maps API is loaded
 */
export const loadGoogleMapsApi = () => {
  // If billing error was already detected, don't try to load again
  if (billingErrorDetected) {
    return Promise.reject(new Error('Google Maps API requires billing to be enabled. Please check the console for more information.'));
  }

  // Return existing promise if already loading
  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  // If already loaded, return a resolved promise
  if (googleMapsLoaded && window.google && window.google.maps && window.google.maps.places) {
    debug('Google Maps API already loaded');
    return Promise.resolve();
  }

  // Create a new promise to load the script
  googleMapsLoadPromise = new Promise((resolve, reject) => {
    // Check if the API key is configured
    const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!googleMapsApiKey) {
      reject(new Error('Google Maps API key is missing. Please configure REACT_APP_GOOGLE_MAPS_API_KEY in your environment.'));
      return;
    }

    // Set up a global error handler to catch billing errors
    const originalOnError = window.onerror;
    const billingErrorHandler = (message, source, lineno, colno, error) => {
      if (message && (
          message.includes('BillingNotEnabledMapError') || 
          message.includes('You must enable Billing')
        )) {
        billingErrorDetected = true;
        debug('Detected Google Maps billing error', message);
        
        // Provide detailed guidance in console
        console.error(`
==================== GOOGLE MAPS API BILLING ERROR ====================
Your Google Maps API key requires billing to be enabled.

To fix this:
1. Go to https://console.cloud.google.com/project/_/billing/enable
2. Select your project
3. Enable billing (a credit card is required, but you won't be charged if you stay within free tier limits)
4. Enable the necessary APIs (Places API, Maps JavaScript API, etc.)

For more information, visit:
https://developers.google.com/maps/documentation/javascript/error-messages#billing-not-enabled-map-error
=====================================================================
        `);
        
        reject(new Error('Google Maps requires billing to be enabled. See console for details.'));
      }
      
      // Call the original error handler if it exists
      if (originalOnError) return originalOnError(message, source, lineno, colno, error);
      return false;
    };
    
    // Install the error handler
    window.onerror = billingErrorHandler;

    // Check if script is already in the document
    const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (existingScript) {
      debug('Google Maps script tag already exists');
      // If script exists and is loaded, resolve immediately
      if (window.google && window.google.maps && window.google.maps.places) {
        googleMapsLoaded = true;
        resolve();
        return;
      }
      // Otherwise wait for the existing script to load
      existingScript.addEventListener('load', () => {
        googleMapsLoaded = true;
        resolve();
      });
      existingScript.addEventListener('error', (e) => {
        // Check if this is a billing error
        if (isBillingError(e)) {
          billingErrorDetected = true;
          reject(new Error('Google Maps requires billing to be enabled. See console for details.'));
        } else {
          reject(new Error('Failed to load existing Google Maps API script: ' + e.message));
        }
      });
      return;
    }

    // Create a callback function name
    const callbackName = 'googleMapsApiLoaded_' + Math.round(Date.now() * Math.random());
    window[callbackName] = () => {
      googleMapsLoaded = true;
      debug('Google Maps API loaded successfully');
      
      // Restore original error handler
      window.onerror = originalOnError;
      
      resolve();
      // Clean up the global callback
      delete window[callbackName];
    };

    // Create and append the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = (e) => {
      debug('Error loading Google Maps script', e);
      
      // Restore original error handler
      window.onerror = originalOnError;
      
      if (isBillingError(e)) {
        billingErrorDetected = true;
        reject(new Error('Google Maps requires billing to be enabled. See console for details.'));
      } else {
        reject(new Error('Failed to load Google Maps API. Please check your internet connection and API key.'));
      }
      
      delete window[callbackName];
    };
    
    debug('Adding Google Maps script to document');
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};

/**
 * Initialize the Autocomplete and Places services
 * @returns {Promise} A promise that resolves when the services are initialized
 */
export const initServices = async () => {
  // Load the API if not already loaded
  await loadGoogleMapsApi();
  
  try {
    // Initialize services if needed
    if (!autocompleteService && window.google && window.google.maps && window.google.maps.places) {
      debug('Initializing AutocompleteService');
      autocompleteService = new window.google.maps.places.AutocompleteService();
    }
    
    if (!sessionToken && window.google && window.google.maps && window.google.maps.places) {
      debug('Creating new AutocompleteSessionToken');
      sessionToken = new window.google.maps.places.AutocompleteSessionToken();
    }

    if (!autocompleteService) {
      throw new Error('Failed to initialize AutocompleteService');
    }
    
    return {
      autocompleteService,
      placesService,
      sessionToken
    };
  } catch (error) {
    debug('Error initializing services', error);
    throw error;
  }
};

/**
 * Fetch place suggestions based on input text
 * @param {string} input - The input text to search for
 * @param {object} options - Additional options for the search
 * @returns {Promise<Array>} A promise that resolves to an array of suggestions
 */
export const getPlaceSuggestions = async (input, options = {}) => {
  if (!input || input.trim().length < 1) {
    return [];
  }

  try {
    debug(`Fetching suggestions for: "${input}"`);
    
    // Initialize services
    const { autocompleteService, sessionToken } = await initServices();
    
    if (!autocompleteService) {
      throw new Error('Autocomplete service is not available');
    }
    
    // Set up location bias if user has already chosen a location
    let locationBias = null;
    
    // First priority: use provided location details if available
    if (options.currentLocationDetails && options.currentLocationDetails.geometry) {
      const location = options.currentLocationDetails.geometry.location;
      locationBias = {
        lat: location.lat(),
        lng: location.lng()
      };
      debug('Using provided location details for bias', locationBias);
    } 
    // Second priority: try to use geolocation API
    else {
      try {
        // Try to get user's current position from browser geolocation
        if (navigator.geolocation) {
          // Use a promise with a short timeout to get geolocation
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              { 
                enableHighAccuracy: true,
                timeout: 3000, // Short timeout to not delay suggestions for too long
                maximumAge: 60000 // Allow cached position up to 1 minute old
              }
            );
          });
          
          if (position && position.coords) {
            locationBias = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            debug('Using geolocation for location bias', locationBias);
          }
        }
      } catch (error) {
        // Silent fail for geolocation errors - just won't use location bias
        debug('Could not get geolocation for location bias', error);
      }
    }

    // Prepare the request
    const request = {
      input: input,
      sessionToken,
      // Use simple type list for better results - don't over-restrict
      types: options.types || [],
      componentRestrictions: { country: 'us' } // Restrict to US locations
    };
    
    // Add location bias if available
    if (locationBias) {
      request.location = new window.google.maps.LatLng(locationBias.lat, locationBias.lng);
      request.radius = 100000; // 100km radius
    }

    debug('Sending request to Google Places API', request);

    // Try different approaches to get suggestions
    return new Promise((resolve, reject) => {
      // First attempt with minimal restrictions
      autocompleteService.getPlacePredictions(
        request,
        (predictions, status) => {
          debug(`Got response with status: ${status}`, { predictions });
          
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
            const sortedPredictions = sortPredictions(predictions, input);
            resolve(sortedPredictions);
          } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS || !predictions || predictions.length === 0) {
            // Try again with specific types
            const specificRequest = {
              ...request,
              types: ['geocode', 'establishment', 'address', '(cities)']
            };
            
            debug('No results found, trying with specific types', specificRequest);
            
            autocompleteService.getPlacePredictions(
              specificRequest,
              (specificPredictions, specificStatus) => {
                debug(`Got response for specific types with status: ${specificStatus}`, { specificPredictions });
                
                if (specificStatus === window.google.maps.places.PlacesServiceStatus.OK && specificPredictions && specificPredictions.length > 0) {
                  const sortedPredictions = sortPredictions(specificPredictions, input);
                  resolve(sortedPredictions);
                } else {
                  // Final attempt with no restrictions besides country
                  const bareRequest = {
                    input: input,
                    sessionToken,
                    componentRestrictions: { country: 'us' }
                  };
                  
                  debug('Still no results, trying with minimal request', bareRequest);
                  
                  autocompleteService.getPlacePredictions(
                    bareRequest,
                    (barePredictions, bareStatus) => {
                      debug(`Got response for bare request with status: ${bareStatus}`, { barePredictions });
                      
                      if (bareStatus === window.google.maps.places.PlacesServiceStatus.OK && barePredictions && barePredictions.length > 0) {
                        const sortedPredictions = sortPredictions(barePredictions, input);
                        resolve(sortedPredictions);
                      } else {
                        debug('No results found after all attempts');
                        resolve([]);
                      }
                    }
                  );
                }
              }
            );
          } else {
            debug(`Autocomplete request failed with status: ${status}`);
            reject(new Error(`Autocomplete request failed with status: ${status}`));
          }
        }
      );
    });
  } catch (error) {
    debug('Error in getPlaceSuggestions', error);
    console.error('Error fetching place suggestions:', error);
    return [];
  }
};

/**
 * Sort predictions for better relevance
 * @param {Array} predictions - The predictions to sort
 * @param {string} input - The input text used for searching
 * @returns {Array} Sorted predictions
 */
function sortPredictions(predictions, input) {
  if (!predictions || predictions.length === 0) return [];
  
  const inputLower = input.toLowerCase();
  
  // Score each prediction
  const scoredPredictions = predictions.map(prediction => {
    let score = 0;
    
    // Exact match with main_text gets highest score
    if (prediction.structured_formatting?.main_text?.toLowerCase() === inputLower) {
      score += 100;
    }
    
    // Starts with input gets high score
    if (prediction.structured_formatting?.main_text?.toLowerCase().startsWith(inputLower)) {
      score += 50;
    }
    
    // Prefer addresses and establishments
    if (prediction.types) {
      if (prediction.types.includes('street_address') || 
          prediction.types.includes('premise') || 
          prediction.types.includes('subpremise')) {
        score += 30; // Specific address is very relevant
      } else if (prediction.types.includes('establishment')) {
        score += 25; // Businesses are highly relevant
      } else if (prediction.types.includes('locality') || prediction.types.includes('postal_code')) {
        score += 15; // Cities and postal codes are somewhat relevant
      }
    }
    
    // Simpler descriptions are often better
    if (prediction.description) {
      // Fewer commas typically means more specific/direct place names
      const commaCount = (prediction.description.match(/,/g) || []).length;
      score -= commaCount * 2; // Subtract 2 points per comma
    }
    
    return { prediction, score };
  });
  
  // Sort by score (highest first) and return the original predictions in new order
  return scoredPredictions
    .sort((a, b) => b.score - a.score)
    .map(item => item.prediction);
}

/**
 * Get detailed information about a place
 * @param {string} placeId - The Google Place ID
 * @param {HTMLElement} attributionNode - The DOM node for attributions (required by Google)
 * @returns {Promise<object>} A promise that resolves to place details
 */
export const getPlaceDetails = async (placeId, attributionNode) => {
  if (!placeId) {
    throw new Error('Place ID is required');
  }

  // Initialize services
  await initServices();

  // Create PlacesService instance (requires a DOM element for attributions)
  if (!placesService && attributionNode) {
    placesService = new window.google.maps.places.PlacesService(attributionNode);
  }

  if (!placesService) {
    throw new Error('Places service is not available');
  }

  // Get place details
  return new Promise((resolve, reject) => {
    placesService.getDetails(
      {
        placeId,
        fields: [
          'address_components',
          'formatted_address',
          'geometry',
          'name',
          'place_id',
          'types',
          'vicinity',
          'url'
        ],
        sessionToken
      },
      (place, status) => {
        // Clear the session token after use
        sessionToken = new window.google.maps.places.AutocompleteSessionToken();
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          resolve(place);
        } else {
          reject(new Error(`Place details request failed with status: ${status}`));
        }
      }
    );
  });
};

/**
 * Validate if the location details are valid and accurate
 * @param {object} locationDetails - The location details to validate
 * @returns {boolean} Whether the location is valid
 */
export const isValidLocation = (locationDetails) => {
  return !!(
    locationDetails && 
    locationDetails.geometry && 
    locationDetails.geometry.location &&
    locationDetails.place_id &&
    locationDetails.formatted_address
  );
}; 