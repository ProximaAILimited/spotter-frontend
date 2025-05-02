import React from 'react';
import { Box, Container, Typography, Link } from '@mui/material';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        mt: 'auto',
        backgroundColor: 'primary.main',
        color: 'white',
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body2" align="center">
          © {new Date().getFullYear()} Spotter ELD Trip Planner
        </Typography>
        <Typography variant="body2" align="center" sx={{ mt: 1 }}>
          <Link 
            href="#" 
            color="inherit" 
            sx={{ mx: 1, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Terms of Service
          </Link>
          <Link 
            href="#" 
            color="inherit" 
            sx={{ mx: 1, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Privacy Policy
          </Link>
          <Link 
            href="#" 
            color="inherit" 
            sx={{ mx: 1, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
          >
            Contact Us
          </Link>
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer; 