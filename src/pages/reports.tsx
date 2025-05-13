import React, { useState, useEffect } from 'react';
import { Box, Typography, Button } from '@mui/material';
import ReportViewer from '../components/ReportViewer';
import reportService from '../services/reportService';

const ReportsPage: React.FC = () => {
  const [reportUrl, setReportUrl] = useState<string>('');

  const handleGenerateReport = async () => {
    // Example usage of report service
    // const url = await reportService.generateReport(someScanId, 'PDF');
    // setReportUrl(url);
  };

  const handleDownload = () => {
    // Possibly trigger a direct file download here
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" mb={2}>
        Report Generation & Viewing
      </Typography>

      <Button variant="contained" onClick={handleGenerateReport}>
        Generate Report
      </Button>

      <Box mt={4}>
        <ReportViewer reportUrl={reportUrl} onDownload={handleDownload} />
      </Box>
    </Box>
  );
};

export default ReportsPage;
