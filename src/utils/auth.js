// Token storage key
const TOKEN_KEY = 'spotter_auth_token';

/**
 * Store authentication token in localStorage
 * @param {string} token - Authentication token
 */
export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * Get authentication token from localStorage
 * @returns {string|null} Authentication token or null if not found
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Remove authentication token from localStorage
 */
export const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Check if user is authenticated
 * @returns {boolean} True if user is authenticated
 */
export const isAuthenticated = () => {
  return !!getToken();
};

/**
 * Get auth header configuration for API requests
 * @returns {Object} Headers object with Authorization token
 */
export const getAuthHeader = () => {
  const token = getToken();
  return token ? { Authorization: `Token ${token}` } : {};
}; 