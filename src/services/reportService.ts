// src/services/reportService.ts
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const generateReport = async (scanId: number, format: 'PDF' | 'HTML') => {
  const res = await axios.post(`${API_BASE_URL}/reports`, { scanId, format });
  // Return a URL or binary data, depending on how your backend is set up
  return res.data.reportUrl;
};

export default {
  generateReport,
};
