// src/services/frontendCredentialService.ts
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants'; // Assuming this path is correct

// Interface for the (sanitized) credential object received from backend
export interface SanitizedCloudCredential {
  id: number;
  userId: number;
  provider: string; // Should match CloudProvider enum values (AWS, Azure, GCP)
  name: string;
  // The 'credentials' field from backend is a JSON string of the actual creds.
  // The backend sanitizes sensitive fields before sending.
  // For listing, we might only care about id, name, provider.
  // For a form, we might need to reconstruct or show parts of it.
  // Let's assume the backend sends a simplified object for listing.
  createdAt: string;
  updatedAt: string;
}

// Interface for the data sent to create a new credential
export interface NewCredentialData {
  provider: string; // 'AWS', 'Azure', 'GCP'
  name: string;
  credentials: any; // This will be the provider-specific JSON object
                    // e.g., { tenantId, clientId, clientSecret } for Azure
                    // e.g., { accessKeyId, secretAccessKey, region } for AWS
                    // e.g., { type, project_id, ... } for GCP (the full JSON key file content)
}

const getCredentials = async (): Promise<SanitizedCloudCredential[]> => {
  // TODO: Add authorization headers if required by the backend
  const token = localStorage.getItem('token');
  const res = await axios.get(`${API_BASE_URL}/credentials`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

const saveCredential = async (data: NewCredentialData): Promise<any> => {
  // TODO: Add authorization headers
  const token = localStorage.getItem('token');
  const res = await axios.post(`${API_BASE_URL}/credentials`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
};

const deleteCredential = async (credentialId: number): Promise<void> => {
  // TODO: Add authorization headers
  const token = localStorage.getItem('token');
  await axios.delete(`${API_BASE_URL}/credentials/${credentialId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export default {
  getCredentials,
  saveCredential,
  deleteCredential,
};
