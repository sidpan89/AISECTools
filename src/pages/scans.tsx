import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, List, ListItem } from '@mui/material';
import ScanConfigurationPanel from '../components/ScanConfigurationPanel';
import scanService from '../services/scanService';

interface Scan {
  id: number;
  status: string;
  toolsUsed: string;
  startedAt: string;
  completedAt?: string;
}

const ScansPage: React.FC = () => {
  const [scans, setScans] = useState<Scan[]>([]);

  useEffect(() => {
    // Load existing scans
    // scanService.getScans().then(data => setScans(data));
  }, []);

  const handleStartScan = (tools: string[]) => {
    // Start a new scan
    // scanService.startScan(tools).then((newScan) => {
    //   setScans([...scans, newScan]);
    // });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" mb={2}>
        Scan Configuration & History
      </Typography>

      <ScanConfigurationPanel onStartScan={handleStartScan} />

      <Box mt={4}>
        <Typography variant="h6">Scan History</Typography>
        <List>
          {scans.map((scan) => (
            <ListItem key={scan.id}>
              <Typography>
                Scan ID: {scan.id}, Status: {scan.status}, Tools: {scan.toolsUsed}
              </Typography>
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
};

export default ScansPage;
