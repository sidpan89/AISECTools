import React from 'react';
import { Box, Typography } from '@mui/material';
import VisualizationCharts from './VisualizationCharts';

interface DashboardProps {
  recentFindingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

const SecurityDashboard: React.FC<DashboardProps> = ({
  recentFindingsCount,
  criticalCount,
  highCount,
  mediumCount,
  lowCount,
}) => {
  const chartData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    values: [criticalCount, highCount, mediumCount, lowCount],
  };

  return (
    <Box>
      <Typography variant="h5" mb={2}>
        Security Overview
      </Typography>

      <Typography variant="body1">
        Recent Findings: {recentFindingsCount}
      </Typography>

      <Box mt={4}>
        <VisualizationCharts data={chartData} />
      </Box>
    </Box>
  );
};

export default SecurityDashboard;
