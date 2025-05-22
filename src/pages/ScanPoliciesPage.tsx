// src/pages/ScanPoliciesPage.tsx
import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, List, ListItem, ListItemText, IconButton, Paper } from '@mui/material';
import { AddCircleOutline, Edit, Delete } from '@mui/icons-material';
import frontendScanPolicyService, { ScanPolicy } from '../services/frontendScanPolicyService';
import ScanPolicyModal from '../components/ScanPolicyModal'; // Uncommented and imported

const ScanPoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<ScanPolicy[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // Uncommented
  const [editingPolicy, setEditingPolicy] = useState<ScanPolicy | null>(null); // Uncommented

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const data = await frontendScanPolicyService.getScanPolicies();
      setPolicies(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch scan policies');
      console.error("Failed to fetch scan policies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPolicy(null); // Ensure we are in "create" mode
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (policy: ScanPolicy) => {
    setEditingPolicy(policy); // Set the policy to be edited
    setIsModalOpen(true);
  };

  const handleDeletePolicy = async (policyId: number) => {
    if (window.confirm('Are you sure you want to delete this policy?')) {
      try {
        await frontendScanPolicyService.deleteScanPolicy(policyId);
        fetchPolicies(); // Refresh list
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to delete policy');
        console.error("Failed to delete policy:", err);
      }
    }
  };
  
  if (loading) return <Typography>Loading policies...</Typography>;
  // if (error) return <Typography color="error">Error: {error}</Typography>; // Displaying error below list for now

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom component="div">
          Scan Policies Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={handleOpenCreateModal}
          sx={{ mb: 2 }}
        >
          Create New Policy
        </Button>

        {error && <Typography color="error" sx={{ mb: 2 }}>Error: {error}</Typography>}

        {policies.length === 0 && !loading && (
          <Typography>No scan policies found. Click "Create New Policy" to add one.</Typography>
        )}

        <List>
          {policies.map((policy) => (
            <ListItem
              key={policy.id}
              divider
              secondaryAction={
                <>
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEditModal(policy)} sx={{ mr: 1 }}>
                    <Edit />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeletePolicy(policy.id)}>
                    <Delete />
                  </IconButton>
                </>
              }
            >
              <ListItemText
                primary={policy.name}
                secondary={`Provider: ${policy.provider} | Tool: ${policy.tool} | ${policy.description || 'No description'}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
      { 
        isModalOpen && ( // Uncommented and enabled
          <ScanPolicyModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSaveSuccess={() => {
              fetchPolicies(); // Refresh the list after save
              setIsModalOpen(false); // Close modal on success
            }}
            policy={editingPolicy}
          />
        )
      }
    </Box>
  );
};

export default ScanPoliciesPage;
