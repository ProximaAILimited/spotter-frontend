import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
  TextField, 
  Autocomplete, 
  Box, 
  CircularProgress, 
  Typography,
  Alert,
  InputAdornment,
  Tooltip
} from '@mui/material';
import { 
  LocationOn as LocationIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { searchLocations } from '../../utils/openMapService';

/**
 * A reusable location selector component that ensures valid coordinates
 * are selected from the dropdown suggestions.
 */
const LocationSelector = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  helperText,
  required = false,
  error = false,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const debounceTimerRef = useRef(null);
  
  // Initialize inputValue based on the passed value
  useEffect(() => {
    if (value?.formatted_address) {
      setInputValue(value.formatted_address);
    } else if (typeof value === 'string' && value) {
      setInputValue(value);
    }
  }, []);
  
  // Handle input change with debounce for API calls
  const handleInputChange = (event, newInputValue) => {
    setInputValue(newInputValue);
    
    // Show warning if user types but doesn't select from dropdown
    if (newInputValue && newInputValue !== value?.formatted_address) {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
    
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Only search if we have at least 3 characters
    if (newInputValue && newInputValue.length >= 3) {
      setLoading(true);
      
      // Debounce API calls
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const results = await searchLocations(newInputValue);
          setOptions(results);
        } catch (error) {
          console.error('Error searching locations:', error);
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }, 500);
    } else {
      setOptions([]);
      setLoading(false);
    }
  };
  
  // Handle selecting an option from the dropdown
  const handleOptionSelect = (event, newValue) => {
    if (newValue) {
      const locationData = {
        formatted_address: newValue.description || newValue.formatted_address,
        lat: newValue.lat,
        lng: newValue.lng,
        place_id: newValue.place_id || newValue.osm_id,
        selected_from_dropdown: true
      };
      
      onChange(locationData);
      setShowWarning(false);
    } else {
      onChange(null);
    }
  };
  
  return (
    <div>
      <Autocomplete
        id="location-autocomplete"
        options={options}
        loading={loading}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        onChange={handleOptionSelect}
        getOptionLabel={(option) => option.description || option.formatted_address || ''}
        filterOptions={(x) => x} // Don't filter options, API does that
        isOptionEqualToValue={(option, value) => 
          option.place_id === value.place_id || 
          option.osm_id === value.osm_id
        }
        noOptionsText="No locations found"
        loadingText="Searching locations..."
        disabled={disabled}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            helperText={helperText}
            required={required}
            error={error || showWarning}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  <LocationIcon color="primary" />
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        renderOption={(props, option) => (
          <Box component="li" {...props}>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body1">
                {option.description || option.main_text || option.formatted_address}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {option.secondary_text || option.secondary_address}
              </Typography>
            </Box>
          </Box>
        )}
      />
      
      {showWarning && (
        <Alert 
          severity="warning" 
          sx={{ mt: 1, fontSize: '0.75rem', py: 0 }}
          icon={<InfoIcon fontSize="small" />}
        >
          Please select a location from the dropdown to ensure accurate coordinates
        </Alert>
      )}
    </div>
  );
};

LocationSelector.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object
  ]),
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  helperText: PropTypes.string,
  required: PropTypes.bool,
  error: PropTypes.bool,
  disabled: PropTypes.bool
};

export default LocationSelector; 