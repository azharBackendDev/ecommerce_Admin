// /lib/apiClient.js
import axios from "axios";

const api = axios.create({
  // baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api",
  baseURL: "http://localhost:5000/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Optional (future ready)
 * Auth / logging / error handling
 */

// api.interceptors.request.use(
//   (config) => {
//     // const token = localStorage.getItem("token");
//     // if (token) config.headers.Authorization = `Bearer ${token}`;
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     console.error("API Error:", error.response || error.message);
//     return Promise.reject(error);
//   }
// );

export default api;
