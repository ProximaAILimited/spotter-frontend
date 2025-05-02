import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Paper,
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  DirectionsRun as DirectionsRunIcon,
  LocalShipping as LocalShippingIcon,
  Flag as FlagIcon,
  CalendarToday as CalendarTodayIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { getTrips } from '../../utils/api';

const TripList = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const data = await getTrips();
        setTrips(data);
      } catch (error) {
        console.error('Error fetching trips:', error);
        setError('Unable to load trips. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrips();
  }, []);
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Your Trips
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          component={RouterLink}
          to="/trips/new"
        >
          New Trip
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}
      
      {trips.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No trips found
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            You haven't created any trips yet. Click the button below to plan your first trip.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/trips/new"
            sx={{ mt: 2 }}
          >
            Create Your First Trip
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {trips.map((trip) => (
            <Grid item xs={12} sm={6} md={4} key={trip.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                  }
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <DirectionsRunIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      From
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="bold" noWrap>
                      {trip.current_location}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <LocalShippingIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Pickup
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="bold" noWrap>
                      {trip.pickup_location}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={3}>
                    <FlagIcon color="primary" />
                    <Typography variant="body2" color="text.secondary">
                      Delivery
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="bold" noWrap>
                      {trip.dropoff_location}
                    </Typography>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <CalendarTodayIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Created:
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      {formatDate(trip.created_at)}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <AccessTimeIcon fontSize="small" color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Duration:
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      {trip.total_duration ? `${Math.round(trip.total_duration)} hours` : 'Calculating...'}
                    </Typography>
                  </Box>
                  
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip 
                      label={`${trip.eld_logs?.length || 0} Days`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                    <Chip 
                      label={`${trip.stops?.length || 0} Stops`} 
                      size="small" 
                      color="secondary" 
                      variant="outlined"
                    />
                    <Chip 
                      label={`${Math.round(trip.total_distance || 0)} miles`} 
                      size="small" 
                      color="info" 
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
                <CardActions>
                  <Button 
                    size="small" 
                    color="primary"
                    onClick={() => navigate(`/trips/${trip.id}`)}
                    fullWidth
                  >
                    View Details
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default TripList; 