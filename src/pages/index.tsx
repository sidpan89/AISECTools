import React, { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import SecurityDashboard from '../components/SecurityDashboard';

const DashboardPage: React.FC = () => {
  const [recentFindingsCount, setRecentFindingsCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [highCount, setHighCount] = useState(0);
  const [mediumCount, setMediumCount] = useState(0);
  const [lowCount, setLowCount] = useState(0);

  // Fetch summary stats here (pseudo-code)
  useEffect(() => {
    // e.g., fetch('/api/scans/summary')
    //   .then(res => res.json())
    //   .then(data => {
    //     setRecentFindingsCount(data.recentFindingsCount);
    //     setCriticalCount(data.criticalCount);
    //     setHighCount(data.highCount);
    //     setMediumCount(data.mediumCount);
    //     setLowCount(data.lowCount);
    //   });
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      <SecurityDashboard
        recentFindingsCount={recentFindingsCount}
        criticalCount={criticalCount}
        highCount={highCount}
        mediumCount={mediumCount}
        lowCount={lowCount}
      />
    </Box>
  );
};

export default DashboardPage;
