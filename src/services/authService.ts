// src/services/authService.ts
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const login = async (username: string, password: string) => {
  const res = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
  // Store JWT or handle cookie-based session
  return res.data;
};

const logout = async () => {
  // Possibly call an API logout or remove local tokens
};

export default {
  login,
  logout,
};
