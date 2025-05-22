// src/components/CloudCredentialForm.tsx
import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';

interface CloudCredentialFormProps {
  onSubmit: (data: any) => void; // Data structure will vary based on provider
  // existingValues might be re-introduced later for editing
}

type CloudProviderType = 'Azure' | 'AWS' | 'GCP' | '';

const CloudCredentialForm: React.FC<CloudCredentialFormProps> = ({ onSubmit }) => {
  const [selectedProvider, setSelectedProvider] = useState<CloudProviderType>('');
  const [credentialName, setCredentialName] = useState('');

  // Azure states
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  // AWS states
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('');
  const [awsSessionToken, setAwsSessionToken] = useState(''); // Optional

  // GCP states
  const [gcpServiceAccountJson, setGcpServiceAccountJson] = useState('');
  const [gcpParseError, setGcpParseError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setGcpParseError(null); // Clear previous error

    let providerSpecificCredentialsObject: any;

    if (selectedProvider === 'Azure') {
      providerSpecificCredentialsObject = { tenantId, clientId, clientSecret };
    } else if (selectedProvider === 'AWS') {
      providerSpecificCredentialsObject = { 
        accessKeyId: awsAccessKeyId, 
        secretAccessKey: awsSecretAccessKey, 
        region: awsRegion,
        ...(awsSessionToken && { sessionToken: awsSessionToken }) // Include sessionToken only if it has a value
      };
    } else if (selectedProvider === 'GCP') {
      try {
        providerSpecificCredentialsObject = JSON.parse(gcpServiceAccountJson);
      } catch (error) {
        setGcpParseError('Invalid JSON format for GCP Service Account.');
        console.error("GCP JSON parsing error:", error);
        return; // Stop submission if parsing fails
      }
    } else {
      // Handle case where provider is not selected or is invalid
      console.error("Provider not selected or invalid");
      return;
    }

    onSubmit({
      provider: selectedProvider,
      name: credentialName,
      credentials: providerSpecificCredentialsObject,
    });

    // Optionally clear form fields here after submission
    // setSelectedProvider('');
    // setCredentialName('');
    // ... clear other fields
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Typography variant="h6" gutterBottom>
        Add New Cloud Credential
      </Typography>
      
      <FormControl fullWidth margin="normal" required>
        <InputLabel id="provider-select-label">Cloud Provider</InputLabel>
        <Select
          labelId="provider-select-label"
          id="provider-select"
          value={selectedProvider}
          label="Cloud Provider"
          onChange={(e) => setSelectedProvider(e.target.value as CloudProviderType)}
        >
          <MenuItem value="Azure">Azure</MenuItem>
          <MenuItem value="AWS">AWS</MenuItem>
          <MenuItem value="GCP">GCP</MenuItem>
        </Select>
      </FormControl>

      <TextField
        label="Credential Name"
        variant="outlined"
        fullWidth
        margin="normal"
        value={credentialName}
        onChange={(e) => setCredentialName(e.target.value)}
        required
      />

      {selectedProvider === 'Azure' && (
        <>
          <TextField
            label="Tenant ID"
            variant="outlined"
            fullWidth
            margin="normal"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            required
          />
          <TextField
            label="Client ID"
            variant="outlined"
            fullWidth
            margin="normal"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          />
          <TextField
            label="Client Secret"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            required
          />
        </>
      )}

      {selectedProvider === 'AWS' && (
        <>
          <TextField
            label="AWS Access Key ID"
            variant="outlined"
            fullWidth
            margin="normal"
            value={awsAccessKeyId}
            onChange={(e) => setAwsAccessKeyId(e.target.value)}
            required
          />
          <TextField
            label="AWS Secret Access Key"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            value={awsSecretAccessKey}
            onChange={(e) => setAwsSecretAccessKey(e.target.value)}
            required
          />
          <TextField
            label="AWS Region"
            variant="outlined"
            fullWidth
            margin="normal"
            value={awsRegion}
            onChange={(e) => setAwsRegion(e.target.value)}
            required
          />
          <TextField
            label="AWS Session Token (Optional)"
            variant="outlined"
            fullWidth
            margin="normal"
            value={awsSessionToken}
            onChange={(e) => setAwsSessionToken(e.target.value)}
          />
        </>
      )}

      {selectedProvider === 'GCP' && (
        <>
          <TextField
            label="GCP Service Account JSON"
            variant="outlined"
            fullWidth
            margin="normal"
            multiline
            rows={8}
            value={gcpServiceAccountJson}
            onChange={(e) => setGcpServiceAccountJson(e.target.value)}
            required
            error={!!gcpParseError}
            helperText={gcpParseError || "Paste the full content of the GCP service account JSON key file."}
          />
        </>
      )}
      
      <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }} disabled={!selectedProvider}>
        Save Credential
      </Button>
    </Box>
  );
};

export default CloudCredentialForm;
