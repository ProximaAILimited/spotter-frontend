import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container, Box, CircularProgress } from '@mui/material';

// Components
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import TripForm from './components/Trips/TripForm';
import TripList from './components/Trips/TripList';
import TripDetails from './components/Trips/TripDetails';

// Utils
import { getToken, setToken, removeToken } from './utils/auth';
import { getUser } from './utils/api';

function App() {
  const [authenticated, setAuthenticated] = useState(!!getToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const token = getToken();
      if (token) {
        try {
          const userData = await getUser();
          setUser(userData);
          setAuthenticated(true);
        } catch (error) {
          console.error('Authentication error:', error);
          logout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Login function
  const login = (token, userData) => {
    setToken(token);
    setUser(userData);
    setAuthenticated(true);
  };

  // Logout function
  const logout = () => {
    removeToken();
    setUser(null);
    setAuthenticated(false);
  };

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="calc(100vh - 120px)">
          <CircularProgress />
        </Box>
      );
    }

    if (!authenticated) {
      return <Navigate to="/login" />;
    }

    return children;
  };

  return (
    <>
      <Navbar authenticated={authenticated} user={user} logout={logout} />
      <Container maxWidth="lg" className="page-container">
        <Routes>
          {/* Auth Routes */}
          <Route 
            path="/login" 
            element={authenticated ? <Navigate to="/" /> : <Login login={login} />} 
          />
          <Route 
            path="/register" 
            element={authenticated ? <Navigate to="/" /> : <Register />} 
          />
          
          {/* Protected Routes */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard user={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trips" 
            element={
              <ProtectedRoute>
                <TripList user={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trips/new" 
            element={
              <ProtectedRoute>
                <TripForm user={user} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trips/:id" 
            element={
              <ProtectedRoute>
                <TripDetails user={user} />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Container>
      <Footer />
    </>
  );
}

export default App; 