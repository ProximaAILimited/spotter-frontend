import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  Chip,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AccessTime as AccessTimeIcon,
  CalendarToday as CalendarTodayIcon,
  LocationOn as LocationOnIcon,
  DoubleArrow as DoubleArrowIcon,
  LocalShipping as LocalShippingIcon,
  EditLocation as EditLocationIcon,
  Autorenew as AutorenewIcon,
} from '@mui/icons-material';
import { getTripById, getEldLogDetails, autoFixTripCoordinates } from '../../utils/api';
import RouteMap from '../Maps/RouteMap';
import EldLogGrid from '../ELD/EldLogGrid';
import LocationCoordinatesFixer from '../Maps/LocationCoordinatesFixer';

const TripDetails = () => {
  const theme = useTheme();
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [activeLog, setActiveLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logLoading, setLogLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [coordsError, setCoordsError] = useState('');
  const [fixerOpen, setFixerOpen] = useState(false);
  const [autoFixing, setAutoFixing] = useState(false);
  
  // Helper function to check if coordinates are valid
  const hasValidCoordinates = (trip) => {
    if (!trip) return false;
    
    const startLat = parseFloat(trip.current_location_lat);
    const startLng = parseFloat(trip.current_location_lng);
    const endLat = parseFloat(trip.dropoff_location_lat);
    const endLng = parseFloat(trip.dropoff_location_lng);
    
    const isValidStart = !isNaN(startLat) && !isNaN(startLng) && 
                         Math.abs(startLat) > 0.001 && Math.abs(startLng) > 0.001;
    const isValidEnd = !isNaN(endLat) && !isNaN(endLng) && 
                       Math.abs(endLat) > 0.001 && Math.abs(endLng) > 0.001;
    
    if (!isValidStart || !isValidEnd) {
      setCoordsError('Missing coordinates for route calculation. Please make sure to select locations from the suggestion dropdown.');
      return false;
    }
    
    setCoordsError('');
    return true;
  };
  
  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const data = await getTripById(id);
        setTrip(data);
        
        // Check if coordinates are valid
        hasValidCoordinates(data);
        
        // If trip has logs, load the first one by default
        if (data.eld_logs && data.eld_logs.length > 0) {
          fetchLogDetails(data.eld_logs[0].id);
        }
      } catch (error) {
        console.error('Error fetching trip details:', error);
        setError('Unable to load trip details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrip();
  }, [id]);
  
  const fetchLogDetails = async (logId) => {
    setLogLoading(true);
    try {
      const data = await getEldLogDetails(logId);
      setActiveLog(data);
    } catch (error) {
      console.error('Error fetching log details:', error);
    } finally {
      setLogLoading(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  const handleTripUpdated = (updatedTrip) => {
    setTrip(updatedTrip);
    hasValidCoordinates(updatedTrip);
  };
  
  const handleAutoFix = async () => {
    setAutoFixing(true);
    setCoordsError('Fixing coordinates automatically...');
    
    try {
      console.log('Starting auto-fix for trip:', id);
      
      // Use our utility to automatically fix coordinates
      const updatedTrip = await autoFixTripCoordinates(id);
      console.log('Auto-fix completed, received updated trip data:', updatedTrip);
      
      // Thoroughly check for valid coordinates in the result
      const startLat = parseFloat(updatedTrip.current_location_lat);
      const startLng = parseFloat(updatedTrip.current_location_lng);
      const endLat = parseFloat(updatedTrip.dropoff_location_lat);
      const endLng = parseFloat(updatedTrip.dropoff_location_lng);
      
      console.log('Checking received coordinates:', {
        start: [startLat, startLng],
        end: [endLat, endLng]
      });
      
      const hasValidCoords = 
        !isNaN(startLat) && !isNaN(startLng) && 
        !isNaN(endLat) && !isNaN(endLng) &&
        Math.abs(startLat) > 0.001 && Math.abs(startLng) > 0.001 &&
        Math.abs(endLat) > 0.001 && Math.abs(endLng) > 0.001;
      
      if (hasValidCoords) {
        console.log('Valid coordinates received:', {
          start: [startLat, startLng],
          end: [endLat, endLng]
        });
        
        // Create a new object with the explicitly unpacked coordinates to ensure they're set
        const guaranteedTrip = {
          ...updatedTrip,
          current_location_lat: startLat.toString(),
          current_location_lng: startLng.toString(),
          dropoff_location_lat: endLat.toString(),
          dropoff_location_lng: endLng.toString()
        };
        
        // Set the trip to our guaranteed version
        setTrip(guaranteedTrip);
        
        // Show success message briefly 
        setCoordsError('Coordinates fixed successfully!');
        setTimeout(() => {
          if (hasValidCoordinates(guaranteedTrip)) {
            setCoordsError('');
          }
        }, 3000);
      } else {
        console.error('Auto-fix did not return valid coordinates:', {
          current_location_lat: updatedTrip.current_location_lat, 
          current_location_lng: updatedTrip.current_location_lng,
          dropoff_location_lat: updatedTrip.dropoff_location_lat,
          dropoff_location_lng: updatedTrip.dropoff_location_lng
        });
        
        // Even though the coordinates are invalid, update the trip with whatever we got
        setTrip(updatedTrip);
        setCoordsError('Auto-fix could not determine exact coordinates. Please try fixing manually, or refresh the page and try again.');
      }
    } catch (error) {
      console.error('Error auto-fixing coordinates:', error);
      setCoordsError('Error fixing coordinates automatically. Please try manual fixing or refresh the page.');
    } finally {
      setAutoFixing(false);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
  };
  
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      hour: 'numeric', 
      minute: 'numeric',
      hour12: true 
    }).format(date);
  };
  
  const formatDuration = (hours) => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    return `${wholeHours}h ${minutes}m`;
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 4 }}>
          {error}
        </Alert>
        <Button
          component={RouterLink}
          to="/"
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Back to Trip List
        </Button>
      </Container>
    );
  }
  
  if (!trip) {
    return (
      <Container maxWidth="lg">
        <Alert severity="warning" sx={{ mt: 4 }}>
          Trip not found
        </Alert>
        <Button
          component={RouterLink}
          to="/"
          startIcon={<ArrowBackIcon />}
          sx={{ mt: 2 }}
        >
          Back to Trip List
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Button
        component={RouterLink}
        to="/"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
      >
        Back to Trip List
      </Button>
      
      <Typography variant="h4" component="h1" gutterBottom>
        Trip Details
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Route Information
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <LocationOnIcon color="primary" fontSize="small" />
              <Typography variant="body1">
                <strong>From:</strong> {trip.current_location_formatted || trip.current_location}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <LocalShippingIcon color="primary" fontSize="small" />
              <Typography variant="body1">
                <strong>Pickup:</strong> {trip.pickup_location_formatted || trip.pickup_location}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <DoubleArrowIcon color="primary" fontSize="small" />
              <Typography variant="body1">
                <strong>Destination:</strong> {trip.dropoff_location_formatted || trip.dropoff_location}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Total Distance:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {Math.round(trip.total_distance || 0)} miles
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Total Duration:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDuration(trip.total_duration || 0)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Trip Days:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {trip.eld_logs?.length || 0}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Created On:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(trip.created_at)}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <Box sx={{ mb: 4 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Route Map" />
          <Tab label="Stops" />
          <Tab label="ELD Logs" />
        </Tabs>
        
        <Box sx={{ mt: 2 }}>
          {/* Route Map Tab */}
          {tabValue === 0 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Route Map
              </Typography>
              
              {coordsError && (
                <Alert 
                  severity={coordsError.includes('success') ? 'success' : 'warning'} 
                  sx={{ 
                    mb: 2,
                    '& .MuiAlert-message': {
                      width: '100%'
                    }
                  }}
                  action={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {!coordsError.includes('success') && (
                        <>
                          <Button
                            color="inherit"
                            size="small"
                            startIcon={<AutorenewIcon />}
                            onClick={handleAutoFix}
                            disabled={autoFixing}
                            sx={{ mr: 1 }}
                          >
                            {autoFixing ? (
                              <>
                                <CircularProgress size={16} color="inherit" sx={{ mr: 1 }} />
                                Fixing...
                              </>
                            ) : 'Auto-Fix'}
                          </Button>
                          <Button
                            color="inherit"
                            size="small"
                            startIcon={<EditLocationIcon />}
                            onClick={() => setFixerOpen(true)}
                          >
                            Fix Manually
                          </Button>
                        </>
                      )}
                    </Box>
                  }
                >
                  <Box>
                    {coordsError}
                    {!coordsError.includes('success') && !coordsError.includes('Fixing') && (
                      <Typography variant="caption" component="div" sx={{ mt: 1, color: 'text.secondary' }}>
                        This issue prevents the route map from displaying properly. Please use one of the fix options.
                      </Typography>
                    )}
                  </Box>
                </Alert>
              )}
              
              <RouteMap 
                trip={trip} 
                stops={trip.stops || []} 
              />
              
              {/* Location Coordinates Fixer Dialog */}
              <LocationCoordinatesFixer
                open={fixerOpen}
                onClose={() => setFixerOpen(false)}
                trip={trip}
                onTripUpdated={handleTripUpdated}
              />
            </Paper>
          )}
          
          {/* Stops Tab */}
          {tabValue === 1 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Trip Stops
              </Typography>
              {trip.stops && trip.stops.length > 0 ? (
                <Box>
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {trip.stops.length} stops along the route
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total distance: {Math.round(trip.total_distance || 0)} miles
                    </Typography>
                  </Box>
                  {trip.stops.map((stop, index) => (
                    <Card key={index} sx={{ mb: 2, border: '1px solid #eee' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip 
                              label={stop.stop_type_display} 
                              color={
                                stop.stop_type === 'PICKUP' ? 'primary' :
                                stop.stop_type === 'DROPOFF' ? 'secondary' :
                                stop.stop_type === 'REST' ? 'info' : 'default'
                              }
                              size="small"
                            />
                            <Typography variant="subtitle1">
                              {stop.location}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {Math.round(stop.distance_from_start)} miles
                            {index > 0 && stop.distance_from_previous && 
                              ` (+${Math.round(stop.distance_from_previous)} from previous)`
                            }
                          </Typography>
                        </Box>
                        
                        <Divider sx={{ my: 1 }} />
                        
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <AccessTimeIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                Arrival:
                              </Typography>
                            </Box>
                            <Typography variant="body2">
                              {formatDate(stop.arrival_time)} at {formatTime(stop.arrival_time)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <AccessTimeIcon fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                Departure:
                              </Typography>
                            </Box>
                            <Typography variant="body2">
                              {stop.departure_time ? (
                                `${formatDate(stop.departure_time)} at ${formatTime(stop.departure_time)}`
                              ) : 'N/A'}
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        <Box display="flex" alignItems="center" gap={1} mt={1}>
                          <Typography variant="body2" color="text.secondary">
                            Duration:
                          </Typography>
                          <Typography variant="body2">
                            {formatDuration(stop.duration)}
                          </Typography>
                        </Box>
                        
                        {stop.facilities && (
                          <Box display="flex" gap={1} mt={2} flexWrap="wrap">
                            {stop.facilities.includes('FUEL') && (
                              <Chip label="Fuel" size="small" variant="outlined" />
                            )}
                            {stop.facilities.includes('FOOD') && (
                              <Chip label="Food" size="small" variant="outlined" />
                            )}
                            {stop.facilities.includes('REST') && (
                              <Chip label="Rest Area" size="small" variant="outlined" />
                            )}
                            {stop.facilities.includes('SHOWER') && (
                              <Chip label="Shower" size="small" variant="outlined" />
                            )}
                          </Box>
                        )}
                        
                        {stop.notes && (
                          <Box mt={2}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Notes:
                            </Typography>
                            <Typography variant="body2">
                              {stop.notes}
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <Typography>No stops found for this trip.</Typography>
              )}
            </Paper>
          )}
          
          {/* ELD Logs Tab */}
          {tabValue === 2 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                ELD Logs
              </Typography>
              
              {trip.eld_logs && trip.eld_logs.length > 0 ? (
                <Box>
                  <Box display="flex" gap={1} mb={3} sx={{ overflowX: 'auto', pb: 1 }}>
                    {trip.eld_logs.map((log) => (
                      <Button
                        key={log.id}
                        variant={activeLog && activeLog.day_number === log.day_number ? 'contained' : 'outlined'}
                        size="small"
                        onClick={() => fetchLogDetails(log.id)}
                        sx={{ minWidth: '90px' }}
                      >
                        <Box display="flex" flexDirection="column">
                          <Typography variant="caption">Day</Typography>
                          <Typography variant="button">{log.day_number}</Typography>
                        </Box>
                      </Button>
                    ))}
                  </Box>
                  
                  {logLoading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                      <CircularProgress />
                    </Box>
                  ) : activeLog ? (
                    <Box>
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <CalendarTodayIcon fontSize="small" color="primary" />
                        <Typography variant="subtitle1">
                          {formatDate(activeLog.date)}
                        </Typography>
                      </Box>
                      
                      <EldLogGrid logData={activeLog} />
                      
                      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                        Activities
                      </Typography>
                      
                      <Box>
                        {activeLog.activities.map((activity, index) => (
                          <Card key={index} sx={{ mb: 2, border: '1px solid #eee' }}>
                            <CardContent>
                              <Box display="flex" justifyContent="space-between" alignItems="center">
                                <Chip 
                                  label={activity.activity_type} 
                                  color={
                                    activity.activity_type === 'DRIVING' ? 'warning' :
                                    activity.activity_type === 'ON_DUTY' ? 'success' :
                                    activity.activity_type === 'OFF_DUTY' ? 'info' : 'default'
                                  }
                                  size="small"
                                />
                                <Typography variant="body2">
                                  {activity.start_time} - {activity.end_time}
                                </Typography>
                              </Box>
                              
                              <Box display="flex" justifyContent="space-between" mt={1}>
                                <Typography variant="body2">
                                  {activity.location}
                                </Typography>
                                <Typography variant="body2">
                                  Duration: {formatDuration(activity.duration)}
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    </Box>
                  ) : (
                    <Typography>Select a day to view the ELD log details.</Typography>
                  )}
                </Box>
              ) : (
                <Typography>No ELD logs found for this trip.</Typography>
              )}
            </Paper>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default TripDetails; 