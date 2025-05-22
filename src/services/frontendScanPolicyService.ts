// src/services/frontendScanPolicyService.ts
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants'; // Ensure this path is correct

export interface ScanPolicyDefinition {
  // Define based on what you expect, e.g., for Prowler:
  checks?: string[];
  excludedChecks?: string[];
  services?: string[];
  complianceFrameworks?: string[];
  customArgs?: string;
  // For CloudSploit:
  plugins?: string[]; // Note: scanner currently only uses plugins[0]
  compliance?: string;
  suppressions?: string[];
  // For GCP-SCC:
  sccFilter?: string;
  customGcloudArgs?: string; // Added to match GcpSccScanner
}

export interface ScanPolicy {
  id: number;
  userId: number;
  name: string;
  provider: string; // 'AWS', 'Azure', 'GCP'
  tool: string; // 'Prowler', 'CloudSploit', 'GCP-SCC'
  description?: string;
  definition?: ScanPolicyDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface NewScanPolicyData {
  name: string;
  provider: string;
  tool: string;
  description?: string;
  definition?: ScanPolicyDefinition;
}

export interface UpdateScanPolicyData extends Partial<NewScanPolicyData> {}

const getAuthHeaders = () => {
  const token = localStorage.getItem('token'); // Or however you store your auth token
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getScanPolicies = async (): Promise<ScanPolicy[]> => {
  const res = await axios.get(`${API_BASE_URL}/scan-policies`, { headers: getAuthHeaders() });
  return res.data;
};

const getScanPolicyById = async (policyId: number): Promise<ScanPolicy> => {
  const res = await axios.get(`${API_BASE_URL}/scan-policies/${policyId}`, { headers: getAuthHeaders() });
  return res.data;
};

const createScanPolicy = async (data: NewScanPolicyData): Promise<ScanPolicy> => {
  const res = await axios.post(`${API_BASE_URL}/scan-policies`, data, { headers: getAuthHeaders() });
  return res.data;
};

const updateScanPolicy = async (policyId: number, data: UpdateScanPolicyData): Promise<ScanPolicy> => {
  const res = await axios.put(`${API_BASE_URL}/scan-policies/${policyId}`, data, { headers: getAuthHeaders() });
  return res.data;
};

const deleteScanPolicy = async (policyId: number): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/scan-policies/${policyId}`, { headers: getAuthHeaders() });
};

export default {
  getScanPolicies,
  getScanPolicyById,
  createScanPolicy,
  updateScanPolicy,
  deleteScanPolicy,
};
