// src/services/scanService.ts
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const getScans = async () => {
  const res = await axios.get(`${API_BASE_URL}/scans`);
  return res.data; // list of scans
};

const startScan = async (tools: string[]) => {
  const res = await axios.post(`${API_BASE_URL}/scans`, { tools });
  return res.data; // newly created scan
};

const getFindingsByScanId = async (scanId: number) => {
  const res = await axios.get(`${API_BASE_URL}/scans/${scanId}/findings`);
  return res.data; // list of findings
};

export default {
  getScans,
  startScan,
  getFindingsByScanId,
};
