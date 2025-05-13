import React from 'react';
import { Table, TableHead, TableRow, TableBody, TableCell } from '@mui/material';

interface Finding {
  id: number;
  severity: string;
  category: string;
  resource: string;
  description: string;
  recommendation: string;
}

interface FindingsTableProps {
  findings: Finding[];
}

const getSeverityColor = (severity: string): string => {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'red';
    case 'high':
      return 'orange';
    case 'medium':
      return 'yellow';
    case 'low':
      return 'green';
    default:
      return 'inherit';
  }
};

const FindingsTable: React.FC<FindingsTableProps> = ({ findings }) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Severity</TableCell>
          <TableCell>Category</TableCell>
          <TableCell>Resource</TableCell>
          <TableCell>Description</TableCell>
          <TableCell>Recommendation</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {findings.map((finding) => (
          <TableRow key={finding.id}>
            <TableCell sx={{ color: getSeverityColor(finding.severity) }}>
              {finding.severity}
            </TableCell>
            <TableCell>{finding.category}</TableCell>
            <TableCell>{finding.resource}</TableCell>
            <TableCell>{finding.description}</TableCell>
            <TableCell>{finding.recommendation}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default FindingsTable;
