# Spotter ELD Trip Planner - Frontend

This is the frontend application for the Spotter ELD Trip Planner, a tool designed for commercial truck drivers to plan trips while adhering to ELD (Electronic Logging Device) regulations.

## Features

- User authentication (login, registration)
- Trip planning with accurate route calculation
- ELD compliance monitoring
- Interactive maps and routing
- Detailed trip statistics and logging

## Technologies Used

- React 18
- Material UI 5
- React Router 6
- Axios for API communication
- Google Maps API for mapping and route calculation
- Leaflet as a fallback mapping solution

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Backend API running (see the backend repository)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd spotter/frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   
   Create a `.env` file in the frontend directory with the following content:
   ```
   # Google Maps API key - required for accurate routing
   REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE

   # Backend API URL (leave empty for relative URLs when served from the same domain)
   # REACT_APP_API_URL=http://localhost:8000
   ```

4. Start the development server:
   ```
   npm start
   ```

### Google Maps API Setup

To use the Google Maps integration:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the following APIs:
   - Maps JavaScript API
   - Directions API
   - Places API
   - Distance Matrix API
4. Create an API key with appropriate restrictions
5. Add the API key to your `.env` file

## Production Deployment

For production deployment:

1. Create a `.env.production` file with production settings
2. Build the application:
   ```
   npm run build
   ```
3. Deploy the contents of the `build` directory to your web server

## API Integration

The frontend is designed to work with the Spotter ELD backend API. The API endpoints are:

- `/api/auth/login/` - User login
- `/api/auth/register/` - User registration
- `/api/trips/` - Trip management
- `/api/eld-logs/` - ELD log data

## Contact and Support

For questions, issues, or features, please contact:
- Email: support@spottereld.com
- Website: https://spottereld.com

# Geocoding Service Improvements

## Overview

This update addresses the issues with the route map calculation where coordinates were missing or not properly resolved. The root problem was DNS resolution failures when using the Nominatim geocoding service (particularly with the nominatim.openstreetmap.de server).

## Changes Made

1. **Created a new geocoding service** (`openMapServiceFix.js`) with:
   - Multiple API fallbacks
   - Robust error handling
   - Cache for geocoding results to reduce API calls
   - Timeout handling to prevent hanging requests
   - Detailed logging for debugging

2. **Added multiple geocoding providers as fallbacks**:
   - Primary: OpenStreetMap Nominatim (main .org server only)
   - Secondary: BigDataCloud Geocoding API
   - Tertiary: LocationIQ Geocoding API
   - Final fallback: Known locations database with ~20 major cities

3. **Improved API integration**:
   - Updated `searchLocations` in `openMapService.js` to use the new geocoding function
   - Enhanced `getCoordinatesForLocation` in `geocodingService.js` to integrate with the new service
   - Fixed `autoFixTripCoordinates` in `api.js` to properly handle API calls

4. **Enhanced route map handling**:
   - Better handling of partial/missing coordinates
   - Displaying all available waypoints even when route cannot be calculated
   - Improved error messaging for users

## How to Test

1. Create a new trip with locations
2. If coordinates are missing, click the "Auto-Fix" button on the trip details page
3. The system will try multiple geocoding services to resolve coordinates
4. The route map will display all valid locations it can find

## Technical Details

The enhanced geocoding process follows this sequence:

1. First attempts with OpenStreetMap's primary server
2. If that fails, tries BigDataCloud API
3. If that fails, tries LocationIQ API
4. If all APIs fail, falls back to a database of known locations
5. If no matches are found, uses center-of-US coordinates as absolute fallback

Each step includes error handling, logging, and proper timeout management to ensure the best user experience.

## API Keys

This implementation uses free tiers of various geocoding services:

- BigDataCloud: `bdc_278cfb31bef24c1dbbf6c7df619dab65`
- LocationIQ: `pk.9d616f91c64ccc743644a39cea7e2ac8`

These keys have usage limits but should be sufficient for testing and moderate use. 