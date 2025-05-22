// src/components/ScheduledScanModal.tsx
import React, { useState } from 'react';
import { Modal, Box, Typography, Paper, CircularProgress } from '@mui/material';
import ScheduledScanForm from './ScheduledScanForm';
import frontendScheduledScanService, { ScheduledScan, NewScheduledScanData, UpdateScheduledScanData } from '../services/frontendScheduledScanService';

interface ScheduledScanModalProps {
  open: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  schedule?: ScheduledScan | null;
}

const style = { /* Same style as ScanPolicyModal */
  position: 'absolute' as 'absolute', top: '50%', left: '50%',
  transform: 'translate(-50%, -50%)', width: '80%', maxWidth: 700,
  bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2,
  maxHeight: '90vh', overflowY: 'auto' // For scrollability
};

const ScheduledScanModal: React.FC<ScheduledScanModalProps> = ({ open, onClose, onSaveSuccess, schedule }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (data: NewScheduledScanData | UpdateScheduledScanData, id?: number) => {
    setIsSaving(true);
    setError(null);
    try {
      if (id) {
        await frontendScheduledScanService.updateScheduledScan(id, data as UpdateScheduledScanData);
      } else {
        await frontendScheduledScanService.createScheduledScan(data as NewScheduledScanData);
      }
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save scheduled scan');
      console.error("Failed to save scheduled scan:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="scheduled-scan-modal-title">
      <Paper sx={style}>
        <Typography id="scheduled-scan-modal-title" variant="h6" component="h2" gutterBottom>
          {schedule ? 'Edit Scheduled Scan' : 'Create New Scheduled Scan'}
        </Typography>
        {error && <Typography color="error" sx={{ mb: 2 }}>Error: {error}</Typography>}
        <ScheduledScanForm
          schedule={schedule}
          onSave={handleSave}
          onCancel={onClose}
          isSaving={isSaving}
        />
        {isSaving && <CircularProgress sx={{ display: 'block', margin: '20px auto' }} />}
      </Paper>
    </Modal>
  );
};
export default ScheduledScanModal;
