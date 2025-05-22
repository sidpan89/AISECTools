import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, List, ListItem, ListItemText, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudCredentialForm from '../components/CloudCredentialForm'; // Updated import
import frontendCredentialService, { SanitizedCloudCredential, NewCredentialData } from '../services/frontendCredentialService';

const CredentialsPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [credentialsList, setCredentialsList] = useState<SanitizedCloudCredential[]>([]);

  const fetchCredentials = async () => {
    try {
      const data = await frontendCredentialService.getCredentials();
      setCredentialsList(data);
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
      // Handle error (e.g., show a notification to the user)
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleFormSubmit = async (data: NewCredentialData) => {
    try {
      await frontendCredentialService.saveCredential(data); // Use data directly from the form
      setShowForm(false);
      fetchCredentials(); // Refresh the list
    } catch (error) {
      console.error('Failed to save credential:', error);
      // Handle error
    }
  };

  const handleDelete = async (credentialId: number) => {
    try {
      await frontendCredentialService.deleteCredential(credentialId);
      fetchCredentials(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete credential:', error);
      // Handle error
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" mb={2}>
        Manage Cloud Credentials
      </Typography>

      {!showForm && (
        <Button variant="contained" onClick={() => setShowForm(true)} sx={{ mb: 2 }}>
          Add New Credential
        </Button>
      )}

      {showForm && (
        <Box mb={3}>
          <CloudCredentialForm // Updated component usage
            onSubmit={handleFormSubmit}
          />
          <Button onClick={() => setShowForm(false)} sx={{ mt: 1 }}>Cancel</Button>
        </Box>
      )}

      <Typography variant="h6" mt={showForm ? 2 : 0} mb={1}>
        Existing Credentials:
      </Typography>
      <List>
        {credentialsList.map((cred) => (
          <ListItem 
            key={cred.id}
            secondaryAction={
              <IconButton edge="end" aria-label="delete" onClick={() => handleDelete(cred.id)}>
                <DeleteIcon />
              </IconButton>
            }
            sx={{ border: '1px solid #ddd', mb: 1, borderRadius: '4px' }}
          >
            <ListItemText 
              primary={cred.name} 
              secondary={`Provider: ${cred.provider} | Updated: ${new Date(cred.updatedAt).toLocaleDateString()}`} 
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default CredentialsPage;
