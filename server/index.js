const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");
const sql = require("mssql");

const app = express();
const PORT = process.env.PORT || 5000;
const RAILWAY_BASE_URL =
  process.env.RAILWAY_BASE_URL || "https://test-9she.onrender.com";
const ECOM_BASE_URL =
  process.env.ECOM_BASE_URL || "https://ecommerce-integration.onrender.com";
const RAILWAY_AUTH_TOKEN = process.env.RAILWAY_AUTH_TOKEN || "";
const ECOM_AUTH_TOKEN = process.env.ECOM_AUTH_TOKEN || "";

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

async function forwardRequest(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = text;
  }

  return { status: response.status, data };
}

// Database configurations
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
};

// Create connection pools for both databases
const pools = {};

async function initializePools() {
  for (const [name, config] of Object.entries(dbConfigs)) {
    if (config.type === "mysql") {
      const { type, ...mysqlConfig } = config;
      pools[name] = mysql.createPool(mysqlConfig);
      console.log(`Pool '${name}' created`);
      continue;
    }

    if (config.type === "mssql") {
      if (!config.connectionString) {
        throw new Error(
          `Missing MSSQL_CONN_STR for '${name}'. Add it to the root .env file.`,
        );
      }

      try {
        const pool = new sql.ConnectionPool(config.connectionString);
        await pool.connect();
        pools[name] = pool;
        console.log(`Pool '${name}' created`);
      } catch (error) {
        pools[name] = null;
        console.error(`Failed to connect to SQL Server for '${name}':`, error);
      }
      continue;
    }

    throw new Error(`Unsupported database type for '${name}'.`);
  }
}

function isSafeIdentifier(name) {
  return /^[A-Za-z0-9_]+$/.test(name);
}

// Get all tables from a database
async function getTables(dbName) {
  try {
    const config = dbConfigs[dbName];
    const pool = pools[dbName];

    if (config.type === "mysql") {
      const connection = await pool.getConnection();

      const [tables] = await connection.query(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?",
        [config.database],
      );

      connection.release();
      return tables.map((t) => t.TABLE_NAME);
    }

    if (config.type === "mssql") {
      if (!pool) {
        throw new Error("SQL Server pool is not connected.");
      }
      const request = pool.request();
      request.input("schema", sql.NVarChar, config.schema || "dbo");

      const result = await request.query(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = @schema AND TABLE_TYPE = 'BASE TABLE'",
      );

      return result.recordset.map((t) => t.TABLE_NAME);
    }

    throw new Error(`Unsupported database type for '${dbName}'.`);
  } catch (error) {
    console.error(`Error getting tables from ${dbName}:`, error);
    return [];
  }
}

// Get data from a specific table
async function getTableData(dbName, tableName) {
  try {
    const config = dbConfigs[dbName];
    const pool = pools[dbName];

    if (config.type === "mysql") {
      const connection = await pool.getConnection();

      // Limit to 1000 rows to avoid huge responses
      const [rows] = await connection.query(
        `SELECT * FROM \`${tableName}\` LIMIT 1000`,
      );

      connection.release();
      return rows;
    }

    if (config.type === "mssql") {
      if (!pool) {
        throw new Error("SQL Server pool is not connected.");
      }
      if (!isSafeIdentifier(tableName)) {
        throw new Error("Invalid table name.");
      }

      const schema = config.schema || "dbo";
      const query = `SELECT TOP (1000) * FROM [${schema}].[${tableName}]`;
      const result = await pool.request().query(query);
      return result.recordset;
    }

    throw new Error(`Unsupported database type for '${dbName}'.`);
  } catch (error) {
    console.error(`Error getting data from ${dbName}.${tableName}:`, error);
    return [];
  }
}

// Get table structure
async function getTableStructure(dbName, tableName) {
  try {
    const config = dbConfigs[dbName];
    const pool = pools[dbName];

    if (config.type === "mysql") {
      const connection = await pool.getConnection();

      const [columns] = await connection.query(
        "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
        [config.database, tableName],
      );

      connection.release();
      return columns;
    }

    if (config.type === "mssql") {
      if (!pool) {
        throw new Error("SQL Server pool is not connected.");
      }
      if (!isSafeIdentifier(tableName)) {
        throw new Error("Invalid table name.");
      }

      const request = pool.request();
      request.input("schema", sql.NVarChar, config.schema || "dbo");
      request.input("tableName", sql.NVarChar, tableName);

      const result = await request.query(
        "SELECT COLUMN_NAME, DATA_TYPE AS COLUMN_TYPE, IS_NULLABLE, COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') AS IS_IDENTITY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = @tableName ORDER BY ORDINAL_POSITION",
      );

      return result.recordset;
    }

    throw new Error(`Unsupported database type for '${dbName}'.`);
  } catch (error) {
    console.error(
      `Error getting table structure from ${dbName}.${tableName}:`,
      error,
    );
    return [];
  }
}

