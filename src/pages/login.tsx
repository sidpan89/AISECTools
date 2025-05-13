import React, { useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';
import authService from '../services/authService';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Attempt login via authService
    // await authService.login(username, password);
    // Redirect or handle errors
  };

  return (
    <Box 
      component="form" 
      onSubmit={handleLogin} 
      sx={{ maxWidth: 400, mx: 'auto', mt: 8, p: 2 }}
    >
      <Typography variant="h5" mb={2}>
        Login
      </Typography>

      <TextField
        fullWidth
        label="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        type="password"
        label="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        margin="normal"
      />

      <Button
        fullWidth
        type="submit"
        variant="contained"
        color="primary"
        sx={{ mt: 2 }}
      >
        Log In
      </Button>
    </Box>
  );
};

export default LoginPage;
