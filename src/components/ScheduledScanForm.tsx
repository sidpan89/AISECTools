// src/components/ScheduledScanForm.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Box, TextField, Button, Select, MenuItem, FormControl, InputLabel, Typography, Grid, Switch, FormControlLabel } from '@mui/material';
import { ScheduledScan, NewScheduledScanData, UpdateScheduledScanData } from '../services/frontendScheduledScanService';
import frontendCredentialService, { SanitizedCloudCredential } from '../services/frontendCredentialService';
import frontendScanPolicyService, { ScanPolicy } from '../services/frontendScanPolicyService';
import cron from 'node-cron'; // For validation only

const availableToolsBase = ['Prowler', 'CloudSploit', 'GCP-SCC'];

interface ScheduledScanFormProps {
  schedule?: ScheduledScan | null;
  onSave: (data: NewScheduledScanData | UpdateScheduledScanData, id?: number) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const ScheduledScanForm: React.FC<ScheduledScanFormProps> = ({ schedule, onSave, onCancel, isSaving }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [credentialId, setCredentialId] = useState<number | ''>('');
  const [toolName, setToolName] = useState('');
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [policyId, setPolicyId] = useState<number | ''>('');
  const [cronExpression, setCronExpression] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);

  const [availableCredentials, setAvailableCredentials] = useState<SanitizedCloudCredential[]>([]);
  const [availablePolicies, setAvailablePolicies] = useState<ScanPolicy[]>([]);
  const [filteredTools, setFilteredTools] = useState<string[]>(availableToolsBase);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  
  const [cronError, setCronError] = useState<string | null>(null);

  // Fetch credentials
  useEffect(() => {
    frontendCredentialService.getCredentials()
      .then(setAvailableCredentials)
      .catch(err => console.error("Failed to fetch credentials", err));
  }, []);

  // Effect to update selectedProvider and filter tools when credentialId changes
  useEffect(() => {
    const currentCred = availableCredentials.find(c => c.id === credentialId);
    if (currentCred) {
      setSelectedProvider(currentCred.provider);
      if (currentCred.provider === 'GCP') setFilteredTools(['Prowler', 'CloudSploit', 'GCP-SCC']);
      else if (currentCred.provider === 'AWS' || currentCred.provider === 'Azure') setFilteredTools(['Prowler', 'CloudSploit']);
      else setFilteredTools(availableToolsBase);
      // Reset tool if not compatible with new provider
      if (toolName && !filteredTools.includes(toolName)) {
          setToolName('');
      }
    } else {
      setSelectedProvider(null);
      setFilteredTools(availableToolsBase);
    }
  }, [credentialId, availableCredentials, toolName, filteredTools]); // Added toolName & filteredTools to dependencies

  // Fetch policies when selectedProvider or toolName changes
  useEffect(() => {
    if (selectedProvider && toolName) {
      frontendScanPolicyService.getScanPolicies()
        .then(allPolicies => {
          const filtered = allPolicies.filter(p => p.provider === selectedProvider && p.tool === toolName);
          setAvailablePolicies(filtered);
        })
        .catch(err => console.error("Failed to fetch scan policies", err));
    } else {
      setAvailablePolicies([]);
    }
    setPolicyId(''); // Reset policy if provider or tool changes
  }, [selectedProvider, toolName]);

  // Pre-fill form if editing
  useEffect(() => {
    if (schedule) {
      setName(schedule.name);
      setDescription(schedule.description || '');
      setCredentialId(schedule.credentialId || '');
      // setSelectedProvider will be set by the above useEffect for credentialId
      setToolName(schedule.toolName || '');
      setTargetIdentifier(schedule.targetIdentifier || '');
      setPolicyId(schedule.policyId || '');
      setCronExpression(schedule.cronExpression || '');
      setIsEnabled(schedule.isEnabled !== undefined ? schedule.isEnabled : true);
    } else {
      // Reset for new
      setName(''); setDescription(''); setCredentialId(''); setToolName('');
      setTargetIdentifier(''); setPolicyId(''); setCronExpression('0 2 * * *'); // Default: 2 AM daily
      setIsEnabled(true);
    }
  }, [schedule]);
  
  const validateCron = () => {
    if (cronExpression && !cron.validate(cronExpression)) {
        setCronError('Invalid cron expression.');
        return false;
    }
    setCronError(null);
    return true;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateCron()) return;

    const scheduleData: NewScheduledScanData | UpdateScheduledScanData = {
      name, description,
      credentialId: Number(credentialId),
      toolName,
      targetIdentifier: targetIdentifier || null,
      policyId: policyId ? Number(policyId) : null,
      cronExpression, isEnabled,
    };
    await onSave(scheduleData, schedule?.id);
  };
  
  const getTargetLabel = () => {
    if (selectedProvider === 'AWS') return 'Optional AWS Account ID';
    if (selectedProvider === 'GCP') return 'Optional GCP Project ID / Org/Folder';
    if (selectedProvider === 'Azure') return 'Optional Azure Subscription ID';
    return 'Target Identifier (Optional)';
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField required fullWidth label="Schedule Name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving} />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Description (Optional)" multiline rows={2} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSaving} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required disabled={isSaving}>
            <InputLabel>Credential</InputLabel>
            <Select label="Credential" value={credentialId} onChange={(e) => setCredentialId(Number(e.target.value))}>
              {availableCredentials.map(c => <MenuItem key={c.id} value={c.id}>{c.name} ({c.provider})</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required disabled={isSaving || !selectedProvider}>
            <InputLabel>Tool</InputLabel>
            <Select label="Tool" value={toolName} onChange={(e) => setToolName(e.target.value as string)}>
              {filteredTools.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label={getTargetLabel()} value={targetIdentifier} onChange={(e) => setTargetIdentifier(e.target.value)} disabled={isSaving || !selectedProvider} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth disabled={isSaving || !selectedProvider || !toolName}>
            <InputLabel>Scan Policy (Optional)</InputLabel>
            <Select label="Scan Policy (Optional)" value={policyId} onChange={(e) => setPolicyId(Number(e.target.value) || '')}>
              <MenuItem value=""><em>None</em></MenuItem>
              {availablePolicies.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={8}>
          <TextField
            required fullWidth label="Cron Expression (e.g., '0 2 * * *')" value={cronExpression}
            onChange={(e) => setCronExpression(e.target.value)}
            onBlur={validateCron} // Validate on blur
            error={!!cronError}
            helperText={cronError || "Defines when the scan will run. Example: '0 2 * * *' for 2 AM daily."}
            disabled={isSaving}
          />
        </Grid>
        <Grid item xs={12} sm={4}>
            <FormControlLabel control={<Switch checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} disabled={isSaving} />} label="Enabled" />
        </Grid>
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button onClick={onCancel} sx={{ mr: 1 }} disabled={isSaving}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={isSaving || !credentialId || !toolName || !cronExpression || !!cronError}>
          {isSaving ? 'Saving...' : (schedule ? 'Save Changes' : 'Create Schedule')}
        </Button>
      </Box>
    </Box>
  );
};
export default ScheduledScanForm;
