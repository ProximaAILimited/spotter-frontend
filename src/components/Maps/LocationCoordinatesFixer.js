import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Button, 
  Dialog, 
  DialogActions, 
  DialogContent, 
  DialogContentText, 
  DialogTitle,
  Box,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Paper,
  Typography,
  Divider
} from '@mui/material';
import { LocationSelector } from '../Common';
import { updateTrip } from '../../utils/api';

/**
 * Component that helps users fix missing coordinates for their trip by
 * selecting locations from the suggestion dropdown
 */
const LocationCoordinatesFixer = ({ 
  open, 
  onClose, 
  trip, 
  onTripUpdated 
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [updatedTrip, setUpdatedTrip] = useState({
    current_location: trip?.current_location || '',
    current_location_formatted: trip?.current_location_formatted || '',
    current_location_lat: trip?.current_location_lat || '',
    current_location_lng: trip?.current_location_lng || '',
    
    pickup_location: trip?.pickup_location || '',
    pickup_location_formatted: trip?.pickup_location_formatted || '',
    pickup_location_lat: trip?.pickup_location_lat || '',
    pickup_location_lng: trip?.pickup_location_lng || '',
    
    dropoff_location: trip?.dropoff_location || '',
    dropoff_location_formatted: trip?.dropoff_location_formatted || '',
    dropoff_location_lat: trip?.dropoff_location_lat || '',
    dropoff_location_lng: trip?.dropoff_location_lng || '',
  });
  
  // Define the steps for correcting locations
  const steps = [
    {
      label: 'Current Location',
      description: 'Select your starting location',
      field: 'current_location',
      required: true
    },
    {
      label: 'Pickup Location',
      description: 'Select the pickup location',
      field: 'pickup_location',
      required: true
    },
    {
      label: 'Dropoff Location',
      description: 'Select the destination',
      field: 'dropoff_location',
      required: true
    }
  ];
  
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  const handleLocationChange = (field, value) => {
    if (value) {
      setUpdatedTrip({
        ...updatedTrip,
        [field]: value.formatted_address,
        [`${field}_formatted`]: value.formatted_address, 
        [`${field}_lat`]: value.lat,
        [`${field}_lng`]: value.lng
      });
    }
  };
  
  const isStepComplete = (stepIndex) => {
    const step = steps[stepIndex];
    
    if (!step.required) return true;
    
    const lat = updatedTrip[`${step.field}_lat`];
    const lng = updatedTrip[`${step.field}_lng`];
    
    return (
      lat && 
      lng && 
      lat !== '0' && 
      lng !== '0' && 
      !isNaN(parseFloat(lat)) && 
      !isNaN(parseFloat(lng))
    );
  };
  
  const isLocationMissing = (field) => {
    const lat = trip[`${field}_lat`];
    const lng = trip[`${field}_lng`];
    
    return (
      !lat || 
      !lng || 
      lat === '0' || 
      lng === '0' || 
      isNaN(parseFloat(lat)) || 
      isNaN(parseFloat(lng))
    );
  };
  
  const handleSave = async () => {
    setUpdating(true);
    setError('');
    
    try {
      // Create update payload with just the needed fields
      const updatePayload = {
        current_location: updatedTrip.current_location,
        current_location_formatted: updatedTrip.current_location_formatted,
        current_location_lat: updatedTrip.current_location_lat,
        current_location_lng: updatedTrip.current_location_lng,
        
        pickup_location: updatedTrip.pickup_location,
        pickup_location_formatted: updatedTrip.pickup_location_formatted,
        pickup_location_lat: updatedTrip.pickup_location_lat,
        pickup_location_lng: updatedTrip.pickup_location_lng,
        
        dropoff_location: updatedTrip.dropoff_location,
        dropoff_location_formatted: updatedTrip.dropoff_location_formatted,
        dropoff_location_lat: updatedTrip.dropoff_location_lat,
        dropoff_location_lng: updatedTrip.dropoff_location_lng,
      };
      
      const updated = await updateTrip(trip.id, updatePayload);
      setSuccess(true);
      
      // Notify parent component about the update
      if (onTripUpdated) {
        onTripUpdated(updated);
      }
      
      // Close dialog after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Error updating trip:', error);
      setError('Failed to update trip locations. Please try again.');
    } finally {
      setUpdating(false);
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={!updating ? onClose : undefined}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Fix Trip Locations
      </DialogTitle>
      
      <DialogContent>
        <DialogContentText paragraph>
          To calculate the route accurately, we need valid coordinates for your locations. 
          Please select each location from the dropdown suggestions to ensure we have the correct coordinates.
        </DialogContentText>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((step, index) => (
            <Step key={step.label} completed={isStepComplete(index)}>
              <StepLabel>{step.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {success ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            Locations updated successfully! The page will reload with the updated data.
          </Alert>
        ) : (
          <Paper variant="outlined" sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              {steps[activeStep].label}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {steps[activeStep].description}
            </Typography>
            
            {isLocationMissing(steps[activeStep].field) && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                This location has missing or invalid coordinates.
              </Alert>
            )}
            
            <Box sx={{ mt: 3 }}>
              <LocationSelector
                label={steps[activeStep].label}
                value={updatedTrip[steps[activeStep].field]}
                onChange={(value) => handleLocationChange(steps[activeStep].field, value)}
                placeholder="Start typing to search locations..."
                helperText="Select a location from the dropdown suggestions"
                required={steps[activeStep].required}
              />
            </Box>
            
            {updatedTrip[`${steps[activeStep].field}_lat`] && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="body2" gutterBottom>
                  <strong>Selected:</strong> {updatedTrip[`${steps[activeStep].field}_formatted`]}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Coordinates: {updatedTrip[`${steps[activeStep].field}_lat`]}, {updatedTrip[`${steps[activeStep].field}_lng`]}
                </Typography>
              </Box>
            )}
          </Paper>
        )}
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={updating}>
          Cancel
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button
          disabled={activeStep === 0 || updating}
          onClick={handleBack}
        >
          Back
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={!isStepComplete(activeStep) || updating || success}
          >
            {updating ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!isStepComplete(activeStep)}
          >
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

LocationCoordinatesFixer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  trip: PropTypes.object.isRequired,
  onTripUpdated: PropTypes.func.isRequired
};

export default LocationCoordinatesFixer; 