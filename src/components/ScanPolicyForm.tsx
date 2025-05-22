// src/components/ScanPolicyForm.tsx
import React, { useState, useEffect } from 'react';
import { Box, TextField, Button, Select, MenuItem, FormControl, InputLabel, Typography, Grid } from '@mui/material';
import { ScanPolicy, NewScanPolicyData, ScanPolicyDefinition, UpdateScanPolicyData } from '../services/frontendScanPolicyService';
import { CloudProvider as CloudProviderEnum } from '../models/enums/CloudProvider'; // Assuming this path for backend enum

type CloudProviderStrings = keyof typeof CloudProviderEnum; // "AWS" | "AZURE" | "GCP"
const availableProviders = Object.keys(CloudProviderEnum) as CloudProviderStrings[];
const availableTools = ['Prowler', 'CloudSploit', 'GCP-SCC']; // Could be more dynamic later

interface ScanPolicyFormProps {
  policy?: ScanPolicy | null; // For pre-filling the form in edit mode
  onSave: (data: NewScanPolicyData | UpdateScanPolicyData, id?: number) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

const ScanPolicyForm: React.FC<ScanPolicyFormProps> = ({ policy, onSave, onCancel, isSaving }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState<CloudProviderStrings | ''>('');
  const [tool, setTool] = useState('');
  const [definition, setDefinition] = useState(''); // JSON string
  const [definitionError, setDefinitionError] = useState<string | null>(null);

  useEffect(() => {
    if (policy) {
      setName(policy.name);
      setDescription(policy.description || '');
      setProvider(policy.provider as CloudProviderStrings); // Assuming policy.provider matches CloudProviderStrings
      setTool(policy.tool);
      setDefinition(JSON.stringify(policy.definition || {}, null, 2));
    } else {
      // Reset form for new policy
      setName('');
      setDescription('');
      setProvider('');
      setTool('');
      setDefinition('{\n  \"checks\": []\n}'); // Default empty policy example
    }
  }, [policy]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setDefinitionError(null);
    let parsedDefinition: ScanPolicyDefinition = {};

    try {
      parsedDefinition = JSON.parse(definition);
    } catch (e) {
      setDefinitionError('Invalid JSON format for policy definition.');
      return;
    }

    const policyData: NewScanPolicyData | UpdateScanPolicyData = {
      name,
      description,
      provider: provider as string, // Cast because state allows '', but submit requires valid provider
      tool,
      definition: parsedDefinition,
    };
    
    await onSave(policyData, policy?.id);
  };
  
  const filteredTools = () => {
    if (provider === 'GCP') return ['Prowler', 'CloudSploit', 'GCP-SCC'];
    if (provider === 'AWS' || provider === 'Azure') return ['Prowler', 'CloudSploit'];
    return availableTools; // Show all if no provider or handle as error
  }

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            id="policy-name"
            label="Policy Name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSaving}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required disabled={isSaving}>
            <InputLabel id="provider-select-label">Provider</InputLabel>
            <Select
              labelId="provider-select-label"
              id="provider-select"
              value={provider}
              label="Provider"
              onChange={(e) => {
                setProvider(e.target.value as CloudProviderStrings);
                // Optionally reset tool if current tool not valid for new provider
                if (e.target.value === 'GCP' && tool !== 'GCP-SCC' && tool !== 'Prowler' && tool !== 'CloudSploit') setTool('');
                else if ((e.target.value === 'AWS' || e.target.value === 'Azure') && tool === 'GCP-SCC') setTool('');
              }}
            >
              {availableProviders.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required disabled={isSaving || !provider}>
            <InputLabel id="tool-select-label">Tool</InputLabel>
            <Select
              labelId="tool-select-label"
              id="tool-select"
              value={tool}
              label="Tool"
              onChange={(e) => setTool(e.target.value as string)}
            >
              {filteredTools().map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            id="policy-description"
            label="Description (Optional)"
            name="description"
            multiline
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            id="policy-definition"
            label="Policy Definition (JSON)"
            name="definition"
            multiline
            rows={8}
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            error={!!definitionError}
            helperText={definitionError || "Enter the tool-specific policy rules in JSON format."}
            disabled={isSaving}
            InputProps={{ style: { fontFamily: 'monospace' } }}
          />
        </Grid>
      </Grid>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button onClick={onCancel} sx={{ mr: 1 }} disabled={isSaving}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={isSaving || !provider || !tool}>
          {isSaving ? 'Saving...' : (policy ? 'Save Changes' : 'Create Policy')}
        </Button>
      </Box>
    </Box>
  );
};

export default ScanPolicyForm;
