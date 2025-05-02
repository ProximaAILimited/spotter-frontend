import React from 'react';
import { Box, Paper, Typography, Grid, Divider, Tooltip, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import {
  DirectionsCar as DrivingIcon,
  Work as OnDutyIcon,
  Hotel as SleepingIcon,
  NoMeetingRoom as OffDutyIcon,
} from '@mui/icons-material';
import { spotterColors } from '../../utils/theme';

// Hours in a day for the grid
const HOURS = Array.from({ length: 24 }, (_, i) => i);

// Helper function to get hour labels (12-hour format with AM/PM)
const getHourLabel = (hour) => {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
};

// Helper to determine color based on activity type
const getActivityColor = (type) => {
  switch (type) {
    case 'DRIVING':
      return spotterColors.coral; // coral
    case 'ON_DUTY':
      return spotterColors.teal; // teal  
    case 'OFF_DUTY':
      return spotterColors.lightBlue; // light blue
    case 'SLEEPER':
      return spotterColors.tealDark; // dark teal
    default:
      return spotterColors.lightGray; // light gray
  }
};

// Helper to get icon based on activity type
const getActivityIcon = (type, size = 'small') => {
  switch (type) {
    case 'DRIVING':
      return <DrivingIcon fontSize={size} />;
    case 'ON_DUTY':
      return <OnDutyIcon fontSize={size} />;
    case 'OFF_DUTY':
      return <OffDutyIcon fontSize={size} />;
    case 'SLEEPER':
      return <SleepingIcon fontSize={size} />;
    default:
      return null;
  }
};

// Helper to calculate position and width for activities in the grid
const getActivityGridPosition = (activity) => {
  // Parse start and end times (assuming format like "08:00")
  const [startHour, startMinute] = activity.start_time.split(':').map(Number);
  const [endHour, endMinute] = activity.end_time.split(':').map(Number);
  
  // Calculate decimal hours for positioning
  const startDecimal = startHour + (startMinute / 60);
  const endDecimal = endHour + (endMinute / 60);
  
  // Calculate width as percentage of 24 hours
  const width = ((endDecimal - startDecimal) / 24) * 100;
  
  // Calculate left position as percentage
  const left = (startDecimal / 24) * 100;
  
  return { width: `${width}%`, left: `${left}%` };
};

const EldLogGrid = ({ logData }) => {
  if (!logData) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>No log data available</Typography>
      </Box>
    );
  }

  // Calculate status totals
  const statusTotals = logData.activities.reduce((acc, activity) => {
    // Parse times to calculate duration
    const [startHour, startMinute] = activity.start_time.split(':').map(Number);
    const [endHour, endMinute] = activity.end_time.split(':').map(Number);
    
    // Calculate duration in hours
    const startDecimal = startHour + (startMinute / 60);
    const endDecimal = endHour + (endMinute / 60);
    const duration = endDecimal - startDecimal;
    
    // Add to the correct status total
    if (!acc[activity.activity_type]) {
      acc[activity.activity_type] = 0;
    }
    acc[activity.activity_type] += duration;
    
    return acc;
  }, {});

  return (
    <Box>
      {/* Status summary */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Hours Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ color: getActivityColor('DRIVING') }}>
                {getActivityIcon('DRIVING')}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Driving
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {statusTotals['DRIVING'] ? statusTotals['DRIVING'].toFixed(1) : '0'} hrs
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ color: getActivityColor('ON_DUTY') }}>
                {getActivityIcon('ON_DUTY')}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  On Duty
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {statusTotals['ON_DUTY'] ? statusTotals['ON_DUTY'].toFixed(1) : '0'} hrs
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ color: getActivityColor('OFF_DUTY') }}>
                {getActivityIcon('OFF_DUTY')}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Off Duty
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {statusTotals['OFF_DUTY'] ? statusTotals['OFF_DUTY'].toFixed(1) : '0'} hrs
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ color: getActivityColor('SLEEPER') }}>
                {getActivityIcon('SLEEPER')}
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Sleeper Berth
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {statusTotals['SLEEPER'] ? statusTotals['SLEEPER'].toFixed(1) : '0'} hrs
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Log grid visualization */}
      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <Typography variant="subtitle1" gutterBottom>
          Daily Log Grid
        </Typography>
        
        {/* Hour markers */}
        <Box sx={{ position: 'relative', height: '20px', mb: 1, ml: '50px', mr: '10px' }}>
          {HOURS.map((hour) => (
            <Typography
              key={hour}
              variant="caption"
              sx={{
                position: 'absolute',
                left: `${(hour / 24) * 100}%`,
                transform: 'translateX(-50%)',
                fontSize: '0.7rem',
              }}
            >
              {getHourLabel(hour)}
            </Typography>
          ))}
        </Box>
        
        {/* Hour grid lines */}
        <Box sx={{ position: 'relative', height: '80px', border: '1px solid #ddd', ml: '50px', mr: '10px' }}>
          {HOURS.map((hour) => (
            <Box
              key={hour}
              sx={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `${(hour / 24) * 100}%`,
                width: '1px',
                backgroundColor: hour % 3 === 0 ? '#aaa' : '#ddd',
              }}
            />
          ))}
          
          {/* Activity blocks */}
          {logData.activities.map((activity, index) => {
            const { width, left } = getActivityGridPosition(activity);
            return (
              <Tooltip
                key={index}
                title={`${activity.activity_type}: ${activity.start_time} - ${activity.end_time} (${activity.location})`}
                arrow
                placement="top"
              >
                <Box
                  sx={{
                    position: 'absolute',
                    height: '80px',
                    width,
                    left,
                    backgroundColor: getActivityColor(activity.activity_type),
                    opacity: 0.8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    overflow: 'hidden',
                  }}
                >
                  {width.replace('%', '') > 4 && getActivityIcon(activity.activity_type)}
                </Box>
              </Tooltip>
            );
          })}
        </Box>
        
        {/* Legend */}
        <Box sx={{ mt: 2, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {['DRIVING', 'ON_DUTY', 'OFF_DUTY', 'SLEEPER'].map((type) => (
            <Box key={type} display="flex" alignItems="center" gap={0.5}>
              <Box
                sx={{
                  width: '15px',
                  height: '15px',
                  backgroundColor: getActivityColor(type),
                  borderRadius: '2px',
                }}
              />
              <Typography variant="caption">
                {type.replace('_', ' ')}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
      
      {/* Duty status rules */}
      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Duty Status Rules
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Remaining drive time: {logData.remaining_drive_time ? `${logData.remaining_drive_time} hours` : 'N/A'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Cycle hours: {logData.cycle_hours ? `${logData.cycle_hours} / 70 hours` : 'N/A'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Hours of service status: {logData.hos_status || 'Compliant'}
        </Typography>
      </Paper>
    </Box>
  );
};

EldLogGrid.propTypes = {
  logData: PropTypes.object,
};

export default EldLogGrid; 