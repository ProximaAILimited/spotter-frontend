import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  CircularProgress, 
  Alert, 
  Button, 
  Chip,
  alpha,
  useTheme
} from '@mui/material';
import PropTypes from 'prop-types';
import { 
  LocationOn as LocationIcon,
  DirectionsCar as DirectionsCarIcon,
  Navigation as NavigationIcon,
  AltRoute as AltRouteIcon,
  ErrorOutline as ErrorOutlineIcon,
  RestartAlt as RestartAltIcon
} from '@mui/icons-material';
import { loadLeaflet } from '../../utils/openMapService';

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

// OpenStreetMap component implementation using Leaflet
const RouteMap = ({ trip, stops }) => {
  const theme = useTheme();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routingControlRef = useRef(null);
  const markersRef = useRef([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  
  // Initialize the map with Leaflet
  const initializeMap = useCallback(() => {
    // Check if Leaflet is loaded
    if (!window.L) {
      setError('Map library not loaded. Please refresh the page.');
      setLoading(false);
      return;
    }
    
    try {
      // Create map instance with custom styles
      const map = window.L.map(mapRef.current, {
        center: [39.8283, -98.5795], // Center of US
        zoom: 4,
        zoomControl: false, // We'll add it in a better position
        layers: [
          window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
          })
        ]
      });
      
      // Add zoom control to top-right
      window.L.control.zoom({
        position: 'topright'
      }).addTo(map);
      
      // Apply custom styles to attribution control
      setTimeout(() => {
        const attributionControl = document.querySelector('.leaflet-control-attribution');
        if (attributionControl) {
          attributionControl.style.padding = '3px 8px';
          attributionControl.style.backgroundColor = `${alpha(spotterColors.navy, 0.8)}`;
          attributionControl.style.color = spotterColors.white;
          attributionControl.style.fontSize = '9px';
          attributionControl.style.borderRadius = '4px 0 0 0';
          
          // Style links within attribution
          const links = attributionControl.querySelectorAll('a');
          links.forEach(link => {
            link.style.color = spotterColors.lightBlue;
          });
        }
      }, 500);
      
      mapInstanceRef.current = map;
      
      // Calculate and display route
      calculateRoute();
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map. Please try again later.');
      setLoading(false);
    }
  }, [trip, stops]);
  
  // Calculate and display the route
  const calculateRoute = useCallback(() => {
    if (!mapInstanceRef.current) return;
    
    // Clear previous markers and route
    clearMap();
    
    try {
      // Log what we're working with
      console.log('Route calculation with trip data:', {
        current: [trip.current_location_lat, trip.current_location_lng],
        pickup: [trip.pickup_location_lat, trip.pickup_location_lng],
        dropoff: [trip.dropoff_location_lat, trip.dropoff_location_lng]
      });
      
      // First, get all waypoints (start, stops, end)
      const waypoints = [];
      let hasValidWaypoints = true;
      
      // Add origin - be extra careful with parsing
      const origin = {
        lat: typeof trip.current_location_lat === 'string' ? 
             parseFloat(trip.current_location_lat.replace(/[^\d.-]/g, '')) : 
             parseFloat(trip.current_location_lat) || 0,
        lng: typeof trip.current_location_lng === 'string' ? 
             parseFloat(trip.current_location_lng.replace(/[^\d.-]/g, '')) : 
             parseFloat(trip.current_location_lng) || 0,
        name: trip.current_location_formatted || trip.current_location,
        type: 'START'
      };
      
      const isValidOrigin = !isNaN(origin.lat) && !isNaN(origin.lng) && 
                            Math.abs(origin.lat) > 0.001 && Math.abs(origin.lng) > 0.001;
      
      if (!isValidOrigin) {
        console.warn('Invalid origin coordinates:', origin);
        hasValidWaypoints = false;
      } else {
        console.log('Valid origin coordinates:', origin);
      }
      
      waypoints.push(origin);
      
      // Add stops
      if (stops && stops.length > 0) {
        stops.forEach(stop => {
          // Handle various property naming conventions and be extra careful with parsing
          const stopPoint = {
            lat: typeof stop.location_lat === 'string' ? 
                 parseFloat(stop.location_lat.replace(/[^\d.-]/g, '')) : 
                 typeof stop.lat === 'string' ? 
                 parseFloat(stop.lat.replace(/[^\d.-]/g, '')) : 
                 parseFloat(stop.location_lat || stop.lat || stop.latitude || 0),
            lng: typeof stop.location_lng === 'string' ? 
                 parseFloat(stop.location_lng.replace(/[^\d.-]/g, '')) : 
                 typeof stop.lng === 'string' ? 
                 parseFloat(stop.lng.replace(/[^\d.-]/g, '')) : 
                 parseFloat(stop.location_lng || stop.lng || stop.longitude || 0),
            name: stop.location,
            type: stop.stop_type || 'STOP'
          };
          
          const isValidStop = !isNaN(stopPoint.lat) && !isNaN(stopPoint.lng) && 
                              Math.abs(stopPoint.lat) > 0.001 && Math.abs(stopPoint.lng) > 0.001;
          
          if (!isValidStop) {
            console.warn('Invalid stop coordinates:', stopPoint);
          } else {
            console.log('Valid stop coordinates:', stopPoint);
          }
          
          waypoints.push(stopPoint);
        });
      }
      
      // Add destination - be extra careful with parsing
      const destination = {
        lat: typeof trip.dropoff_location_lat === 'string' ? 
             parseFloat(trip.dropoff_location_lat.replace(/[^\d.-]/g, '')) : 
             parseFloat(trip.dropoff_location_lat) || 0,
        lng: typeof trip.dropoff_location_lng === 'string' ? 
             parseFloat(trip.dropoff_location_lng.replace(/[^\d.-]/g, '')) : 
             parseFloat(trip.dropoff_location_lng) || 0,
        name: trip.dropoff_location_formatted || trip.dropoff_location,
        type: 'END'
      };
      
      const isValidDestination = !isNaN(destination.lat) && !isNaN(destination.lng) && 
                                Math.abs(destination.lat) > 0.001 && Math.abs(destination.lng) > 0.001;
      
      if (!isValidDestination) {
        console.warn('Invalid destination coordinates:', destination);
        hasValidWaypoints = false;
      } else {
        console.log('Valid destination coordinates:', destination);
      }
      
      waypoints.push(destination);
      
      // Filter valid waypoints (for display purposes)
      const validWaypoints = waypoints.filter(wp => 
        !isNaN(wp.lat) && !isNaN(wp.lng) && 
        Math.abs(wp.lat) > 0.001 && Math.abs(wp.lng) > 0.001
      );
      
      console.log(`Found ${validWaypoints.length} valid waypoints out of ${waypoints.length} total`);
      
      // Add markers for any valid waypoints we have
      if (validWaypoints.length > 0) {
        console.log('Adding markers for valid waypoints:', validWaypoints.length);
        addMarkers(validWaypoints);
        
        // Fit bounds to valid waypoints
        const bounds = validWaypoints.map(wp => [wp.lat, wp.lng]);
        if (bounds.length > 0) {
          mapInstanceRef.current.fitBounds(bounds, {
            padding: [50, 50],
            maxZoom: 12
          });
        }
      }
      
      // If we don't have valid start and end coordinates, show an error but still display any valid points
      // Check if we have at least two valid waypoints (one for start, one for end)
      const validStart = validWaypoints.find(wp => wp.type === 'START');
      const validEnd = validWaypoints.find(wp => wp.type === 'END');
      
      if (!validStart || !validEnd) {
        console.warn('Missing essential waypoints:', { validStart, validEnd });
        setError('Missing coordinates for complete route calculation. Any available locations are shown on the map.');
        setLoading(false);
        return;
      }
      
      // We have the minimum required waypoints for routing (valid start and end)
      console.log('Valid start and end points confirmed:', { 
        start: [validStart.lat, validStart.lng],
        end: [validEnd.lat, validEnd.lng]
      });
      
      // Clear any previous error since we have valid coordinates
      setError('');
      
      // Need at least 2 waypoints for routing
      if (validWaypoints.length < 2) {
        setError('Not enough valid waypoints to calculate a route.');
        setLoading(false);
        return;
      }
      
      // Fetch route from OSRM
      const wayPointsString = validWaypoints
        .map(wp => `${wp.lng},${wp.lat}`)
        .join(';');
      
      console.log('Requesting route with waypoints:', validWaypoints.length);
      console.log('Route request URL waypoints:', wayPointsString);
      
      fetch(`https://router.project-osrm.org/route/v1/driving/${wayPointsString}?overview=full&geometries=polyline&steps=true`)
        .then(res => res.json())
        .then(data => {
          if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            console.error('OSRM route calculation failed:', data);
            throw new Error('Failed to calculate route');
          }
          
          // Get the route details
          const route = data.routes[0];

          try {
            // Decode polyline
            const coordinates = window.L.Polyline.fromEncoded(route.geometry).getLatLngs();
            
            // Create route line with gradient effect
            const routeLine = window.L.polyline(coordinates, {
              color: spotterColors.teal,
              weight: 5,
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round'
            }).addTo(mapInstanceRef.current);
            
            // Try to add decorations with error handling
            let arrowDecorator = null;
            try {
              // Add arrow decorations to indicate direction - try both plugin and custom implementation
              if (window.L.PolylineDecorator) {
                // Use the proper plugin if available
                arrowDecorator = window.L.polylineDecorator([
                  routeLine
                ], {
                  patterns: [
                    {
                      offset: '5%',
                      repeat: '10%',
                      symbol: window.L.Symbol.arrowHead({
                        pixelSize: 12,
                        pathOptions: {
                          color: spotterColors.tealDark,
                          fillOpacity: 0.8,
                          weight: 0
                        }
                      })
                    }
                  ]
                }).addTo(mapInstanceRef.current);
              } else if (window.L.polylineDecorator) {
                // Fall back to our custom implementation
                arrowDecorator = window.L.polylineDecorator(routeLine, {
                  color: spotterColors.tealDark
                }).addTo(mapInstanceRef.current);
              } else {
                // If no decorator is available, add a simple marker in the middle
                const latlngs = routeLine.getLatLngs();
                if (latlngs.length > 1) {
                  const middleIndex = Math.floor(latlngs.length / 2);
                  const midpoint = latlngs[middleIndex];
                  
                  const arrowIcon = window.L.divIcon({
                    html: `<div style="
                      transform: rotate(45deg);
                      width: 10px;
                      height: 10px;
                      border-top: 3px solid ${spotterColors.tealDark};
                      border-right: 3px solid ${spotterColors.tealDark};
                    "></div>`,
                    className: 'arrow-decorator',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                  });
                  
                  arrowDecorator = window.L.marker([midpoint.lat, midpoint.lng], {
                    icon: arrowIcon,
                    interactive: false
                  }).addTo(mapInstanceRef.current);
                }
              }
            } catch (decoratorError) {
              console.warn("Failed to add polyline decorations:", decoratorError);
              // Continue without decorations
            }
            
            // Store reference - handle both with and without decorations
            routingControlRef.current = arrowDecorator ? 
              (Array.isArray(arrowDecorator) ? [routeLine, ...arrowDecorator] : [routeLine, arrowDecorator]) : 
              [routeLine];
            
            // Fit map to route
            mapInstanceRef.current.fitBounds(routeLine.getBounds(), {
              padding: [50, 50]
            });
            
            // Set distance and duration
            const totalDistanceInMiles = Math.round(route.distance / 1609.34);
            const totalDurationInHours = Math.round((route.duration / 3600) * 10) / 10;
            
            setRouteDistance(totalDistanceInMiles);
            setRouteDuration(totalDurationInHours);
            setLoading(false);
          } catch (renderError) {
            console.error('Error rendering the route:', renderError);
            throw new Error('Could not render the route. Please try again.');
          }
        })
        .catch(err => {
          console.error('Error calculating route:', err);
          
          // Fallback to straight lines between points if OSRM fails
          const pointsForLine = validWaypoints
            .map(wp => [wp.lat, wp.lng]);
            
          if (pointsForLine.length >= 2) {
            const straightLine = window.L.polyline(pointsForLine, {
              color: spotterColors.coral,
              weight: 3,
              opacity: 0.7,
              dashArray: '5, 10'
            }).addTo(mapInstanceRef.current);
            
            routingControlRef.current = [straightLine];
            
            mapInstanceRef.current.fitBounds(straightLine.getBounds(), {
              padding: [50, 50]
            });
            
            // Estimate distance and duration (straight line)
            const estimatedDistance = Math.round(trip.total_distance || 0);
            const estimatedDuration = Math.round(trip.total_duration || 0);
            
            setRouteDistance(estimatedDistance);
            setRouteDuration(estimatedDuration);
            setError('Could not calculate detailed route. Showing approximate path.');
          } else {
            setError('Could not calculate route. Please check your addresses and try again.');
          }
          
          setLoading(false);
        });
    } catch (err) {
      console.error('Error in route calculation:', err);
      setError('Could not calculate route. Please check your addresses and try again.');
      setLoading(false);
    }
  }, [trip, stops]);
  
  // Clear map data
  const clearMap = () => {
    // Clear previous markers
    if (markersRef.current.length) {
      markersRef.current.forEach(marker => {
        if (mapInstanceRef.current) {
          marker.remove();
        }
      });
      markersRef.current = [];
    }
    
    // Clear previous route
    if (routingControlRef.current) {
      if (Array.isArray(routingControlRef.current)) {
        routingControlRef.current.forEach(element => element.remove());
      } else {
        routingControlRef.current.remove();
      }
      routingControlRef.current = null;
    }
  };
  
  // Add markers to the map
  const addMarkers = (waypoints) => {
    if (!mapInstanceRef.current) return;
    
    waypoints.forEach((point, index) => {
      if (point.lat === 0 && point.lng === 0) return;
      
      // Choose icon color based on stop type
      let iconColor = spotterColors.coral; // Default
      let borderColor = spotterColors.white;
      let shadowColor = alpha(spotterColors.navy, 0.3);
      let size = 14;
      let borderWidth = 3;
      
      switch (point.type) {
        case 'START':
          iconColor = spotterColors.teal; // Teal for start
          size = 16;
          break;
        case 'END':
          iconColor = spotterColors.coral; // Coral for end
          size = 16;
          break;
        case 'PICKUP':
          iconColor = spotterColors.tealLight; // Light teal for pickup
          break;
        case 'DROPOFF':
          iconColor = spotterColors.tealDark; // Dark teal for dropoff
          break;
        case 'REST':
          iconColor = '#F39C12'; // Orange for rest
          break;
        default:
          iconColor = '#F1C40F'; // Yellow for other stops
      }
      
      // Create custom icon with pulse effect for start/end
      const isPrimary = ['START', 'END'].includes(point.type);
      const pulseEffect = isPrimary ? 
        `<div class="pulse-ring" style="position: absolute; top: -5px; left: -5px; right: -5px; bottom: -5px; border-radius: 50%; background-color: ${alpha(iconColor, 0.3)}; animation: pulse 2s infinite;"></div>` : '';
        
      const html = `
        <div style="position: relative;">
          ${pulseEffect}
          <div style="
            background-color: ${iconColor}; 
            width: ${size}px; 
            height: ${size}px; 
            border-radius: 50%; 
            border: ${borderWidth}px solid ${borderColor};
            box-shadow: 0 2px 5px ${shadowColor};
            position: relative;
          "></div>
          ${isPrimary ? `<div style="position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); background-color: ${alpha(spotterColors.navy, 0.75)}; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; white-space: nowrap;">${index === 0 ? 'Start' : 'End'}</div>` : ''}
        </div>
      `;
      
      // Create marker
      const icon = window.L.divIcon({
        className: 'custom-pin',
        html: html,
        iconSize: [size + borderWidth * 2, size + borderWidth * 2],
        iconAnchor: [(size + borderWidth * 2) / 2, (size + borderWidth * 2) / 2 + (isPrimary ? 10 : 0)]
      });
      
      // Create marker
      const marker = window.L.marker([point.lat, point.lng], {
        icon: icon,
        title: point.name
      }).addTo(mapInstanceRef.current);
      
      // Add popup with enhanced styling
      const popupContent = `
        <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; padding: 2px;">
          <div style="font-weight: 600; color: ${spotterColors.navy}; margin-bottom: 4px; font-size: 14px;">${point.name}</div>
          <div style="color: ${spotterColors.tealDark}; font-size: 12px; padding: 3px 6px; background-color: ${alpha(spotterColors.lightBlue, 0.5)}; border-radius: 4px; display: inline-block;">
            ${point.type.charAt(0) + point.type.slice(1).toLowerCase()}
          </div>
        </div>
      `;
      
      marker.bindPopup(popupContent, {
        className: 'spotter-popup',
        closeButton: false,
        offset: [0, -8]
      });
      
      // Open popup on hover
      marker.on('mouseover', function() {
        this.openPopup();
      });
      
      marker.on('mouseout', function() {
        this.closePopup();
      });
      
      // Store marker reference
      markersRef.current.push(marker);
    });
    
    // If we have at least one marker, fit bounds
    if (markersRef.current.length > 0) {
      const group = window.L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds(), {
        padding: [50, 50]
      });
    }
    
    // Add pulse animation style
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes pulse {
        0% {
          transform: scale(0.95);
          opacity: 0.7;
        }
        70% {
          transform: scale(1.5);
          opacity: 0;
        }
        100% {
          transform: scale(0.95);
          opacity: 0;
        }
      }
      
      .spotter-popup .leaflet-popup-content-wrapper {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 3px 14px rgba(0,0,0,0.15);
      }
      
      .spotter-popup .leaflet-popup-tip {
        background-color: white;
      }
    `;
    document.head.appendChild(style);
  };
  
  // Load Leaflet script and initialize map
  useEffect(() => {
    const loadMapLibrary = async () => {
      try {
        // Load Leaflet
        await loadLeaflet();
        
        // Add polyline encoding/decoding support
        if (window.L && !window.L.Polyline.fromEncoded) {
          // Add polyline encoding/decoding (from Leaflet.encoded plugin)
          window.L.Polyline.fromEncoded = function(encoded, options) {
            const decode = function(encoded, precision) {
              precision = precision || 5;
              const factor = Math.pow(10, precision);
              
              let lat = 0, lng = 0;
              const coords = [];
              let shift = 0, result = 0, byte = null;
              let latPrev = 0, lngPrev = 0;
              
              for (let i = 0; i < encoded.length; i++) {
                byte = encoded.charCodeAt(i) - 63;
                result = (byte & 0x1f) << shift;
                shift += 5;
                
                if (byte >= 0x20) {
                  continue;
                }
                
                lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
                shift = 0;
                result = 0;
                
                for (; i < encoded.length; i++) {
                  byte = encoded.charCodeAt(i) - 63;
                  result = (byte & 0x1f) << shift;
                  shift += 5;
                  
                  if (byte >= 0x20) {
                    continue;
                  }
                  
                  lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
                  break;
                }
                
                coords.push([lat / factor, lng / factor]);
              }
              
              return coords;
            };
            
            return window.L.polyline(decode(encoded), options);
          };
        }
        
        // Add a simplified polyline decorator implementation
        if (window.L && !window.L.polylineDecorator) {
          window.L.polylineDecorator = function(path, options = {}) {
            // Use a simple approach to add arrows to a polyline
            const decoratorGroup = window.L.featureGroup();
            
            // Only add decorations if we have valid options
            if (path && path.getLatLngs) {
              try {
                const latlngs = path.getLatLngs();
                
                // If we have enough points, add an arrow in the middle
                if (latlngs.length > 1) {
                  // Find the middle segment
                  const middleIndex = Math.floor(latlngs.length / 2);
                  const p1 = latlngs[middleIndex - 1];
                  const p2 = latlngs[middleIndex];
                  
                  // Find the middle point and create a heading
                  const midLat = (p1.lat + p2.lat) / 2;
                  const midLng = (p1.lng + p2.lng) / 2;
                  
                  // Create a simple arrow marker
                  const arrowIcon = window.L.divIcon({
                    html: `<div style="
                      transform: rotate(45deg);
                      width: 10px;
                      height: 10px;
                      border-top: 3px solid ${options.color || spotterColors.tealDark};
                      border-right: 3px solid ${options.color || spotterColors.tealDark};
                    "></div>`,
                    className: 'arrow-decorator',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                  });
                  
                  const marker = window.L.marker([midLat, midLng], {
                    icon: arrowIcon,
                    interactive: false
                  });
                  
                  decoratorGroup.addLayer(marker);
                  
                  // Calculate angle for the marker rotation (if we wanted to)
                  // const angle = Math.atan2(p2.lat - p1.lat, p2.lng - p1.lng) * 180 / Math.PI;
                  // We could set the rotation but for simplicity we'll skip that
                }
              } catch (err) {
                console.warn("Failed to add polyline decorations:", err);
                // Just return the empty group if we had an error
              }
            }
            
            return decoratorGroup;
          };
        }
        
        console.log("Leaflet loaded successfully, initializing map...");
        initializeMap();
      } catch (err) {
        console.error('Error loading map library:', err);
        setError('Failed to load map library. Please refresh the page and try again.');
        setLoading(false);
      }
    };
    
    loadMapLibrary();
    
    return () => {
      // Cleanup
      clearMap();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [initializeMap]);
  
  return (
    <Box>
      {error && (
        <Alert 
          severity="error" 
          sx={{ 
            mb: 2, 
            borderRadius: 1.5,
            backgroundColor: alpha(spotterColors.coral, 0.1),
            borderLeft: `4px solid ${spotterColors.coral}`,
            '& .MuiAlert-icon': {
              color: spotterColors.coral
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ErrorOutlineIcon sx={{ color: spotterColors.coral, mr: 1 }} />
            <Typography sx={{ color: alpha(spotterColors.navy, 0.9), fontWeight: 500 }}>
              {error}
            </Typography>
          </Box>
        </Alert>
      )}
      
      <Paper
        elevation={3}
        sx={{
          height: '450px',
          width: '100%',
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: `0 6px 20px ${alpha(spotterColors.navy, 0.15)}`,
          border: `1px solid ${alpha(spotterColors.tealLight, 0.2)}`,
        }}
      >
        {loading && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              backgroundColor: alpha(spotterColors.white, 0.7),
              zIndex: 999,
              flexDirection: 'column'
            }}
          >
            <CircularProgress sx={{ color: spotterColors.teal, mb: 2 }} />
            <Typography variant="body2" sx={{ color: spotterColors.tealDark, fontWeight: 500 }}>
              Calculating optimal route...
            </Typography>
          </Box>
        )}
        
        <div 
          ref={mapRef} 
          style={{ 
            height: '100%', 
            width: '100%' 
          }}
        />
        
        {error && !window.L && (
          <Box 
            sx={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              right: 0, 
              bottom: 0, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              flexDirection: 'column',
              backgroundColor: alpha(spotterColors.lightGray, 0.9),
              padding: 3,
              textAlign: 'center'
            }}
          >
            <ErrorOutlineIcon sx={{ color: spotterColors.coral, fontSize: 48, mb: 2 }} />
            <Typography variant="h6" sx={{ color: spotterColors.navy, mb: 1, fontWeight: 600 }}>
              Map failed to load
            </Typography>
            <Typography variant="body2" sx={{ color: alpha(spotterColors.navy, 0.7), mb: 3 }}>
              {error}
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<RestartAltIcon />}
              onClick={() => window.location.reload()}
              sx={{ 
                background: `linear-gradient(to right, ${spotterColors.teal}, ${spotterColors.tealLight})`,
                color: spotterColors.white,
                fontWeight: 500,
                boxShadow: '0 4px 12px rgba(29, 155, 140, 0.3)',
                '&:hover': {
                  boxShadow: '0 6px 16px rgba(29, 155, 140, 0.4)',
                  background: `linear-gradient(to right, ${spotterColors.tealDark}, ${spotterColors.teal})`,
                },
                borderRadius: 1.5,
                textTransform: 'none',
              }}
            >
              Retry
            </Button>
          </Box>
        )}
      </Paper>
      
      <Box 
        sx={{ 
          mt: 2.5,
          p: 2,
          borderRadius: 2,
          backgroundColor: alpha(spotterColors.lightBlue, 0.3),
          border: `1px solid ${alpha(spotterColors.tealLight, 0.2)}`,
        }}
      >
        <Typography 
          variant="subtitle1" 
          gutterBottom 
          sx={{ 
            color: spotterColors.navy, 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            mb: 1.5
          }}
        >
          <NavigationIcon sx={{ mr: 1, color: spotterColors.teal }} />
          Trip Summary
        </Typography>
        
        <Box 
          sx={{ 
            display: 'flex',
            flexWrap: 'wrap',
            gap: 2,
            mb: 2
          }}
        >
          <Chip
            icon={<LocationIcon />}
            label={`From: ${trip.current_location_formatted || trip.current_location}`}
            sx={{ 
              backgroundColor: alpha(spotterColors.teal, 0.1),
              color: spotterColors.navy,
              fontWeight: 500,
              '& .MuiChip-icon': { color: spotterColors.teal }
            }}
          />
          
          <Chip
            icon={<LocationIcon />}
            label={`To: ${trip.dropoff_location_formatted || trip.dropoff_location}`}
            sx={{ 
              backgroundColor: alpha(spotterColors.coral, 0.1),
              color: spotterColors.navy,
              fontWeight: 500,
              '& .MuiChip-icon': { color: spotterColors.coral }
            }}
          />
        </Box>
        
        <Box 
          sx={{ 
            display: 'flex', 
            gap: 3, 
            flexWrap: 'wrap', 
            mt: 1, 
            p: 1.5,
            backgroundColor: spotterColors.white,
            borderRadius: 1.5,
            boxShadow: `inset 0 1px 3px ${alpha(spotterColors.navy, 0.1)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AltRouteIcon sx={{ color: spotterColors.teal, mr: 1 }} />
            <Typography variant="body2" sx={{ color: spotterColors.navy }}>
              <strong>Total Distance:</strong> {routeDistance || Math.round(trip.total_distance || 0)} miles
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <DirectionsCarIcon sx={{ color: spotterColors.teal, mr: 1 }} />
            <Typography variant="body2" sx={{ color: spotterColors.navy }}>
              <strong>Estimated Driving Time:</strong> {routeDuration || Math.round(trip.total_duration || 0)} hours
            </Typography>
          </Box>
        </Box>
        
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            mt: 1.5, 
            fontSize: '0.65rem',
            color: alpha(spotterColors.navy, 0.6),
            textAlign: 'center'
          }}
        >
          Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: spotterColors.tealDark }}>OpenStreetMap</a> contributors | 
          Routing powered by <a href="http://project-osrm.org/" target="_blank" rel="noopener noreferrer" style={{ color: spotterColors.tealDark }}>OSRM</a>
        </Typography>
      </Box>
    </Box>
  );
};

RouteMap.propTypes = {
  trip: PropTypes.object.isRequired,
  stops: PropTypes.array,
};

RouteMap.defaultProps = {
  stops: [],
};

export default RouteMap; 