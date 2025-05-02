import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  LinearProgress,
  Divider,
  useTheme,
} from '@mui/material';
import {
  Add as AddIcon,
  DirectionsCar as TripIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Timelapse as TimelapseIcon,
} from '@mui/icons-material';
import { getTrips } from '../../utils/api';

const Dashboard = ({ user }) => {
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
        setError('Failed to load trips. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

  // Calculate dashboard statistics
  const calculateStats = () => {
    if (!trips.length) {
      return {
        activeTrips: 0,
        completedTrips: 0,
        totalDistance: 0,
        avgTripDuration: 0,
        cycleHoursAvg: 0,
      };
    }

    const activeTrips = trips.filter(trip => trip.status === 'ACTIVE').length;
    const completedTrips = trips.filter(trip => trip.status === 'COMPLETED').length;
    
    const totalDistance = trips.reduce((sum, trip) => sum + (trip.total_distance || 0), 0);
    
    const tripsWithDuration = trips.filter(trip => trip.total_duration);
    const avgTripDuration = tripsWithDuration.length 
      ? tripsWithDuration.reduce((sum, trip) => sum + trip.total_duration, 0) / tripsWithDuration.length 
      : 0;
    
    // Calculate average cycle hours if available
    const tripsWithCycleHours = trips.filter(trip => trip.current_cycle_hours !== undefined);
    const cycleHoursAvg = tripsWithCycleHours.length
      ? tripsWithCycleHours.reduce((sum, trip) => sum + trip.current_cycle_hours, 0) / tripsWithCycleHours.length
      : 0;
    
    return {
      activeTrips,
      completedTrips,
      totalDistance: Math.round(totalDistance),
      avgTripDuration: Math.round(avgTripDuration * 10) / 10,
      cycleHoursAvg: Math.round(cycleHoursAvg * 10) / 10,
    };
  };

  const stats = calculateStats();

  // Recent trips to display
  const recentTrips = [...trips]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome back, {user?.first_name || 'Driver'}
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => navigate('/trips/new')}
        >
          Create New Trip
        </Button>
      </Box>

      {loading ? (
        <LinearProgress />
      ) : error ? (
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      ) : (
        <>
          {/* Stats Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                <TripIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h5" component="div">
                  {stats.activeTrips}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Trips
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                <ScheduleIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h5" component="div">
                  {stats.completedTrips}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completed Trips
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                <TimelapseIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h5" component="div">
                  {stats.totalDistance}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Miles
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                <Box display="flex" flexDirection="column" alignItems="center">
                  <WarningIcon 
                    color={stats.cycleHoursAvg > 60 ? "error" : "info"} 
                    sx={{ fontSize: 40, mb: 1 }} 
                  />
                  <Typography variant="h5" component="div">
                    {stats.cycleHoursAvg} / 70
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg. Cycle Hours
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Recent Trips */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Recent Trips
            </Typography>
            {recentTrips.length > 0 ? (
              <Grid container spacing={3}>
                {recentTrips.map((trip) => (
                  <Grid item xs={12} md={4} key={trip.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                          {trip.pickup_location} → {trip.dropoff_location}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Created: {formatDate(trip.created_at)}
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            <strong>Status:</strong> {trip.status || 'Active'}
                          </Typography>
                          {trip.total_distance && (
                            <Typography variant="body2">
                              <strong>Distance:</strong> {Math.round(trip.total_distance)} miles
                            </Typography>
                          )}
                          {trip.current_cycle_hours !== undefined && (
                            <Typography variant="body2">
                              <strong>Cycle Hours:</strong> {trip.current_cycle_hours} hrs
                            </Typography>
                          )}
                        </Box>
                      </CardContent>
                      <CardActions>
                        <Button 
                          size="small" 
                          onClick={() => navigate(`/trips/${trip.id}`)}
                        >
                          View Details
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1">
                  No trips found. Get started by creating your first trip!
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/trips/new')}
                  sx={{ mt: 2 }}
                >
                  Create Trip
                </Button>
              </Paper>
            )}
          </Box>

          {/* Quick Links */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Quick Actions
            </Typography>
            <Paper sx={{ p: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="primary"
                    onClick={() => navigate('/trips')}
                    sx={{ p: 2 }}
                  >
                    View All Trips
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    onClick={() => navigate('/trips/new')}
                    sx={{ p: 2 }}
                  >
                    Create New Trip
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => navigate('/profile')}
                    sx={{ p: 2 }}
                  >
                    Edit Profile
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="info"
                    onClick={() => navigate('/reports')}
                    sx={{ p: 2 }}
                  >
                    View Reports
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Box>
        </>
      )}
    </Container>
  );
};

export default Dashboard; 