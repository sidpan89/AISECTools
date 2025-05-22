// src/services/scanService.ts
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants'; // Ensure this path is correct

// Assuming Scan and Findings types are defined elsewhere, e.g., in a types.ts or directly in components
// For now, we'll use 'any' as a placeholder if they are not explicitly defined for the service.
export interface Scan {
  id: number;
  status: string;
  toolsUsed?: string; // This might be deprecated or changed in backend
  tool?: string; // New field for specific tool
  cloudProvider?: string;
  credentialId?: number;
  targetIdentifier?: string;
  createdAt: string; // Assuming ISO string date
  updatedAt: string; // Assuming ISO string date
  completedAt?: string; // Assuming ISO string date
  errorMessage?: string;
  // Add other fields from your backend Scan model if needed for frontend display
}

export interface Finding {
  id: number;
  scanId: number;
  severity: string;
  description: string;
  category: string;
  resource: string;
  recommendation: string;
  // Add other fields from your backend Findings model
}


export interface StartScanPayload {
  credentialId: number;
  toolName: string;
  targetIdentifier?: string;
  policyId?: number; // Added policyId
}

const getScans = async (): Promise<Scan[]> => {
  const token = localStorage.getItem('token');
  const res = await axios.get(`${API_BASE_URL}/scans`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

const getFindingsByScanId = async (scanId: number): Promise<Finding[]> => {
  const token = localStorage.getItem('token');
  const res = await axios.get(`${API_BASE_URL}/scans/${scanId}/findings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

const startScan = async (payload: StartScanPayload): Promise<Scan> => {
  const token = localStorage.getItem('token');
  const res = await axios.post(`${API_BASE_URL}/scans`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
    }
  });
  return res.data; // newly created scan
};

export default {
  getScans,
  getFindingsByScanId,
  startScan,
};
