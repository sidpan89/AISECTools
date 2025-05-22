// src/pages/ScheduledScansPage.tsx
import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, List, ListItem, ListItemText, IconButton, Paper, Chip, Switch } from '@mui/material';
import { AddCircleOutline, Edit, Delete, PlayCircleOutline, PauseCircleOutline } from '@mui/icons-material';
import frontendScheduledScanService, { ScheduledScan, UpdateScheduledScanData } from '../services/frontendScheduledScanService';
import ScheduledScanModal from '../components/ScheduledScanModal'; // Uncommented and imported

const ScheduledScansPage: React.FC = () => {
  const [schedules, setSchedules] = useState<ScheduledScan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // Uncommented
  const [editingSchedule, setEditingSchedule] = useState<ScheduledScan | null>(null); // Uncommented

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const data = await frontendScheduledScanService.getScheduledScans();
      setSchedules(data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch scheduled scans');
      console.error("Failed to fetch scheduled scans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingSchedule(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (schedule: ScheduledScan) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    if (window.confirm('Are you sure you want to delete this scheduled scan?')) {
      try {
        await frontendScheduledScanService.deleteScheduledScan(scheduleId);
        fetchSchedules(); // Refresh list
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to delete scheduled scan');
        console.error("Failed to delete scheduled scan:", err);
      }
    }
  };

  const handleToggleEnable = async (schedule: ScheduledScan) => {
    try {
        const updatedScheduleData: UpdateScheduledScanData = { isEnabled: !schedule.isEnabled };
        await frontendScheduledScanService.updateScheduledScan(schedule.id, updatedScheduleData);
        fetchSchedules(); // Refresh list
    } catch (err: any) {
        setError(err.response?.data?.message || err.message || `Failed to update schedule status for ${schedule.name}`);
        console.error(`Failed to update schedule status for ${schedule.name}:`, err);
    }
  };
  
  if (loading) return <Typography>Loading scheduled scans...</Typography>;

  return (
    <Box sx={{ p: 3 }}>
      <Paper elevation={3} sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom component="div">
          Scheduled Scans Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddCircleOutline />}
          onClick={handleOpenCreateModal}
          sx={{ mb: 2 }}
        >
          Create New Schedule
        </Button>

        {error && <Typography color="error" sx={{ mb: 2 }}>Error: {error}</Typography>}

        {schedules.length === 0 && !loading && (
          <Typography>No scheduled scans found. Click "Create New Schedule" to add one.</Typography>
        )}

        <List>
          {schedules.map((schedule) => (
            <ListItem
              key={schedule.id}
              divider
              secondaryAction={
                <>
                  <IconButton edge="end" aria-label={schedule.isEnabled ? "disable" : "enable"} onClick={() => handleToggleEnable(schedule)} sx={{ mr: 0.5 }}>
                    {schedule.isEnabled ? <PauseCircleOutline /> : <PlayCircleOutline />}
                  </IconButton>
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEditModal(schedule)} sx={{ mr: 0.5 }}>
                    <Edit />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteSchedule(schedule.id)}>
                    <Delete />
                  </IconButton>
                </>
              }
            >
              <ListItemText
                primary={schedule.name}
                secondary={
                  <>
                    <Typography component="span" variant="body2" color="text.primary">
                      Cron: {schedule.cronExpression} | Tool: {schedule.toolName}
                      {schedule.credential ? ` | Credential: ${schedule.credential.name} (${schedule.credential.provider})` : ''}
                      {schedule.policy ? ` | Policy: ${schedule.policy.name}` : ''}
                    </Typography>
                    <br />
                    Target: {schedule.targetIdentifier || 'Default'} | 
                    Status: <Chip label={schedule.isEnabled ? 'Enabled' : 'Disabled'} color={schedule.isEnabled ? 'success' : 'default'} size="small" />
                    {schedule.lastRunAt && ` | Last Run: ${new Date(schedule.lastRunAt).toLocaleString()}`}
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      </Paper>
      {isModalOpen && (
        <ScheduledScanModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSaveSuccess={() => {
                fetchSchedules();
                setIsModalOpen(false);
            }}
            schedule={editingSchedule}
        />
      )}
    </Box>
  );
};

export default ScheduledScansPage;
