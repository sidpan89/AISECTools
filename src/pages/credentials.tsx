import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ServicePrincipalForm from '../components/ServicePrincipalForm';
import spService from '../services/spService';

const CredentialsPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [servicePrincipal, setServicePrincipal] = useState<any>(null);

  useEffect(() => {
    // Example: fetch existing service principal data
    // spService.getServicePrincipal().then((sp) => setServicePrincipal(sp));
  }, []);

  const handleFormSubmit = (tenantId: string, clientId: string, clientSecret: string) => {
    // call spService to save the data
    // spService.saveServicePrincipal({ tenantId, clientId, clientSecret });
    setShowForm(false);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" mb={2}>
        Manage Azure Credentials
      </Typography>

      {!showForm && (
        <Button variant="contained" onClick={() => setShowForm(true)}>
          {servicePrincipal ? 'Edit Credentials' : 'Add Credentials'}
        </Button>
      )}

      {showForm && (
        <ServicePrincipalForm
          onSubmit={handleFormSubmit}
          existingValues={servicePrincipal}
        />
      )}
    </Box>
  );
};

export default CredentialsPage;
