// src/components/ScanPolicyModal.tsx
import React, { useState } from 'react';
import { Modal, Box, Typography, Paper, CircularProgress } from '@mui/material';
import ScanPolicyForm from './ScanPolicyForm';
import frontendScanPolicyService, { ScanPolicy, NewScanPolicyData, UpdateScanPolicyData } from '../services/frontendScanPolicyService';

interface ScanPolicyModalProps {
  open: boolean;
  onClose: () => void;
  onSaveSuccess: () => void; // To refresh the list on the parent page
  policy?: ScanPolicy | null; // Current policy for editing, null for creating
}

const style = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: 700,
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
};

const ScanPolicyModal: React.FC<ScanPolicyModalProps> = ({ open, onClose, onSaveSuccess, policy }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (data: NewScanPolicyData | UpdateScanPolicyData, id?: number) => {
    setIsSaving(true);
    setError(null);
    try {
      if (id) { // Editing existing policy
        await frontendScanPolicyService.updateScanPolicy(id, data as UpdateScanPolicyData);
      } else { // Creating new policy
        await frontendScanPolicyService.createScanPolicy(data as NewScanPolicyData);
      }
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save policy');
      console.error("Failed to save policy:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="scan-policy-modal-title">
      <Paper sx={style}>
        <Typography id="scan-policy-modal-title" variant="h6" component="h2" gutterBottom>
          {policy ? 'Edit Scan Policy' : 'Create New Scan Policy'}
        </Typography>
        {error && <Typography color="error" sx={{ mb: 2 }}>Error: {error}</Typography>}
        <ScanPolicyForm
          policy={policy}
          onSave={handleSave}
          onCancel={onClose}
          isSaving={isSaving}
        />
        {isSaving && <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />}
      </Paper>
    </Modal>
  );
};

export default ScanPolicyModal;
