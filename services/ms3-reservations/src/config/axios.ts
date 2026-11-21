// Axios instance configured for internal service calls (MS2)
import axios from 'axios';
import { config } from './env';

export const internalAxios = axios.create({
  baseURL: config.ms2Url || 'http://localhost:3002', // fallback; should be set via env MS2_URL
  timeout: 5000,
  headers: {
    'X-Internal-Api-Key': config.internalApiKey,
    'Content-Type': 'application/json',
  },
});
