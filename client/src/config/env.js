const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const RAILWAY_BASE_URL = "https://test-9she.onrender.com";
const ECOM_BASE_URL = "https://ecommerce-integration.onrender.com";
const RAILWAY_USER_ID = import.meta.env.VITE_RAILWAY_USER_ID || "2";
const RAILWAY_CART_ID = import.meta.env.VITE_RAILWAY_CART_ID || "1";
const RAILWAY_AUTH_TOKEN = import.meta.env.VITE_RAILWAY_AUTH_TOKEN || "";
const ECOM_AUTH_TOKEN = import.meta.env.VITE_ECOM_AUTH_TOKEN || "";
const PHONESTORE_BASE_URL =
  import.meta.env.VITE_PHONESTORE_BASE_URL ||
  "https://phone-store-dinh.vercel.app";
const PHONESTORE_USERNAME =
  import.meta.env.VITE_PHONESTORE_USERNAME || "dinh2707";

export {
  API_URL,
  RAILWAY_BASE_URL,
  ECOM_BASE_URL,
  RAILWAY_USER_ID,
  RAILWAY_CART_ID,
  RAILWAY_AUTH_TOKEN,
  ECOM_AUTH_TOKEN,
  PHONESTORE_BASE_URL,
  PHONESTORE_USERNAME,
};
