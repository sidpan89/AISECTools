// src/services/spService.ts
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const getServicePrincipal = async () => {
  const res = await axios.get(`${API_BASE_URL}/service-principals`);
  return res.data; // presumably one or multiple SPs
};

const saveServicePrincipal = async (spData: {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}) => {
  const res = await axios.post(`${API_BASE_URL}/service-principals`, spData);
  return res.data;
};

export default {
  getServicePrincipal,
  saveServicePrincipal,
};
