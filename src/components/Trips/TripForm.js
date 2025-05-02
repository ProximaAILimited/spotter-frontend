import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Box,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  InputAdornment,
  Snackbar,
  AlertTitle,
  Fade,
  Tooltip,
  alpha,
  useTheme
} from '@mui/material';
import {
  MyLocation as MyLocationIcon,
  LocalShipping as LocalShippingIcon,
  Flag as FlagIcon,
  AccessTime as AccessTimeIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  DirectionsCarOutlined as DirectionsCarIcon
} from '@mui/icons-material';
import { createTrip } from '../../utils/api';
import PlaceAutocomplete from '../Common/PlaceAutocomplete';
import { loadLeaflet, isValidLocation } from '../../utils/openMapService';

const TripForm = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    current_location: '',
    pickup_location: '',
    dropoff_location: '',
    current_cycle_hours: '0.00',
  });
  
  // State for location details
  const [currentLocationDetails, setCurrentLocationDetails] = useState(null);
  const [pickupLocationDetails, setPickupLocationDetails] = useState(null);
  const [dropoffLocationDetails, setDropoffLocationDetails] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [mapsLoading, setMapsLoading] = useState(true);
  const [error, setError] = useState('');
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [locationErrors, setLocationErrors] = useState({
    current_location: false,
    pickup_location: false,
    dropoff_location: false
  });
  
  // Retry counter for Leaflet loading
  const [loadRetries, setLoadRetries] = useState(0);
  
  // Load Leaflet map library on component mount with retry mechanism
  useEffect(() => {
    const loadMapLibrary = async () => {
      setMapsLoading(true);
      try {
        await loadLeaflet();
        setMapsLoading(false);
        setError('');
      } catch (err) {
        console.error('Failed to load map library:', err);
        if (loadRetries < 3) {
          // Retry loading with exponential backoff
          const timeout = Math.pow(2, loadRetries) * 1000;
          setTimeout(() => {
            setLoadRetries(prev => prev + 1);
          }, timeout);
        } else {
          setError('Failed to load map services. Please refresh the page and try again.');
          setMapsLoading(false);
        }
      }
    };
    
    loadMapLibrary();
  }, [loadRetries]);

  // Handle location input change
  const handleLocationChange = (field) => (value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear location error when the user edits the field
    if (locationErrors[field]) {
      setLocationErrors(prev => ({
        ...prev,
        [field]: false
      }));
    }
  };

  // Handle location selection
  const handleLocationSelected = (field, setDetails) => (placeDetails) => {
    // Validate the selected location has proper coordinates
    if (!isValidCoordinates(placeDetails)) {
      console.warn(`Selected location for ${field} has invalid coordinates:`, placeDetails);
      
      // If we have zero coordinates but a valid address, still accept it but show a warning
      if (placeDetails.formatted_address) {
        setSnackbarMessage(`Warning: ${field.replace(/_/g, ' ')} may not have precise coordinates. Route calculation might be affected.`);
      }
    }
    
    setDetails(placeDetails);
    
    // Update form field with formatted address if available
    if (placeDetails.formatted_address) {
      // Create a nicely formatted display of the location
      let formattedLocation = placeDetails.formatted_address;
      
      // If it's a named place (like a business), include the name if not already in address
      if (placeDetails.name && !formattedLocation.includes(placeDetails.name)) {
        formattedLocation = `${placeDetails.name}, ${formattedLocation}`;
      }
      
      setFormData(prev => ({
        ...prev,
        [field]: formattedLocation
      }));
      
      // Clear any error for this field
      setLocationErrors(prev => ({
        ...prev,
        [field]: false
      }));
    }
  };
  
  // Helper function to check if coordinates are valid
  const isValidCoordinates = (location) => {
    if (!location || !location.geometry || !location.geometry.location) return false;
    
    let lat, lng;
    if (typeof location.geometry.location.lat === 'function') {
      lat = location.geometry.location.lat();
      lng = location.geometry.location.lng();
    } else {
      lat = location.geometry.location.lat;
      lng = location.geometry.location.lng;
    }
    
    // Check if the coordinates are valid numbers and not zero (which often indicates a placeholder)
    return (
      typeof lat === 'number' && !isNaN(lat) && 
      typeof lng === 'number' && !isNaN(lng) &&
      (Math.abs(lat) > 0.001 || Math.abs(lng) > 0.001)
    );
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // For cycle hours, ensure it's a valid number between 0 and 70
    if (name === 'current_cycle_hours') {
      const numValue = parseFloat(value) || 0;
      if (numValue >= 0 && numValue <= 70) {
        setFormData({
          ...formData,
          [name]: value,
        });
      }
    } else if (!name.includes('location')) {
      // Handle non-location fields normally
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };
  
  // Improved validation before submission
  const validateLocations = () => {
    const errors = [];
    const newLocationErrors = {
      current_location: false,
      pickup_location: false,
      dropoff_location: false
    };
    
    if (!formData.current_location) {
      errors.push('Current location is required');
      newLocationErrors.current_location = true;
    } else if (!currentLocationDetails) {
      errors.push('Please select a valid current location from the suggestions');
      newLocationErrors.current_location = true;
    } else if (!isValidCoordinates(currentLocationDetails)) {
      errors.push('Current location has invalid coordinates. Please select a different location.');
      newLocationErrors.current_location = true;
    }
    
    if (!formData.pickup_location) {
      errors.push('Pickup location is required');
      newLocationErrors.pickup_location = true;
    } else if (!pickupLocationDetails) {
      errors.push('Please select a valid pickup location from the suggestions');
      newLocationErrors.pickup_location = true;
    } else if (!isValidCoordinates(pickupLocationDetails)) {
      errors.push('Pickup location has invalid coordinates. Please select a different location.');
      newLocationErrors.pickup_location = true;
    }
    
    if (!formData.dropoff_location) {
      errors.push('Dropoff location is required');
      newLocationErrors.dropoff_location = true;
    } else if (!dropoffLocationDetails) {
      errors.push('Please select a valid dropoff location from the suggestions');
      newLocationErrors.dropoff_location = true;
    } else if (!isValidCoordinates(dropoffLocationDetails)) {
      errors.push('Dropoff location has invalid coordinates. Please select a different location.');
      newLocationErrors.dropoff_location = true;
    }
    
    setLocationErrors(newLocationErrors);
    return errors;
  };
  
  // Helper function to safely extract coordinates
  const extractCoordinates = (locationDetails) => {
    if (!locationDetails || !locationDetails.geometry || !locationDetails.geometry.location) {
      return { lat: 0, lng: 0 };
    }
    
    let lat = 0, lng = 0;
    
    try {
      // Handle both function and direct value formats
      if (typeof locationDetails.geometry.location.lat === 'function') {
        lat = locationDetails.geometry.location.lat();
        lng = locationDetails.geometry.location.lng();
      } else {
        lat = locationDetails.geometry.location.lat;
        lng = locationDetails.geometry.location.lng;
      }
      
      // Ensure values are numbers
      lat = parseFloat(lat);
      lng = parseFloat(lng);
      
      // Check for NaN
      if (isNaN(lat) || isNaN(lng)) {
        return { lat: 0, lng: 0 };
      }
      
      return { lat, lng };
    } catch (error) {
      console.error('Error extracting coordinates:', error);
      return { lat: 0, lng: 0 };
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (mapsLoading) {
      setError('Location services are still loading. Please wait a moment and try again.');
      setLoading(false);
      return;
    }
    
    // Enhanced validation
    const validationErrors = validateLocations();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      setLoading(false);
      return;
    }
    
    // Prepare trip data with location details if available
    const tripData = {
      ...formData,
    };
    
    // Extract coordinates for current location
    const currentCoords = extractCoordinates(currentLocationDetails);
    tripData.current_location_lat = currentCoords.lat;
    tripData.current_location_lng = currentCoords.lng;
    tripData.current_location_formatted = currentLocationDetails.formatted_address || formData.current_location;
    tripData.current_location_place_id = currentLocationDetails.place_id || `manual_${Date.now()}`;
    
    // Extract coordinates for pickup location
    const pickupCoords = extractCoordinates(pickupLocationDetails);
    tripData.pickup_location_lat = pickupCoords.lat;
    tripData.pickup_location_lng = pickupCoords.lng;
    tripData.pickup_location_formatted = pickupLocationDetails.formatted_address || formData.pickup_location;
    tripData.pickup_location_place_id = pickupLocationDetails.place_id || `manual_${Date.now()}_pickup`;
    
    // Extract coordinates for dropoff location
    const dropoffCoords = extractCoordinates(dropoffLocationDetails);
    tripData.dropoff_location_lat = dropoffCoords.lat;
    tripData.dropoff_location_lng = dropoffCoords.lng;
    tripData.dropoff_location_formatted = dropoffLocationDetails.formatted_address || formData.dropoff_location;
    tripData.dropoff_location_place_id = dropoffLocationDetails.place_id || `manual_${Date.now()}_dropoff`;
    
    try {
      const trip = await createTrip(tripData);
      navigate(`/trips/${trip.id}`);
    } catch (error) {
      console.error('Error creating trip:', error);
      setError(error.error || 'Failed to create trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Close snackbar message
  const handleSnackbarClose = () => {
    setSnackbarMessage('');
  };
  
  // Retry loading map library
  const handleRetryMapLoad = () => {
    setLoadRetries(0);
  };
  
  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Plan a New Trip
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph align="center">
          Enter your trip details to generate an ELD-compliant route plan
        </Typography>
        
        <Divider sx={{ mb: 4 }} />
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            action={
              error.includes('map services') ? (
                <Button color="inherit" size="small" onClick={handleRetryMapLoad}>
                  Retry
                </Button>
              ) : undefined
            }
          >
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}
        
        {mapsLoading && (
          <Alert 
            severity="info" 
            icon={<CircularProgress size={20} />}
            sx={{ mb: 3 }}
          >
            Loading location services... Please wait.
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ position: 'relative' }}>
          {(loading || mapsLoading) && (
            <Box 
              sx={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                zIndex: 10,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: 1,
              }}
            >
              <CircularProgress />
            </Box>
          )}
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <PlaceAutocomplete
                value={formData.current_location}
                onChange={handleLocationChange('current_location')}
                onLocationSelected={handleLocationSelected('current_location', setCurrentLocationDetails)}
                label="Current Location"
                placeholder="Start typing your current location"
                required
                disabled={loading || mapsLoading}
                startIcon={<MyLocationIcon color="primary" />}
                currentLocationDetails={currentLocationDetails}
                helperText="Type to see location suggestions"
                error={locationErrors.current_location}
              />
              {currentLocationDetails && !isValidCoordinates(currentLocationDetails) && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  This location may have imprecise coordinates. Route calculation might be affected.
                </Alert>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <PlaceAutocomplete
                value={formData.pickup_location}
                onChange={handleLocationChange('pickup_location')}
                onLocationSelected={handleLocationSelected('pickup_location', setPickupLocationDetails)}
                label="Pickup Location"
                placeholder="Start typing the pickup location"
                required
                disabled={loading || mapsLoading}
                startIcon={<LocalShippingIcon color="primary" />}
                currentLocationDetails={pickupLocationDetails}
                helperText="Type to see location suggestions"
                error={locationErrors.pickup_location}
              />
              {pickupLocationDetails && !isValidCoordinates(pickupLocationDetails) && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  This location may have imprecise coordinates. Route calculation might be affected.
                </Alert>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <PlaceAutocomplete
                value={formData.dropoff_location}
                onChange={handleLocationChange('dropoff_location')}
                onLocationSelected={handleLocationSelected('dropoff_location', setDropoffLocationDetails)}
                label="Dropoff Location"
                placeholder="Start typing the destination location"
                required
                disabled={loading || mapsLoading}
                startIcon={<FlagIcon color="primary" />}
                currentLocationDetails={dropoffLocationDetails}
                helperText="Type to see location suggestions"
                error={locationErrors.dropoff_location}
              />
              {dropoffLocationDetails && !isValidCoordinates(dropoffLocationDetails) && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  This location may have imprecise coordinates. Route calculation might be affected.
                </Alert>
              )}
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="current_cycle_hours"
                name="current_cycle_hours"
                label="Current Cycle Hours Used"
                type="number"
                value={formData.current_cycle_hours}
                onChange={handleChange}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccessTimeIcon color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  max: 70,
                  step: 0.25,
                }}
                helperText="Enter hours used in your 70-hour/8-day cycle (0-70)"
              />
            </Grid>
            
            <Grid item xs={12} sx={{ mt: 2 }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                disabled={loading || mapsLoading}
                sx={{ height: 56 }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate Trip Plan'}
              </Button>
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 1 }}>
                <InfoIcon fontSize="small" color="info" sx={{ mr: 1, mt: 0.3 }} />
                <Typography variant="body2" color="text.secondary">
                  <strong>For accurate routing</strong>, please select locations from the suggestion dropdown that appears as you type. Manual entry may result in less precise routes.
                </Typography>
              </Box>
              
              <Box 
                sx={{ 
                  mt: 3,
                  p: 2,
                  border: '1px dashed',
                  borderColor: 'info.main',
                  borderRadius: 1,
                  backgroundColor: 'info.light',
                  opacity: 0.8,
                  textAlign: 'center'
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Powered by OpenStreetMap - a free and open-source mapping service
                </Typography>
                
                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
                  <Tooltip title="All locations validated">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon 
                        fontSize="small" 
                        color={isValidLocation(currentLocationDetails) && 
                               isValidLocation(pickupLocationDetails) && 
                               isValidLocation(dropoffLocationDetails) ? 'success' : 'disabled'} 
                        sx={{ mr: 0.5 }} 
                      />
                      <Typography variant="caption" color="text.secondary">
                        Locations
                      </Typography>
                    </Box>
                  </Tooltip>
                  
                  <Tooltip title="Map services loaded">
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircleIcon 
                        fontSize="small" 
                        color={!mapsLoading ? 'success' : 'disabled'} 
                        sx={{ mr: 0.5 }} 
                      />
                      <Typography variant="caption" color="text.secondary">
                        Map Services
                      </Typography>
                    </Box>
                  </Tooltip>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={!!snackbarMessage}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        TransitionComponent={Fade}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="warning" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default TripForm; 