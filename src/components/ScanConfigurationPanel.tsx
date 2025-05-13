import React, { useState } from 'react';
import { Box, Typography, FormControlLabel, Checkbox, Button } from '@mui/material';

interface ScanConfigurationPanelProps {
  onStartScan: (tools: string[]) => void;
}

const ScanConfigurationPanel: React.FC<ScanConfigurationPanelProps> = ({ onStartScan }) => {
  const [prowlerEnabled, setProwlerEnabled] = useState(false);
  const [scoutSuiteEnabled, setScoutSuiteEnabled] = useState(false);

  const handleStartScan = () => {
    const selectedTools = [];
    if (prowlerEnabled) selectedTools.push('Prowler');
    if (scoutSuiteEnabled) selectedTools.push('ScoutSuite');
    onStartScan(selectedTools);
  };

  return (
    <Box sx={{ p: 2, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h6" mb={2}>
        Configure Security Scan
      </Typography>

      <FormControlLabel
        control={
          <Checkbox
            checked={prowlerEnabled}
            onChange={(e) => setProwlerEnabled(e.target.checked)}
          />
        }
        label="Use Prowler"
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={scoutSuiteEnabled}
            onChange={(e) => setScoutSuiteEnabled(e.target.checked)}
          />
        }
        label="Use ScoutSuite"
      />

      <Button
        variant="contained"
        color="primary"
        onClick={handleStartScan}
        disabled={!prowlerEnabled && !scoutSuiteEnabled}
        sx={{ mt: 2 }}
      >
        Start Scan
      </Button>
    </Box>
  );
};

export default ScanConfigurationPanel;
