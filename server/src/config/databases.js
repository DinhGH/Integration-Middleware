const { PHONESTORE_DATABASE_URL } = require("./env");

function parseMysqlUrl(connectionString) {
  if (!connectionString) return null;
  const sanitized = connectionString
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/^'|'$/g, "");
  try {
    const url = new URL(sanitized);
    return {
      type: "mysql",
      host: url.hostname,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      port: Number(url.port) || 3306,
    };
  } catch (error) {
    console.error("Invalid MySQL connection string:", error);
    return null;
  }
}

const phoneStoreDbConfig = parseMysqlUrl(PHONESTORE_DATABASE_URL);

const dbConfigs = {
  railway: {
    type: "mysql",
    host: "nozomi.proxy.rlwy.net",
    user: "product_reader",
    password: "StrongPassword123",
    database: "railway",
    port: 42912,
  },
  microservice: {
    type: "mysql",
    host: "caboose.proxy.rlwy.net",
    user: "product_reader",
    password: "StrongPassword123!",
    database: "microservice",
    port: 59089,
  },
  ...(phoneStoreDbConfig ? { phonewebsite: phoneStoreDbConfig } : {}),
};

module.exports = { dbConfigs, parseMysqlUrl };
