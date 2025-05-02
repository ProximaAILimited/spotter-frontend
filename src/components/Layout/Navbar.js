import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  ExitToApp,
  Dashboard,
  DirectionsCar,
  Add,
  Person,
  PersonAdd,
} from '@mui/icons-material';
import { logoutUser } from '../../utils/api';

const Navbar = ({ authenticated, user, logout }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleLogout = async () => {
    try {
      await logoutUser();
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
    handleMenuClose();
    setDrawerOpen(false);
  };
  
  // Navigation links
  const navLinks = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/' },
    { text: 'Create Trip', icon: <Add />, path: '/trips/new' },
  ];
  
  // Mobile drawer content
  const drawerContent = (
    <Box sx={{ width: 250 }} role="presentation">
      {authenticated && user && (
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar alt={user.username} src="/static/avatar.jpg" />
          <Typography variant="subtitle1">{user.username}</Typography>
        </Box>
      )}
      <Divider />
      <List>
        {navLinks.map((link) => (
          <ListItem 
            button 
            key={link.text} 
            component={RouterLink} 
            to={link.path}
            onClick={() => setDrawerOpen(false)}
          >
            <ListItemIcon>{link.icon}</ListItemIcon>
            <ListItemText primary={link.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        {authenticated ? (
          <ListItem button onClick={handleLogout}>
            <ListItemIcon><ExitToApp /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        ) : (
          <>
            <ListItem 
              button 
              component={RouterLink} 
              to="/login"
              onClick={() => setDrawerOpen(false)}
            >
              <ListItemIcon><Person /></ListItemIcon>
              <ListItemText primary="Login" />
            </ListItem>
            <ListItem 
              button 
              component={RouterLink} 
              to="/register"
              onClick={() => setDrawerOpen(false)}
            >
              <ListItemIcon><PersonAdd /></ListItemIcon>
              <ListItemText primary="Register" />
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );
  
  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography 
            variant="h6" 
            component={RouterLink} 
            to="/"
            sx={{ 
              flexGrow: 1, 
              color: 'white', 
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 1
            }}
          >
            <DirectionsCar />
            Spotter ELD
          </Typography>
          
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {authenticated ? (
                <>
                  {navLinks.map((link) => (
                    <Button 
                      key={link.text}
                      color="inherit" 
                      component={RouterLink} 
                      to={link.path}
                      sx={{ mx: 1 }}
                    >
                      {link.text}
                    </Button>
                  ))}
                  <IconButton
                    edge="end"
                    color="inherit"
                    aria-label="account"
                    aria-controls="menu-appbar"
                    aria-haspopup="true"
                    onClick={handleMenuOpen}
                  >
                    <AccountCircle />
                  </IconButton>
                  <Menu
                    id="menu-appbar"
                    anchorEl={anchorEl}
                    anchorOrigin={{
                      vertical: 'bottom',
                      horizontal: 'right',
                    }}
                    keepMounted
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                  >
                    <MenuItem onClick={handleLogout}>Logout</MenuItem>
                  </Menu>
                </>
              ) : (
                <>
                  <Button 
                    color="inherit" 
                    component={RouterLink} 
                    to="/login"
                  >
                    Login
                  </Button>
                  <Button 
                    color="inherit" 
                    component={RouterLink} 
                    to="/register"
                  >
                    Register
                  </Button>
                </>
              )}
            </Box>
          )}
        </Toolbar>
      </AppBar>
      
      {/* Mobile Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Navbar; 