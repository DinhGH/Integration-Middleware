const express = require("express");
const { dbConfigs } = require("../config/databases");
const { getTables, getTableData, getTableStructure } = require("../db/queries");

const router = express.Router();

router.get("/databases", (req, res) => {
  res.json({ databases: Object.keys(dbConfigs) });
});

router.get("/:dbName/tables", async (req, res) => {
  const { dbName } = req.params;

  if (!dbConfigs[dbName]) {
    return res.status(400).json({ error: "Database not found" });
  }

  const tables = await getTables(dbName);
  return res.json({ database: dbName, tables });
});

router.get("/:dbName/:tableName", async (req, res) => {
  const { dbName, tableName } = req.params;

  if (!dbConfigs[dbName]) {
    return res.status(400).json({ error: "Database not found" });
  }

  const [data, structure] = await Promise.all([
    getTableData(dbName, tableName),
    getTableStructure(dbName, tableName),
  ]);

  return res.json({
    database: dbName,
    table: tableName,
    columns: structure,
    data: data,
    rowCount: data.length,
  });
});

router.get("/all-data", async (req, res) => {
  const allData = {};

  for (const dbName of Object.keys(dbConfigs)) {
    const tables = await getTables(dbName);
    allData[dbName] = { tables, data: {} };

    for (const tableName of tables) {
      const tableData = await getTableData(dbName, tableName);
      allData[dbName].data[tableName] = {
        rowCount: tableData.length,
        data: tableData,
      };
    }
  }

  return res.json(allData);
});

router.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

module.exports = router;
