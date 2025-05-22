import React, { useEffect, useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import ScanConfigurationPanel from '../components/ScanConfigurationPanel';
import scanService, { Scan, StartScanPayload } from '../services/scanService'; // Updated import

const ScansPage: React.FC = () => {
  const [scans, setScans] = useState<Scan[]>([]);

  const fetchScans = () => {
    scanService.getScans()
      .then(data => setScans(data))
      .catch(error => {
        console.error('Failed to fetch scans:', error);
        // TODO: Show error to user
      });
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const handleStartScan = (payload: StartScanPayload) => {
    scanService.startScan(payload)
      .then((newScan) => {
        setScans(prevScans => [newScan, ...prevScans]); // Add new scan to the top of the list
      })
      .catch(error => {
        console.error("Failed to start scan:", error);
        // TODO: Show error to user (e.g., via a snackbar or alert)
      });
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" mb={2}>
        Scan Configuration & History
      </Typography>

      <ScanConfigurationPanel onStartScan={handleStartScan} />

      <Box mt={4}>
        <Typography variant="h6" gutterBottom>Scan History</Typography>
        {scans.length === 0 ? (
          <Typography>No scans found.</Typography>
        ) : (
          <List>
            {scans.map((scan) => (
              <ListItem 
                key={scan.id} 
                sx={{ border: '1px solid #ddd', mb: 1, borderRadius: '4px' }}
                // TODO: Add onClick to navigate to a detailed scan view / findings page
              >
                <ListItemText
                  primary={`Scan ID: ${scan.id} - Tool: ${scan.tool || (scan.toolsUsed || 'N/A') } - Status: ${scan.status}`}
                  secondary={
                    `Provider: ${scan.cloudProvider || 'N/A'} | Target: ${scan.targetIdentifier || 'Default'} | Started: ${new Date(scan.createdAt).toLocaleString()} ${ scan.completedAt ? `| Completed: ${new Date(scan.completedAt).toLocaleString()}` : ''} ${scan.errorMessage ? `| Error: ${scan.errorMessage}` : ''}`
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
};

export default ScansPage;
