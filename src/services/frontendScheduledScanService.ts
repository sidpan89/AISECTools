// src/services/frontendScheduledScanService.ts
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { ScanPolicyDefinition } from './frontendScanPolicyService'; // For embedded policy details if needed

// Interface for ScheduledScan object received from backend (includes populated credential/policy names for display)
export interface ScheduledScan {
  id: number;
  userId: number;
  name: string;
  description?: string;
  credentialId: number;
  toolName: string;
  targetIdentifier?: string | null;
  policyId?: number | null;
  cronExpression: string;
  isEnabled: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null; // Backend might not populate this accurately with node-cron alone
  createdAt: string;
  updatedAt: string;
  // Optional: populated by backend for easier display
  credential?: { id: number; name: string; provider: string };
  policy?: { id: number; name: string };
}

export interface NewScheduledScanData {
  name: string;
  description?: string;
  credentialId: number;
  toolName: string;
  targetIdentifier?: string | null;
  policyId?: number | null;
  cronExpression: string;
  isEnabled?: boolean;
}

export interface UpdateScheduledScanData extends Partial<NewScheduledScanData> {}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getScheduledScans = async (): Promise<ScheduledScan[]> => {
  const res = await axios.get(`${API_BASE_URL}/scheduled-scans`, { headers: getAuthHeaders() });
  return res.data;
};

const getScheduledScanById = async (scheduleId: number): Promise<ScheduledScan> => {
  const res = await axios.get(`${API_BASE_URL}/scheduled-scans/${scheduleId}`, { headers: getAuthHeaders() });
  return res.data;
};

const createScheduledScan = async (data: NewScheduledScanData): Promise<ScheduledScan> => {
  const res = await axios.post(`${API_BASE_URL}/scheduled-scans`, data, { headers: getAuthHeaders() });
  return res.data;
};

const updateScheduledScan = async (scheduleId: number, data: UpdateScheduledScanData): Promise<ScheduledScan> => {
  const res = await axios.put(`${API_BASE_URL}/scheduled-scans/${scheduleId}`, data, { headers: getAuthHeaders() });
  return res.data;
};

const deleteScheduledScan = async (scheduleId: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/scheduled-scans/${scheduleId}`, { headers: getAuthHeaders() });
};

export default {
  getScheduledScans,
  getScheduledScanById,
  createScheduledScan,
  updateScheduledScan,
  deleteScheduledScan,
};
