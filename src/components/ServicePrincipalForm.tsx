import React, { useState } from 'react';
import { Box, TextField, Button, Typography } from '@mui/material';

interface ServicePrincipalFormProps {
  onSubmit: (tenantId: string, clientId: string, clientSecret: string) => void;
  existingValues?: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
  };
}

const ServicePrincipalForm: React.FC<ServicePrincipalFormProps> = ({
  onSubmit,
  existingValues,
}) => {
  const [tenantId, setTenantId] = useState(existingValues?.tenantId || '');
  const [clientId, setClientId] = useState(existingValues?.clientId || '');
  const [clientSecret, setClientSecret] = useState(
    existingValues?.clientSecret || ''
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(tenantId, clientId, clientSecret);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h6" mb={2}>
        Azure Service Principal
      </Typography>
      <TextField
        fullWidth
        label="Tenant ID"
        variant="outlined"
        margin="normal"
        value={tenantId}
        onChange={(e) => setTenantId(e.target.value)}
      />
      <TextField
        fullWidth
        label="Client ID"
        variant="outlined"
        margin="normal"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
      />
      <TextField
        fullWidth
        label="Client Secret"
        variant="outlined"
        margin="normal"
        type="password"
        value={clientSecret}
        onChange={(e) => setClientSecret(e.target.value)}
      />

      <Button type="submit" variant="contained" color="secondary" sx={{ mt: 2 }}>
        Save
      </Button>
    </Box>
  );
};

export default ServicePrincipalForm;