// API Routes

// Get list of all databases
app.get("/api/databases", (req, res) => {
  res.json({
    databases: Object.keys(dbConfigs),
  });
});

// Get all tables from a database
app.get("/api/:dbName/tables", async (req, res) => {
  const { dbName } = req.params;

  if (!dbConfigs[dbName]) {
    return res.status(400).json({ error: "Database not found" });
  }

  const tables = await getTables(dbName);
  res.json({ database: dbName, tables });
});

// Get data from a specific table
app.get("/api/:dbName/:tableName", async (req, res) => {
  const { dbName, tableName } = req.params;

  if (!dbConfigs[dbName]) {
    return res.status(400).json({ error: "Database not found" });
  }

  const [data, structure] = await Promise.all([
    getTableData(dbName, tableName),
    getTableStructure(dbName, tableName),
  ]);

  res.json({
    database: dbName,
    table: tableName,
    columns: structure,
    data: data,
    rowCount: data.length,
  });
});

// Get all databases with their tables and data
app.get("/api/all-data", async (req, res) => {
  const allData = {};

  for (const dbName of Object.keys(dbConfigs)) {
    const tables = await getTables(dbName);
    allData[dbName] = {
      tables: tables,
      data: {},
    };

    for (const tableName of tables) {
      const tableData = await getTableData(dbName, tableName);
      allData[dbName].data[tableName] = {
        rowCount: tableData.length,
        data: tableData,
      };
    }
  }

  res.json(allData);
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

function normalizeBearerToken(token) {
  if (!token) return "";
  return token.toLowerCase().startsWith("bearer ")
    ? token
    : `Bearer ${token}`;
}

function buildForwardHeaders(req, extraHeaders = {}, authFallback = "") {
  const headers = { ...extraHeaders };
  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  } else if (authFallback) {
    headers.Authorization = normalizeBearerToken(authFallback);
  }
  if (req.headers.cookie) headers.Cookie = req.headers.cookie;
  return headers;
}

// Proxy: Railway cart
app.post("/api/proxy/railway/add-product", async (req, res) => {
  const userId = req.query.userId || req.body.userId;
  const productId = req.query.productId || req.body.productId;

  if (!userId || !productId) {
    return res.status(400).json({ error: "Missing userId or productId" });
  }

  const url = new URL("/ecom/cart/add-product", RAILWAY_BASE_URL);
  url.searchParams.set("userId", userId);
  url.searchParams.set("productId", productId);

  try {
    const headers = buildForwardHeaders(req, {}, RAILWAY_AUTH_TOKEN);
    console.log("Railway add-product", {
      url: url.toString(),
      hasAuth: Boolean(headers.Authorization),
    });

    const result = await forwardRequest(url.toString(), {
      method: "POST",
      headers,
    });
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Railway proxy failed:", error?.message || error);
    return res
      .status(502)
      .json({ error: "Railway proxy failed", detail: error?.message });
  }
});

app.put(
  "/api/proxy/railway/increase-productQty/:cartId/:productId",
  async (req, res) => {
    const { cartId, productId } = req.params;
    const url = new URL(
      `/ecom/cart/increase-productQty/${cartId}/${productId}`,
      RAILWAY_BASE_URL,
    );

    try {
      const headers = buildForwardHeaders(req, {}, RAILWAY_AUTH_TOKEN);
      console.log("Railway increase-productQty", {
        url: url.toString(),
        hasAuth: Boolean(headers.Authorization),
      });
      const result = await forwardRequest(url.toString(), {
        method: "PUT",
        headers,
      });
      return res.status(result.status).json(result.data);
    } catch (error) {
      console.error("Railway proxy failed:", error?.message || error);
      return res
        .status(502)
        .json({ error: "Railway proxy failed", detail: error?.message });
    }
  },
);

app.put(
  "/api/proxy/railway/decrease-productQty/:cartId/:productId",
  async (req, res) => {
    const { cartId, productId } = req.params;
    const url = new URL(
      `/ecom/cart/decrease-productQty/${cartId}/${productId}`,
      RAILWAY_BASE_URL,
    );

    try {
      const headers = buildForwardHeaders(req, {}, RAILWAY_AUTH_TOKEN);
      console.log("Railway decrease-productQty", {
        url: url.toString(),
        hasAuth: Boolean(headers.Authorization),
      });
      const result = await forwardRequest(url.toString(), {
        method: "PUT",
        headers,
      });
      return res.status(result.status).json(result.data);
    } catch (error) {
      console.error("Railway proxy failed:", error?.message || error);
      return res
        .status(502)
        .json({ error: "Railway proxy failed", detail: error?.message });
    }
  },
);

app.delete(
  "/api/proxy/railway/remove-product/:cartId/:productId",
  async (req, res) => {
    const { cartId, productId } = req.params;
    const url = new URL(
      `/ecom/cart/remove-product/${cartId}/${productId}`,
      RAILWAY_BASE_URL,
    );

    try {
      const headers = buildForwardHeaders(req, {}, RAILWAY_AUTH_TOKEN);
      console.log("Railway remove-product", {
        url: url.toString(),
        hasAuth: Boolean(headers.Authorization),
      });
      const result = await forwardRequest(url.toString(), {
        method: "DELETE",
        headers,
      });
      return res.status(result.status).json(result.data);
    } catch (error) {
      console.error("Railway proxy failed:", error?.message || error);
      return res
        .status(502)
        .json({ error: "Railway proxy failed", detail: error?.message });
    }
  },
);

// Proxy: Ecommerce cart
app.get("/api/proxy/ecom/cart", async (req, res) => {
  const url = new URL("/api/cart", ECOM_BASE_URL);
  try {
    const headers = buildForwardHeaders(req, {}, ECOM_AUTH_TOKEN);
    console.log("Ecom cart", {
      url: url.toString(),
      hasAuth: Boolean(headers.Authorization),
    });
    const result = await forwardRequest(url.toString(), {
      method: "GET",
      headers,
    });
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Ecommerce proxy failed:", error?.message || error);
    return res
      .status(502)
      .json({ error: "Ecommerce proxy failed", detail: error?.message });
  }
});

app.post("/api/proxy/ecom/cart/add", async (req, res) => {
  const url = new URL("/api/cart/add", ECOM_BASE_URL);
  try {
    const headers = buildForwardHeaders(
      req,
      {
        "Content-Type": "application/json",
      },
      ECOM_AUTH_TOKEN,
    );
    console.log("Ecom cart add", {
      url: url.toString(),
      hasAuth: Boolean(headers.Authorization),
    });
    const result = await forwardRequest(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(req.body || {}),
    });
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Ecommerce proxy failed:", error?.message || error);
    return res
      .status(502)
      .json({ error: "Ecommerce proxy failed", detail: error?.message });
  }
});

