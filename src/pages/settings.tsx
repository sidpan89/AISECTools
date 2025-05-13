import React from 'react';
import { Box, Typography } from '@mui/material';

const SettingsPage: React.FC = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" mb={2}>
        User Settings
      </Typography>

      <Typography variant="body1">
        This is where you can add user-specific preferences, theme toggles, etc.
      </Typography>
    </Box>
  );
};

export default SettingsPage;
