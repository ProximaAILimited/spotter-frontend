import axios from 'axios';
import { getToken, getAuthHeader } from './auth';
import { enrichTripWithCoordinates } from './geocodingService';
import { geocodeLocation } from './openMapServiceFix';

// API base URL from environment variable
const API_URL = process.env.REACT_APP_API_URL || '';

// Create axios instance with base URL
const API = axios.create({
  baseURL: `${API_URL}/api`,
});

// Add request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Authentication

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise} API response
 */
export const registerUser = async (userData) => {
  try {
    const response = await API.post('/auth/register/', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Registration failed' };
  }
};

/**
 * Login user
 * @param {Object} credentials - User login credentials
 * @returns {Promise} API response with token and user data
 */
export const loginUser = async (credentials) => {
  try {
    const response = await API.post('/auth/login/', credentials);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Login failed' };
  }
};

/**
 * Logout user
 * @returns {Promise} API response
 */
export const logoutUser = async () => {
  try {
    const response = await API.post('/auth/logout/');
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: 'Logout failed' };
  }
};

/**
 * Get current user information
 * @returns {Promise} User data
 */
export const getUser = async () => {
  // Since our API doesn't have a dedicated user endpoint, 
  // we'll use the token data that should include user info
  const token = getToken();
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  // For a real app, you'd have a /user/me endpoint
  // For now we'll simulate by fetching trips
  await API.get('/trips/');
  
  // In a real app, this would be retrieved from the server
  // Using local storage as a workaround
  const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
  return userData;
};

// Trip Operations

/**
 * Get all trips for current user
 * @returns {Promise} List of trips
 */
export const getTrips = async () => {
  try {
    const response = await API.get('/trips/');
    return response.data;
  } catch (error) {
    console.error('Error fetching trips:', error);
    throw error.response?.data || { error: 'Failed to fetch trips' };
  }
};

/**
 * Get a specific trip by ID
 * @param {number} tripId - Trip ID
 * @returns {Promise} Trip data
 */
