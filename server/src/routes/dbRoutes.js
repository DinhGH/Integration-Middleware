const express = require("express");
const { dbConfigs } = require("../config/databases");
const { getTables, getTableData, getTableStructure, getBestSellingProducts } = require("../db/queries");

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

// Best-selling endpoint - must be before catch-all /:dbName/:tableName
router.get("/:dbName/best-selling", async (req, res) => {
  const { dbName } = req.params;

  if (!dbConfigs[dbName]) {
    return res.status(400).json({ error: "Database not found" });
  }

  try {
    // Get products from database
    const products = await getBestSellingProducts(dbName);
    
    // Fetch orders from proxy endpoints to compute sales
    const salesMap = {};
    const ordersEndpoints = [
      `/api/proxy/railway/orders`,
      `/api/proxy/ecom/orders`,
      `/api/proxy/phonestore/orders`,
    ];

    // Try to fetch from each orders endpoint
    for (const endpoint of ordersEndpoints) {
      try {
        const response = await fetch(`http://localhost:5000${endpoint}`, {
          timeout: 5000,
        });
        if (!response.ok) continue;
        
        const orders = await response.json();
        if (!Array.isArray(orders)) continue;

        // Aggregate sales by product_id
        orders.forEach((order) => {
          let items = [];
          
          // Handle different order structures
          if (Array.isArray(order.items)) items = order.items;
          else if (Array.isArray(order.orderItems)) items = order.orderItems;
          else if (Array.isArray(order.products)) items = order.products;
          else if (order.items && typeof order.items === "object") items = [order.items];

          items.forEach((item) => {
            const productId = item.product_id || item.productId || item.id;
            const quantity = item.quantity || 1;

            if (productId !== undefined && productId !== null) {
              salesMap[String(productId)] = (salesMap[String(productId)] || 0) + quantity;
            }
          });
        });
      } catch (err) {
        console.log(`Could not fetch from ${endpoint}:`, err.message);
      }
    }

    // Enrich products with sales count and sort
    const bestSelling = products
      .map((product) => ({
        ...product,
        total_sold: salesMap[String(product.product_id)] || 0,
      }))
      .sort((a, b) => {
        // Sort by total_sold DESC, then price DESC
        if (b.total_sold !== a.total_sold) {
          return b.total_sold - a.total_sold;
        }
        return (b.price || 0) - (a.price || 0);
      });

    return res.json({
      database: dbName,
      bestSellingProducts: bestSelling,
      rowCount: bestSelling.length,
    });
  } catch (error) {
    console.error(`Error getting best-selling for ${dbName}:`, error);
    return res.status(500).json({
      error: "Failed to get best-selling products",
      detail: error.message,
    });
  }
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