app.put("/api/proxy/ecom/cart/:id", async (req, res) => {
  const url = new URL(`/api/cart/${req.params.id}`, ECOM_BASE_URL);
  try {
    const headers = buildForwardHeaders(
      req,
      {
        "Content-Type": "application/json",
      },
      ECOM_AUTH_TOKEN,
    );
    console.log("Ecom cart update", {
      url: url.toString(),
      hasAuth: Boolean(headers.Authorization),
    });
    const result = await forwardRequest(url.toString(), {
      method: "PUT",
      headers,
      body: JSON.stringify(req.body || {}),
    });
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Ecommerce proxy failed:", error?.message || error);
    return res
      .status(502)
      .json({ error: "Ecommerce proxy failed", detail: error?.message });
  }
});

app.delete("/api/proxy/ecom/cart/:id", async (req, res) => {
  const url = new URL(`/api/cart/${req.params.id}`, ECOM_BASE_URL);
  try {
    const headers = buildForwardHeaders(req, {}, ECOM_AUTH_TOKEN);
    console.log("Ecom cart delete", {
      url: url.toString(),
      hasAuth: Boolean(headers.Authorization),
    });
    const result = await forwardRequest(url.toString(), {
      method: "DELETE",
      headers,
    });
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Ecommerce proxy failed:", error?.message || error);
    return res
      .status(502)
      .json({ error: "Ecommerce proxy failed", detail: error?.message });
  }
});

// Start server
initializePools()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database pools:", error);
    process.exit(1);
  });
