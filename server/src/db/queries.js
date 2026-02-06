const { dbConfigs } = require("../config/databases");
const { pools, sql } = require("./pools");

function isSafeIdentifier(name) {
  return /^[A-Za-z0-9_]+$/.test(name);
}

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

async function getTableData(dbName, tableName) {
  try {
    const config = dbConfigs[dbName];
    const pool = pools[dbName];

    if (config.type === "mysql") {
      const connection = await pool.getConnection();

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

module.exports = { getTables, getTableData, getTableStructure };
