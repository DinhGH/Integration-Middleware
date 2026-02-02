const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Parse database URLs
const dbConfigs = {
  railway: {
    host: "nozomi.proxy.rlwy.net",
    user: "product_reader",
    password: "StrongPassword123",
    database: "railway",
    port: 42912,
  },
  microservice: {
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
    pools[name] = mysql.createPool(config);
    console.log(`Pool '${name}' created`);
  }
}

// Get all tables from a database
async function getTables(dbName) {
  try {
    const pool = pools[dbName];
    const connection = await pool.getConnection();

    const [tables] = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?",
      [dbConfigs[dbName].database],
    );

    connection.release();
    return tables.map((t) => t.TABLE_NAME);
  } catch (error) {
    console.error(`Error getting tables from ${dbName}:`, error);
    return [];
  }
}

// Get data from a specific table
async function getTableData(dbName, tableName) {
  try {
    const pool = pools[dbName];
    const connection = await pool.getConnection();

    // Limit to 1000 rows to avoid huge responses
    const [rows] = await connection.query(
      `SELECT * FROM \`${tableName}\` LIMIT 1000`,
    );

    connection.release();
    return rows;
  } catch (error) {
    console.error(`Error getting data from ${dbName}.${tableName}:`, error);
    return [];
  }
}

// Get table structure
async function getTableStructure(dbName, tableName) {
  try {
    const pool = pools[dbName];
    const connection = await pool.getConnection();

    const [columns] = await connection.query(
      "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?",
      [dbConfigs[dbName].database, tableName],
    );

    connection.release();
    return columns;
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
