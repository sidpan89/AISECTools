import React from 'react';
import { AppBar, Toolbar, Typography, Button } from '@mui/material'; 
// or Ant Design equivalents (e.g., Layout, Menu)

interface HeaderProps {
  onLogout?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          AI Cloud Security Platform
        </Typography>
        <Button color="inherit" onClick={onLogout}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
