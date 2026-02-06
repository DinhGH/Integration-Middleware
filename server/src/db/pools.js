const mysql = require("mysql2/promise");
const sql = require("mssql");
const { dbConfigs } = require("../config/databases");

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

module.exports = { pools, initializePools, sql };
