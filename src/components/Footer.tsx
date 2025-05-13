import React from 'react';
import { Box, Typography } from '@mui/material'; 
// or an Ant Design <Footer> component

const Footer: React.FC = () => {
  return (
    <Box 
      component="footer" 
      sx={{ textAlign: 'center', p: 2, backgroundColor: '#0F1E3D', color: '#fff' }}
    >
      <Typography variant="body2">
        © 2025 AI Cloud Security Platform. All rights reserved.
      </Typography>
    </Box>
  );
};

export default Footer;
