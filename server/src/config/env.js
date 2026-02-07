const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "..", "..", "..", ".env"),
});

const PORT = process.env.PORT || 5000;
const RAILWAY_BASE_URL =
  process.env.RAILWAY_BASE_URL || "https://test-9she.onrender.com";
const ECOM_BASE_URL =
  process.env.ECOM_BASE_URL || "https://ecommerce-integration.onrender.com";
const PHONESTORE_BASE_URL =
  process.env.PHONESTORE_BASE_URL || "https://phone-store-dinh.vercel.app";
const PHONESTORE_DATABASE_URL =
  process.env.PHONESTORE_DATABASE_URL || process.env.DATABASE_URL || "";
const RAILWAY_AUTH_TOKEN = process.env.RAILWAY_AUTH_TOKEN || "";
const ECOM_AUTH_TOKEN = process.env.ECOM_AUTH_TOKEN || "";
const RAILWAY_USER_ID = process.env.RAILWAY_USER_ID || "";
const PHONESTORE_USERNAME = process.env.PHONESTORE_USERNAME || "";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";

module.exports = {
  PORT,
  RAILWAY_BASE_URL,
  ECOM_BASE_URL,
  PHONESTORE_BASE_URL,
  PHONESTORE_DATABASE_URL,
  RAILWAY_AUTH_TOKEN,
  ECOM_AUTH_TOKEN,
  RAILWAY_USER_ID,
  PHONESTORE_USERNAME,
  GROQ_API_KEY,
};