export const getTripById = async (tripId) => {
  try {
    const response = await API.get(`/trips/${tripId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching trip details:', error);
    throw error.response?.data || { error: 'Failed to fetch trip details' };
  }
};

/**
 * Create a new trip
 * @param {Object} tripData - Trip data
 * @returns {Promise} Created trip data
 */
export const createTrip = async (tripData) => {
  try {
    // First enrich the trip data with coordinates for any locations
    const enrichedTripData = await enrichTripWithCoordinates(tripData);
    
    // Then send to the API
    const response = await API.post('/trips/', enrichedTripData);
    return response.data;
  } catch (error) {
    console.error('Error creating trip:', error);
    throw error.response?.data || { error: 'Failed to create trip' };
  }
};

/**
 * Update an existing trip
 * @param {number} tripId - Trip ID
 * @param {Object} tripData - Updated trip data
 * @returns {Promise} Updated trip data
 */
export const updateTrip = async (tripId, tripData) => {
  try {
    // First enrich the trip data with coordinates for any locations
    const enrichedTripData = await enrichTripWithCoordinates(tripData);
    
    // Then send to the API
    const response = await API.put(`/trips/${tripId}/`, enrichedTripData);
    return response.data;
  } catch (error) {
    console.error('Error updating trip:', error);
    throw error.response?.data || { error: 'Failed to update trip' };
  }
};

/**
 * Delete a trip
 * @param {number} tripId - Trip ID
 * @returns {Promise} API response
 */
export const deleteTrip = async (tripId) => {
  try {
    const response = await API.delete(`/trips/${tripId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting trip:', error);
    throw error.response?.data || { error: 'Failed to delete trip' };
  }
};

/**
 * Get ELD log details
 * @param {number} logId - ELD log ID
 * @returns {Promise} ELD log data with grid
 */
export const getEldLogDetails = async (logId) => {
  try {
    const response = await API.get(`/eld-logs/${logId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching ELD log details:', error);
    throw error.response?.data || { error: 'Failed to fetch ELD log details' };
  }
};

/**
 * Auto-fix trip coordinates using improved geocoding service
 * @param {string} tripId - ID of trip to fix
 * @returns {Promise<Object>} - Updated trip data
 */
export const autoFixTripCoordinates = async (tripId) => {
  try {
    // First get the current trip data
    const trip = await getTripById(tripId);
    
    if (!trip) {
      throw new Error('Trip not found');
    }
    
    console.log('Auto-fixing coordinates for trip:', tripId);
    
    // Create a copy of the trip to update
    const updatedTrip = { ...trip };
    let hasUpdates = false;
    let updatedCoordinates = {};
    
    // Fix current location coordinates if needed
    if ((!trip.current_location_lat || !trip.current_location_lng) && trip.current_location) {
      console.log('Fixing current location coordinates for:', trip.current_location);
      const results = await geocodeLocation(trip.current_location);
      
      if (results && results.length > 0) {
        updatedTrip.current_location_lat = results[0].lat;
        updatedTrip.current_location_lng = results[0].lng;
        updatedTrip.current_location_formatted = results[0].formatted_address || results[0].description;
        console.log('Fixed current location coordinates:', results[0].lat, results[0].lng);
        
        // Store these values separately in case the API response doesn't include them
        updatedCoordinates.current_location_lat = results[0].lat;
        updatedCoordinates.current_location_lng = results[0].lng;
        updatedCoordinates.current_location_formatted = results[0].formatted_address || results[0].description;
        
        hasUpdates = true;
      }
    } else {
      // Keep existing values
      updatedCoordinates.current_location_lat = trip.current_location_lat;
      updatedCoordinates.current_location_lng = trip.current_location_lng;
      updatedCoordinates.current_location_formatted = trip.current_location_formatted;
    }
    
    // Fix pickup location coordinates if needed
    if ((!trip.pickup_location_lat || !trip.pickup_location_lng) && trip.pickup_location) {
      console.log('Fixing pickup location coordinates for:', trip.pickup_location);
      const results = await geocodeLocation(trip.pickup_location);
      
      if (results && results.length > 0) {
        updatedTrip.pickup_location_lat = results[0].lat;
        updatedTrip.pickup_location_lng = results[0].lng;
        updatedTrip.pickup_location_formatted = results[0].formatted_address || results[0].description;
        console.log('Fixed pickup location coordinates:', results[0].lat, results[0].lng);
        
        // Store these values separately
        updatedCoordinates.pickup_location_lat = results[0].lat;
        updatedCoordinates.pickup_location_lng = results[0].lng;
        updatedCoordinates.pickup_location_formatted = results[0].formatted_address || results[0].description;
        
        hasUpdates = true;
      }
    } else {
      // Keep existing values
      updatedCoordinates.pickup_location_lat = trip.pickup_location_lat;
      updatedCoordinates.pickup_location_lng = trip.pickup_location_lng;
      updatedCoordinates.pickup_location_formatted = trip.pickup_location_formatted;
    }
    
    // Fix dropoff location coordinates if needed
    if ((!trip.dropoff_location_lat || !trip.dropoff_location_lng) && trip.dropoff_location) {
      console.log('Fixing dropoff location coordinates for:', trip.dropoff_location);
      const results = await geocodeLocation(trip.dropoff_location);
      
      if (results && results.length > 0) {
        updatedTrip.dropoff_location_lat = results[0].lat;
        updatedTrip.dropoff_location_lng = results[0].lng;
        updatedTrip.dropoff_location_formatted = results[0].formatted_address || results[0].description;
        console.log('Fixed dropoff location coordinates:', results[0].lat, results[0].lng);
        
        // Store these values separately
        updatedCoordinates.dropoff_location_lat = results[0].lat;
        updatedCoordinates.dropoff_location_lng = results[0].lng;
        updatedCoordinates.dropoff_location_formatted = results[0].formatted_address || results[0].description;
        
        hasUpdates = true;
      }
    } else {
      // Keep existing values
      updatedCoordinates.dropoff_location_lat = trip.dropoff_location_lat;
      updatedCoordinates.dropoff_location_lng = trip.dropoff_location_lng;
      updatedCoordinates.dropoff_location_formatted = trip.dropoff_location_formatted;
    }
    
    // Fix any stops coordinates if needed
    const updatedStops = [];
    if (trip.stops && trip.stops.length > 0) {
      await Promise.all(trip.stops.map(async (stop) => {
        const updatedStop = { ...stop };
        if ((!stop.location_lat || !stop.location_lng) && stop.location) {
          console.log('Fixing stop location coordinates for:', stop.location);
          const results = await geocodeLocation(stop.location);
          
          if (results && results.length > 0) {
            updatedStop.location_lat = results[0].lat;
            updatedStop.location_lng = results[0].lng;
            updatedStop.location_formatted = results[0].formatted_address || results[0].description;
            hasUpdates = true;
          }
        }
        updatedStops.push(updatedStop);
      }));
      
      updatedTrip.stops = updatedStops;
    }
    
    // If we made updates, save the trip
    let apiResponse = null;
    if (hasUpdates) {
      console.log('Saving updated trip coordinates');
      
      // Remove any fields that should not be sent to the API
      const { id, created_at, updated_at, user, eld_logs, ...tripToUpdate } = updatedTrip;
      
      // Use the axios instance instead of fetch for consistency
      try {
        const response = await API.put(`/trips/${tripId}/`, tripToUpdate);
        apiResponse = response.data;
        console.log('API response after update:', apiResponse);
      } catch (error) {
        console.error('API error updating trip:', error);
        throw error.response?.data || { error: 'Error updating trip' };
      }
    }
    
    // Merge the API response with our known good coordinates
    // This ensures we return the coordinates even if the API doesn't include them
    const finalTrip = apiResponse ? { ...apiResponse } : { ...trip };
    
    // Always use our updated coordinates even if the API response didn't include them
    if (hasUpdates) {
      console.log('Using local coordinates to ensure data integrity');
      finalTrip.current_location_lat = updatedCoordinates.current_location_lat;
      finalTrip.current_location_lng = updatedCoordinates.current_location_lng;
      finalTrip.current_location_formatted = updatedCoordinates.current_location_formatted;
      
      finalTrip.pickup_location_lat = updatedCoordinates.pickup_location_lat;
      finalTrip.pickup_location_lng = updatedCoordinates.pickup_location_lng;
      finalTrip.pickup_location_formatted = updatedCoordinates.pickup_location_formatted;
      
      finalTrip.dropoff_location_lat = updatedCoordinates.dropoff_location_lat;
      finalTrip.dropoff_location_lng = updatedCoordinates.dropoff_location_lng;
      finalTrip.dropoff_location_formatted = updatedCoordinates.dropoff_location_formatted;
      
      // If we updated stops, make sure they're included
      if (updatedStops.length > 0) {
        finalTrip.stops = updatedStops;
      }
      
      console.log('Final trip data with guaranteed coordinates:', {
        current: [finalTrip.current_location_lat, finalTrip.current_location_lng],
        pickup: [finalTrip.pickup_location_lat, finalTrip.pickup_location_lng],
        dropoff: [finalTrip.dropoff_location_lat, finalTrip.dropoff_location_lng]
      });
    }
    
    return finalTrip;
    
  } catch (error) {
    console.error('Error in autoFixTripCoordinates:', error);
    throw error;
  }
}; 