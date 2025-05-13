import React from 'react';
import { Box, Typography, Button } from '@mui/material';

interface ReportViewerProps {
  reportUrl?: string; // URL to the generated report
  onDownload?: () => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({ reportUrl, onDownload }) => {
  return (
    <Box>
      <Typography variant="h6" mb={2}>
        Report Viewer
      </Typography>
      {reportUrl ? (
        <>
          <iframe
            title="Report Preview"
            src={reportUrl}
            style={{ width: '100%', height: '600px', border: 'none' }}
          />
          <Box mt={2}>
            <Button variant="contained" onClick={onDownload}>
              Download Report
            </Button>
          </Box>
        </>
      ) : (
        <Typography variant="body1">
          No report selected or report is still generating.
        </Typography>
      )}
    </Box>
  );
};

export default ReportViewer;
