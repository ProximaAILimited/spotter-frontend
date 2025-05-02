import React, { useState, useEffect, useRef } from 'react';
import {
  TextField,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress,
  InputAdornment,
  Popper,
  ClickAwayListener,
  Button,
  Tooltip,
  IconButton,
  Chip,
  Divider,
  alpha,
  useTheme
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Search as SearchIcon,
  MyLocation as MyLocationIcon,
  RefreshOutlined as RefreshIcon,
  EditLocationAlt as EditLocationIcon,
  InfoOutlined as InfoIcon,
  PlaceOutlined as PlaceOutlinedIcon
} from '@mui/icons-material';
import { 
  searchLocationsThrottled,
  getLocationDetails,
  isValidLocation,
  getCurrentLocation
} from '../../utils/openMapService';

// Spotter.ai color scheme
const spotterColors = {
  navy: '#0A1A28',
  teal: '#1D9B8C',
  tealDark: '#17404C',
  tealLight: '#205F6B',
  coral: '#F05454',
  white: '#FFFFFF',
  lightGray: '#F5F5F5',
  lightBlue: '#E5F5F8',
  black: '#000000',
};

/**
 * A reusable place autocomplete component with OpenStreetMap integration and Spotter.ai styling
 */
const PlaceAutocomplete = ({
  value,
  onChange,
  onLocationSelected,
  label,
  placeholder,
  required = false,
  disabled = false,
  error = false,
  helperText = '',
  startIcon,
  currentLocationDetails = null
}) => {
  const theme = useTheme();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [validLocation, setValidLocation] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [manualMode, setManualMode] = useState(false);
  
  const inputRef = useRef(null);
  const attributionRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Create a ref to store the popper anchor element
  const anchorEl = useRef(null);

  // Check if current value has valid location details
  useEffect(() => {
    setValidLocation(isValidLocation(currentLocationDetails));
  }, [currentLocationDetails]);

  // Clear any timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Function to load suggestions based on input with automatic retry for failures
  const loadSuggestions = (inputValue, forceRefresh = false) => {
    // Don't reload if this is the same query as last time and not forcing refresh
    if (inputValue === lastQuery && !forceRefresh && suggestions.length > 0) {
      setOpen(true);
      return;
    }

    // Show dropdown even for very short inputs
    setOpen(true);
    setSearchAttempted(true);
    setErrorMessage('');
    setLastQuery(inputValue);
    
    // Don't search if input is completely empty
    if (!inputValue || inputValue.trim() === '') {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    
    // Use the throttled search function to prevent too many API calls
    searchLocationsThrottled(
      inputValue, 
      (results) => {
        setSuggestions(results);
        setLoading(false);
        
        if (results.length === 0 && inputValue.trim().length > 3) {
          setErrorMessage('No locations found. Try a different search term or less specific address.');
        }
      },
      {
        countryCode: 'us', // Limit to US
        // Use current location for context if available
        bounds: currentLocationDetails?.geometry?.location ? [
          // Handle both function and direct property access
          typeof currentLocationDetails.geometry.location.lng === 'function' 
            ? currentLocationDetails.geometry.location.lng() - 0.5
            : currentLocationDetails.geometry.location.lng - 0.5,
          typeof currentLocationDetails.geometry.location.lat === 'function'
            ? currentLocationDetails.geometry.location.lat() - 0.5
            : currentLocationDetails.geometry.location.lat - 0.5,
          typeof currentLocationDetails.geometry.location.lng === 'function'
            ? currentLocationDetails.geometry.location.lng() + 0.5
            : currentLocationDetails.geometry.location.lng + 0.5,
          typeof currentLocationDetails.geometry.location.lat === 'function'
            ? currentLocationDetails.geometry.location.lat() + 0.5
            : currentLocationDetails.geometry.location.lat + 0.5
        ] : undefined
      }
    );
  };

  // Retry loading suggestions after a failure
  const retryLoadSuggestions = () => {
    if (lastQuery && lastQuery.trim() !== '') {
      loadSuggestions(lastQuery, true);
    }
  };

  // Handle input change
  const handleInputChange = (event) => {
    const inputValue = event.target.value;
    
    // Update the controlled input value
    onChange(inputValue);
    
    // Reset valid location status when input changes
    if (validLocation) {
      setValidLocation(false);
    }

    // If the input is completely empty, we reset the search attempted state
    if (!inputValue.trim()) {
      setSearchAttempted(false);
      setErrorMessage('');
    }

    // Always show the dropdown
    setOpen(true);

    // Load suggestions with the new input if it's at least 2 characters
    // or if it contains common location indicators like 'street', 'ave', 'rd'
    if (inputValue.trim().length >= 2 || 
        /\s(st|ave|rd|ln|dr|blvd|hwy|pkwy|ct)\b/i.test(inputValue)) {
      loadSuggestions(inputValue);
    } else {
      setSuggestions([]);
      setLoading(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = async (suggestion) => {
    try {
      setLoading(true);
      setErrorMessage('');
      
      // Update input with the full suggestion text
      onChange(suggestion.formatted_address);
      
      // Close suggestions dropdown
      setOpen(false);
      setSuggestions([]);

      // Get detailed place information if needed
      // In many cases, the suggestion already has all we need
      let placeDetails = suggestion;
      if (suggestion.osm_type && suggestion.osm_id) {
        try {
          // Only get details if we need more info
          placeDetails = await getLocationDetails(
            suggestion.place_id,
            suggestion.osm_type,
            suggestion.osm_id
          );
        } catch (error) {
          console.warn('Could not fetch additional details, using basic info', error);
        }
      }

      // Mark as valid location
      setValidLocation(true);
      
      // Notify parent component about selection
      if (onLocationSelected) {
        onLocationSelected(placeDetails);
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      setValidLocation(false);
      setErrorMessage('Error retrieving location details. Please try another location.');
    } finally {
      setLoading(false);
    }
  };

  // Manual location validation
  const handleManualValidation = () => {
    if (!value || value.trim().length < 5) {
      setErrorMessage('Location is too short. Please enter a more specific address.');
      return;
    }

    // If we're in manual mode and coordinates are provided in format like "40.7128, -74.0060"
    const coordsMatch = value.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[2]);
      
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        // Valid coordinates
        const manualPlace = {
          place_id: `manual_coords_${Date.now()}`,
          formatted_address: value,
          name: 'Custom Location',
          geometry: {
            location: {
              lat,
              lng,
              // Add convenience functions for compatibility
              lat: function() { return lat; },
              lng: function() { return lng; }
            }
          }
        };
        
        setValidLocation(true);
        if (onLocationSelected) {
          onLocationSelected(manualPlace);
        }
        
        setOpen(false);
        return;
      }
    }
    
    // Create a simplified place object to simulate selection
    const manualPlace = {
      place_id: `manual_${Date.now()}`,
      formatted_address: value,
      name: value.split(',')[0].trim(),
      geometry: {
        location: {
          lat: 0,
          lng: 0,
          // Add convenience functions for compatibility
          lat: function() { return 0; },
          lng: function() { return 0; }
        }
      }
    };
    
    // Mark as valid and notify parent
    setValidLocation(true);
    if (onLocationSelected) {
      onLocationSelected(manualPlace);
    }
    
    // Close dropdown
    setOpen(false);
  };

  // Toggle manual entry mode
  const toggleManualMode = () => {
    setManualMode(!manualMode);
    if (!manualMode) {
      // Entering manual mode - focus the input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Handle click away from the component
  const handleClickAway = () => {
    setOpen(false);
  };

  // Enhance the focus handler to always show suggestions
  const handleFocus = () => {
    // Always show the dropdown when the field is focused
    setOpen(true);
    
    // If input has any value, load suggestions
    if (value && value.trim().length >= 2) {
      loadSuggestions(value);
    }
  };

  // Try to get the user's current location
  const handleUseCurrentLocation = () => {
    setLoading(true);
    setErrorMessage('');
    
    getCurrentLocation()
      .then(locationData => {
        // Update input with formatted address
        onChange(locationData.formatted_address);
        
        // Mark as valid and notify parent
        setValidLocation(true);
        if (onLocationSelected) {
          onLocationSelected(locationData);
        }
        
        // Close dropdown
        setOpen(false);
      })
      .catch(error => {
        console.error('Error getting current location:', error);
        setErrorMessage(error.message || 'Could not determine your current location. Please enter manually.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Add a key down handler to respond to keyboard navigation
  const handleKeyDown = (event) => {
    // If Enter is pressed and we have value but no suggestions are selected
    // This will reload suggestions for the current text
    if (event.key === 'Enter' && value) {
      if (suggestions.length === 0) {
        // If no suggestions are showing, try to reload them
        loadSuggestions(value, true);
      } else if (suggestions.length === 1) {
        // If only one suggestion, automatically select it
        handleSuggestionClick(suggestions[0]);
      }
      event.preventDefault(); // Prevent form submission
    }
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box sx={{ position: 'relative', width: '100%' }}>
        {/* Hidden attribution div (not needed for OSM but kept for compatibility) */}
        <div id="osm-attribution-container" ref={attributionRef} style={{ display: 'none' }} />
        
        {/* Input field */}
        <TextField
          inputRef={inputRef}
          fullWidth
          label={label}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          error={error || !!errorMessage}
          // Apply Spotter.ai theme colors
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: validLocation ? spotterColors.teal : (error || !!errorMessage) ? spotterColors.coral : spotterColors.tealLight,
              },
              '&.Mui-focused fieldset': {
                borderColor: validLocation ? spotterColors.teal : (error || !!errorMessage) ? spotterColors.coral : spotterColors.teal,
                borderWidth: '1px',
              },
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: validLocation ? spotterColors.teal : (error || !!errorMessage) ? spotterColors.coral : spotterColors.tealDark,
            },
            '& .MuiOutlinedInput-root.Mui-disabled': {
              '& fieldset': {
                borderColor: alpha(spotterColors.navy, 0.3),
              },
            },
            '& .MuiInputBase-input': {
              padding: '14px 14px 14px 0',
            },
          }}
          helperText={
            errorMessage ? (
              <Typography color={spotterColors.coral} variant="caption">{errorMessage}</Typography>
            ) : validLocation ? (
              <Typography color={spotterColors.teal} variant="caption">✓ Location verified</Typography>
            ) : loading ? (
              <Typography color={spotterColors.tealDark} variant="caption">Loading suggestions...</Typography>
            ) : (
              helperText || "Search for a location or select from suggestions"
            )
          }
          InputProps={{
            ref: (node) => {
              // Store for popper positioning
              anchorEl.current = node;
            },
            startAdornment: (
              <InputAdornment position="start">
                {startIcon || <LocationIcon sx={{ color: validLocation ? spotterColors.teal : spotterColors.tealDark }} />}
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end" sx={{ display: 'flex', gap: 0.5 }}>
                {loading ? (
                  <CircularProgress size={20} sx={{ color: spotterColors.teal }} />
                ) : validLocation ? (
                  <CheckCircleIcon sx={{ color: spotterColors.teal }} />
                ) : (
                  <>
                    {value && value.trim().length >= 5 && (
                      <Button
                        size="small"
                        variant="contained"
                        sx={{ 
                          padding: '3px 10px', 
                          minWidth: 0, 
                          fontSize: '0.7rem',
                          textTransform: 'none',
                          backgroundColor: spotterColors.teal,
                          '&:hover': {
                            backgroundColor: spotterColors.tealDark,
                          }
                        }}
                        onClick={handleManualValidation}
                      >
                        Confirm
                      </Button>
                    )}
                    
                    <Tooltip title={manualMode ? "Switch to suggestions mode" : "Switch to manual entry mode"}>
                      <IconButton
                        size="small"
                        onClick={toggleManualMode}
                        sx={{ 
                          color: manualMode ? spotterColors.teal : spotterColors.navy,
                          '&:hover': {
                            backgroundColor: alpha(spotterColors.lightBlue, 0.2),
                          }
                        }}
                      >
                        <EditLocationIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    
                    {errorMessage && !loading && (
                      <Tooltip title="Retry search">
                        <IconButton 
                          size="small" 
                          onClick={retryLoadSuggestions}
                          sx={{ 
                            color: spotterColors.coral,
                            '&:hover': {
                              backgroundColor: alpha(spotterColors.coral, 0.1),
                            }
                          }}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </>
                )}
              </InputAdornment>
            )
          }}
        />
        
        {/* Manual coordinates helper (visible only in manual mode) */}
        {manualMode && (
          <Box sx={{ 
            mt: 0.5, 
            p: 1.5, 
            bgcolor: alpha(spotterColors.lightBlue, 0.5), 
            border: '1px solid', 
            borderColor: spotterColors.tealLight, 
            borderRadius: 1,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <Typography variant="caption" sx={{ color: spotterColors.navy, fontWeight: 500 }}>
              <InfoIcon fontSize="inherit" sx={{ verticalAlign: 'text-bottom', mr: 0.5, color: spotterColors.tealDark }} />
              Manual entry mode: Enter an address or coordinates (lat, lng)
            </Typography>
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Chip 
                label="New York, NY" 
                size="small" 
                variant="outlined"
                onClick={() => onChange("New York, NY")}
                sx={{ 
                  borderColor: spotterColors.tealLight,
                  color: spotterColors.navy,
                  '&:hover': {
                    backgroundColor: alpha(spotterColors.lightBlue, 0.5),
                    borderColor: spotterColors.teal,
                  }
                }}
              />
              <Chip 
                label="40.7128, -74.0060" 
                size="small" 
                variant="outlined"
                onClick={() => onChange("40.7128, -74.0060")}
                sx={{ 
                  borderColor: spotterColors.tealLight,
                  color: spotterColors.navy,
                  '&:hover': {
                    backgroundColor: alpha(spotterColors.lightBlue, 0.5),
                    borderColor: spotterColors.teal,
                  }
                }}
              />
              <Chip 
                label="Los Angeles, CA" 
                size="small" 
                variant="outlined"
                onClick={() => onChange("Los Angeles, CA")}
                sx={{ 
                  borderColor: spotterColors.tealLight,
                  color: spotterColors.navy,
                  '&:hover': {
                    backgroundColor: alpha(spotterColors.lightBlue, 0.5),
                    borderColor: spotterColors.teal,
                  }
                }}
              />
              <Button 
                variant="contained" 
                size="small" 
                onClick={handleManualValidation}
                sx={{ 
                  ml: 'auto',
                  backgroundColor: spotterColors.teal,
                  '&:hover': {
                    backgroundColor: spotterColors.tealDark,
                  },
                  textTransform: 'none',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                Confirm Location
              </Button>
            </Box>
          </Box>
        )}
        
        {/* Suggestions dropdown - only show when not in manual mode */}
        {!manualMode && (
          <Popper
            open={open}
            anchorEl={anchorEl.current}
            placement="bottom-start"
            style={{ 
              zIndex: 1300,
              width: anchorEl.current ? anchorEl.current.clientWidth : undefined 
            }}
          >
            <Paper 
              elevation={4}
              sx={{ 
                maxHeight: '320px',
                overflow: 'auto',
                mt: 0.5,
                border: `1px solid ${alpha(spotterColors.tealLight, 0.3)}`,
                borderRadius: 1,
                background: spotterColors.white,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}
            >
              {/* "Use current location" option */}
              <ListItem
                button
                onClick={handleUseCurrentLocation}
                disabled={loading}
                sx={{
                  borderBottom: `1px solid ${alpha(spotterColors.tealLight, 0.2)}`,
                  py: 1.2,
                  transition: 'background-color 0.2s',
                  '&:hover': {
                    backgroundColor: alpha(spotterColors.lightBlue, 0.3),
                  },
                }}
              >
                <MyLocationIcon sx={{ mr: 1.5, color: spotterColors.teal }} />
                <ListItemText
                  primary={
                    <Typography sx={{ fontWeight: 500, color: spotterColors.navy }}>
                      Use my current location
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" sx={{ color: alpha(spotterColors.navy, 0.7), fontSize: '0.75rem' }}>
                      Requires location permission
                    </Typography>
                  }
                />
              </ListItem>

              <List sx={{ py: 0 }}>
                {loading ? (
                  <ListItem sx={{ display: 'flex', justifyContent: 'center', py: 2.5, flexDirection: 'column', gap: 1 }}>
                    <CircularProgress size={28} sx={{ color: spotterColors.teal }} />
                    <Typography sx={{ color: spotterColors.tealDark }}>Finding locations...</Typography>
                  </ListItem>
                ) : suggestions.length === 0 ? (
                  <ListItem>
                    <ListItemText 
                      primary={
                        value && value.trim() !== "" ? (
                          <Typography sx={{ fontStyle: 'italic', color: alpha(spotterColors.navy, 0.7), textAlign: 'center', py: 1 }}>
                            {searchAttempted ? (
                              <>
                                No results found. Try a different search term or 
                                <Button 
                                  size="small" 
                                  onClick={toggleManualMode}
                                  sx={{ 
                                    ml: 0.5, 
                                    textTransform: 'none', 
                                    color: spotterColors.teal,
                                    '&:hover': {
                                      backgroundColor: alpha(spotterColors.lightBlue, 0.3),
                                    }
                                  }}
                                >
                                  enter manually
                                </Button>
                              </>
                            ) : "Type to search for a location"}
                          </Typography>
                        ) : (
                          <Typography sx={{ fontStyle: 'italic', color: alpha(spotterColors.navy, 0.7), textAlign: 'center', py: 1 }}>
                            Type a location to see suggestions
                          </Typography>
                        )
                      } 
                    />
                  </ListItem>
                ) : (
                  <>
                    {suggestions.map((suggestion, index) => (
                      <ListItem
                        key={suggestion.place_id || index}
                        button
                        onClick={() => handleSuggestionClick(suggestion)}
                        sx={{
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: alpha(spotterColors.lightBlue, 0.3),
                          },
                          borderBottom: index < suggestions.length - 1 ? 
                            `1px solid ${alpha(spotterColors.tealLight, 0.15)}` : 'none',
                          py: 1.2,
                        }}
                      >
                        <PlaceOutlinedIcon sx={{ mr: 1.5, color: alpha(spotterColors.navy, 0.7) }} />
                        <ListItemText
                          primary={
                            <Typography sx={{ fontWeight: 500, color: spotterColors.navy, fontSize: '0.9rem' }}>
                              {suggestion.structured_formatting?.main_text || 
                               suggestion.formatted_address.split(',')[0]}
                            </Typography>
                          }
                          secondary={
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                color: alpha(spotterColors.navy, 0.7), 
                                fontSize: '0.75rem',
                                whiteSpace: 'normal',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                lineHeight: 1.4
                              }}
                            >
                              {suggestion.structured_formatting?.secondary_text || 
                               suggestion.formatted_address.substring(suggestion.formatted_address.indexOf(',') + 1)}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                    
                    {/* Help text for autocomplete suggestions */}
                    <Box 
                      sx={{ 
                        p: 1.2, 
                        bgcolor: alpha(spotterColors.lightBlue, 0.4),
                        borderTop: `1px solid ${alpha(spotterColors.tealLight, 0.2)}`
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: spotterColors.tealDark, 
                          textAlign: 'center', 
                          display: 'block',
                          fontWeight: 500
                        }}
                      >
                        <InfoIcon fontSize="inherit" sx={{ fontSize: '0.9rem', verticalAlign: 'text-bottom', mr: 0.5 }} />
                        Select a suggestion for the most accurate routing
                      </Typography>
                    </Box>
                  </>
                )}
                
                {/* Show this only if we have suggestions and user has typed something significant */}
                {suggestions.length > 0 && value && value.length > 3 && (
                  <Box sx={{ p: 1, borderTop: `1px dashed ${alpha(spotterColors.tealLight, 0.3)}` }}>
                    <Button
                      size="small"
                      fullWidth
                      onClick={toggleManualMode}
                      sx={{ 
                        textTransform: 'none',
                        color: spotterColors.teal,
                        fontSize: '0.8rem',
                        '&:hover': {
                          backgroundColor: alpha(spotterColors.lightBlue, 0.3),
                        }
                      }}
                    >
                      Can't find your location? Enter manually
                    </Button>
                  </Box>
                )}
              </List>
            </Paper>
          </Popper>
        )}
        
        {/* OpenStreetMap attribution */}
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            mt: 0.5, 
            fontSize: '0.65rem', 
            color: alpha(spotterColors.navy, 0.6),
            textAlign: 'right'
          }}
        >
          Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: spotterColors.tealDark }}>OpenStreetMap</a> contributors
        </Typography>
      </Box>
    </ClickAwayListener>
  );
};

export default PlaceAutocomplete; 