// src/components/ScanConfigurationPanel.tsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Select, MenuItem, FormControl, InputLabel, TextField } from '@mui/material';
import frontendCredentialService, { SanitizedCloudCredential } from '../services/frontendCredentialService';
import frontendScanPolicyService, { ScanPolicy } from '../services/frontendScanPolicyService'; // Added import
import { StartScanPayload } from '../services/scanService';

interface ScanConfigurationPanelProps {
  onStartScan: (payload: StartScanPayload) => void;
}

const ScanConfigurationPanel: React.FC<ScanConfigurationPanelProps> = ({ onStartScan }) => {
  const [availableCredentials, setAvailableCredentials] = useState<SanitizedCloudCredential[]>([]);
  const [selectedCredentialId, setSelectedCredentialId] = useState<number | ''>('');
  const [targetIdentifier, setTargetIdentifier] = useState<string>('');
  const [availablePolicies, setAvailablePolicies] = useState<ScanPolicy[]>([]); // Added state
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | ''>(''); // Added state
  // Tool name will be derived from selected policy or default to 'Prowler'

  useEffect(() => {
    frontendCredentialService.getCredentials()
      .then(setAvailableCredentials)
      .catch(error => {
        console.error('Failed to fetch credentials:', error);
        // TODO: Display error to user (e.g., via a snackbar or alert)
      });
  }, []);

  useEffect(() => {
    if (selectedCredentialId) {
      const selectedCred = availableCredentials.find(c => c.id === selectedCredentialId);
      if (selectedCred) {
        frontendScanPolicyService.getScanPolicies()
          .then(allPolicies => {
            const filtered = allPolicies.filter(p => p.provider === selectedCred.provider);
            setAvailablePolicies(filtered);
          })
          .catch(console.error);
      }
    } else {
      setAvailablePolicies([]);
    }
    setSelectedPolicyId(''); // Reset policy if credential changes
  }, [selectedCredentialId, availableCredentials]);

  const getTargetLabel = () => {
    const cred = availableCredentials.find(c => c.id === selectedCredentialId);
    if (cred) {
      if (cred.provider === 'AWS') return 'Optional AWS Account ID';
      if (cred.provider === 'GCP') return 'Optional GCP Project ID';
      if (cred.provider === 'Azure') return 'Optional Azure Subscription ID';
    }
    return 'Target Identifier (Optional)';
  };

  const handleStartScan = () => {
    if (!selectedCredentialId) {
      console.error("No credential selected."); // Should be prevented by button disable
      return;
    }

    let toolName = 'Prowler'; // Default tool
    let finalPolicyId: number | undefined = undefined;

    if (selectedPolicyId) {
      const selectedPolicy = availablePolicies.find(p => p.id === selectedPolicyId);
      if (selectedPolicy) {
        toolName = selectedPolicy.tool;
        finalPolicyId = Number(selectedPolicyId);
      }
    }

    const payload: StartScanPayload = {
      credentialId: Number(selectedCredentialId),
      toolName: toolName,
      targetIdentifier: targetIdentifier || undefined,
      policyId: finalPolicyId,
    };
    onStartScan(payload);
  };

  return (
    <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 2, mb: 3 }}>
      <Typography variant="h6" mb={2}>
        Configure Security Scan
      </Typography>

      <FormControl fullWidth margin="normal" required>
        <InputLabel id="credential-select-label">Select Credential</InputLabel>
        <Select
          labelId="credential-select-label"
          id="credential-select"
          value={selectedCredentialId}
          label="Select Credential"
          onChange={(e) => setSelectedCredentialId(e.target.value as number | '')}
        >
          {availableCredentials.map((cred) => (
            <MenuItem key={cred.id} value={cred.id}>
              {cred.name} ({cred.provider})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label={getTargetLabel()}
        variant="outlined"
        fullWidth
        margin="normal"
        value={targetIdentifier}
        onChange={(e) => setTargetIdentifier(e.target.value)}
        helperText="Leave blank to scan the default target associated with the credential (if applicable)."
      />

      <FormControl fullWidth margin="normal" disabled={!selectedCredentialId || availablePolicies.length === 0}>
        <InputLabel id="policy-select-label">Select Scan Policy (Optional)</InputLabel>
        <Select
          labelId="policy-select-label"
          id="policy-select"
          value={selectedPolicyId}
          label="Select Scan Policy (Optional)"
          onChange={(e) => setSelectedPolicyId(e.target.value as number | '')}
        >
          <MenuItem value="">
            <em>None (Use default tool settings or manual tool selection if available)</em>
          </MenuItem>
          {availablePolicies.map((policy) => (
            <MenuItem key={policy.id} value={policy.id}>
              {policy.name} ({policy.tool})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Tool display/selection logic could be more sophisticated here if needed when no policy is selected */}
      {/* For now, tool is derived from policy or defaults to Prowler */}
      {!selectedPolicyId && (
        <Typography variant="caption" display="block" sx={{mt:1, ml:1}}>
            Default tool: Prowler (when no policy is selected)
        </Typography>
      )}


      <Button
        variant="contained"
        color="primary"
        onClick={handleStartScan}
        disabled={!selectedCredentialId}
        sx={{ mt: 2 }}
      >
        Start Scan
      </Button>
    </Box>
  );
};

export default ScanConfigurationPanel;
