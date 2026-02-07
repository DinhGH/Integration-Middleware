const express = require("express");
const { forwardRequest, buildPhoneStoreCookie } = require("../utils/http");
const {
  RAILWAY_BASE_URL,
  ECOM_BASE_URL,
  PHONESTORE_BASE_URL,
  RAILWAY_AUTH_TOKEN,
  ECOM_AUTH_TOKEN,
  RAILWAY_USER_ID,
  PHONESTORE_USERNAME,
} = require("../config/env");

const router = express.Router();

// Normalize field names across different schemas
function normalizeOrder(order) {
  const getId = (obj) => obj.id || obj.orderId || obj.order_id || obj.OrderId || obj.ID;
  const getTotal =
    (obj) =>
      obj.total ||
      obj.totalAmount ||
      obj.total_amount ||
      obj.TotalAmount ||
      obj.amount ||
      obj.Amount ||
      obj.payment?.paymentAmount ||
      0;
  const getStatus = (obj) => obj.status || obj.Status || obj.state || obj.State || "unknown";
  const getDate =
    (obj) =>
      obj.createdAt ||
      obj.created_at ||
      obj.orderDate ||
      obj.order_date ||
      obj.date ||
      obj.Date ||
      obj.updatedAt ||
      new Date().toISOString();
  const getUserId = (obj) => obj.userId || obj.user_id || obj.UserId || obj.customerId || obj.customer_id;

  return {
    id: getId(order),
    total: parseFloat(getTotal(order)) || 0,
    status: getStatus(order),
    date: getDate(order),
    userId: getUserId(order),
    raw: order, // Keep raw data for accessing items[]
  };
}

function extractOrders(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.orders)) return payload.orders;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.rows)) return payload.rows;

  if (payload.data && typeof payload.data === "object") {
    if (Array.isArray(payload.data.orders)) return payload.data.orders;
    if (Array.isArray(payload.data.items)) return payload.data.items;
    if (Array.isArray(payload.data.rows)) return payload.data.rows;
  }

  return [];
}

function toDateKey(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return typeof value === "string" ? value.slice(0, 10) : "";
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeOrderItem(item) {
  const getQuantity = (obj) => obj.quantity || obj.qty || obj.Quantity || obj.amount || 1;
  const getPrice = (obj) => obj.price || obj.unitPrice || obj.unit_price || obj.Price || 0;
  const getProductId = (obj) => obj.productId || obj.product_id || obj.ProductId || obj.itemId;
  const getOrderId = (obj) => obj.orderId || obj.order_id || obj.OrderId;

  return {
    quantity: parseInt(getQuantity(item)) || 1,
    price: parseFloat(getPrice(item)) || 0,
    productId: getProductId(item),
    orderId: getOrderId(item),
  };
}

function normalizeUser(user) {
  const getId = (obj) => obj.id || obj.userId || obj.user_id || obj.UserId || obj.ID;
  const getDate = (obj) => obj.createdAt || obj.created_at || obj.joinDate || obj.join_date || obj.registrationDate || new Date().toISOString();
  const getName = (obj) => obj.name || obj.username || obj.userName || obj.fullName || obj.full_name || "Unknown";

  return {
    id: getId(user),
    createdAt: getDate(user),
    name: getName(user),
  };
}

// Get analytics data from legacy systems
router.get("/analytics", async (req, res) => {
  try {
    const { startDate, endDate, database } = req.query;
    
    const analytics = {
      totalRevenue: 0,
      productsSold: 0,
      newCustomers: 0,
      orderCount: 0,
      averageOrderValue: 0,
      revenueByDate: [],
      topProducts: [],
      ordersByStatus: [],
      databases: [],
    };

    // Helper to build authorization headers
    const getRailwayHeaders = () => {
      const headers = {};
      if (RAILWAY_AUTH_TOKEN) {
        headers.Authorization = `Bearer ${RAILWAY_AUTH_TOKEN}`;
      }
      return headers;
    };

    const authHeader = req.headers.authorization || "";
    const headerToken = authHeader.replace(/^Bearer\s+/i, "");
    const directToken = req.headers["x-access-token"] || req.headers.token;
    const queryToken = req.query.ecomToken || "";
    const ecomToken = headerToken || directToken || queryToken || ECOM_AUTH_TOKEN;

    const getEcomHeaders = () => {
      const headers = {};
      if (ecomToken) {
        headers.Authorization = `Bearer ${ecomToken}`;
        headers["Content-Type"] = "application/json";
        headers["x-access-token"] = ecomToken;
        headers.token = ecomToken;
        headers.Accept = "application/json";
      }
      return headers;
    };

    const railwayUserId = req.query.userId || RAILWAY_USER_ID;
    const phoneStoreUsername = req.query.username || PHONESTORE_USERNAME;

    // Fetch orders from Railway
    let railwayOrders = [];
    if (!database || database === "railway") {
      try {
        if (!railwayUserId) {
          throw new Error("Missing Railway userId");
        }
        const url = new URL(`/ecom/orders/orders/${railwayUserId}`, RAILWAY_BASE_URL).toString();
        const result = await forwardRequest(url, {
          method: "GET",
          headers: getRailwayHeaders(),
        });
        if (result.status === 200) {
          railwayOrders = extractOrders(result.data);
        }
      } catch (error) {
        console.error("[Railway] Error:", error.message);
      }
    }

    // Fetch orders from Microservice
    let microserviceOrders = [];
    if (!database || database === "microservice") {
      try {
        if (!ecomToken) {
          console.warn("[Microservice] Missing token from request and env.");
        }
        const url = new URL("/api/orders/my-orders", ECOM_BASE_URL);
        if (ecomToken) {
          url.searchParams.set("token", ecomToken);
          url.searchParams.set("access_token", ecomToken);
          url.searchParams.set("auth", ecomToken);
        }
        const result = await forwardRequest(url.toString(), {
          method: "GET",
          headers: getEcomHeaders(),
        });
        if (result.status === 200) {
          microserviceOrders = extractOrders(result.data);
        } else {
          console.warn("[Microservice] Status:", result.status);
          console.warn(
            "[Microservice] Response preview:",
            JSON.stringify(result.data).slice(0, 200),
          );
        }
      } catch (error) {
        console.error("[Microservice] Error:", error.message);
      }
    }

    // Fetch orders from Phone Store
    let phoneStoreOrders = [];
    if (!database || database === "phonewebsite") {
      try {
        if (!phoneStoreUsername) {
          throw new Error("Missing PhoneStore username");
        }
        const url = new URL("/api/orders", PHONESTORE_BASE_URL).toString();
        const headers = {
          Cookie: buildPhoneStoreCookie(phoneStoreUsername),
        };
        const result = await forwardRequest(url, {
          method: "GET",
          headers,
        });
        if (result.status === 200) {
          phoneStoreOrders = extractOrders(result.data);
        }
      } catch (error) {
        console.error("[PhoneStore] Error:", error.message);
      }
    }

    // Process all orders
    const allOrders = [
      ...railwayOrders.map(o => ({ ...normalizeOrder(o), source: "railway" })),
      ...microserviceOrders.map(o => ({ ...normalizeOrder(o), source: "microservice" })),
      ...phoneStoreOrders.map(o => ({ ...normalizeOrder(o), source: "phonewebsite" })),
    ];

    console.log(`Total orders processed: ${allOrders.length}`);

    // Filter by date range
    let filteredOrders = allOrders;
    if (startDate || endDate) {
      filteredOrders = allOrders.filter((order) => {
        const orderKey = toDateKey(order.date);
        if (!orderKey) return false;
        if (startDate && orderKey < startDate) return false;
        if (endDate && orderKey > endDate) return false;
        return true;
      });
    }

    // Calculate revenue
    const revenue = filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    analytics.totalRevenue = revenue;
    analytics.orderCount = filteredOrders.length;

    // Revenue by date
    const revenueMap = {};
    filteredOrders.forEach((order) => {
      const date = toDateKey(order.date);
      if (!date) return;
      revenueMap[date] = (revenueMap[date] || 0) + order.total;
    });

    analytics.revenueByDate = Object.entries(revenueMap)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    // Orders by status
    const statusMap = {};
    filteredOrders.forEach((order) => {
      statusMap[order.status] = (statusMap[order.status] || 0) + 1;
    });

    analytics.ordersByStatus = Object.entries(statusMap).map(([status, count]) => ({
      status,
      count,
    }));

    // Calculate products sold
    // For now, estimate from order items if available
    let totalProductsSold = 0;
    const productMap = {};

    filteredOrders.forEach((order) => {
      const raw = order.raw || {};
      const items =
        raw.items ||
        raw.orderItems ||
        raw.orderItem ||
        raw.order_items ||
        [];

      if (!Array.isArray(items)) return;

      items.forEach((item) => {
        const qty = parseInt(item.quantity || item.qty || 1) || 1;
        const price =
          parseFloat(
            item.price ||
              item.unitPrice ||
              item.unit_price ||
              item.product?.price ||
              0,
          ) || 0;
        totalProductsSold += qty;

        const pid =
          item.productId ||
          item.product_id ||
          item.product?.productId ||
          item.product?.id ||
          "unknown";

        if (!productMap[pid]) {
          productMap[pid] = { productId: pid, quantity: 0, revenue: 0 };
        }
        productMap[pid].quantity += qty;
        productMap[pid].revenue += qty * price;
      });
    });

    analytics.productsSold = totalProductsSold;
    analytics.topProducts = Object.values(productMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Calculate average order value
    analytics.averageOrderValue = analytics.orderCount > 0
      ? analytics.totalRevenue / analytics.orderCount
      : 0;

    // Database summary
    const dbSummary = {};
    filteredOrders.forEach((order) => {
      const source = order.source;
      if (!dbSummary[source]) {
        dbSummary[source] = {
          database: source,
          revenue: 0,
          productsSold: 0,
          orderCount: 0,
          hasData: false,
        };
      }
      dbSummary[source].revenue += order.total;
      dbSummary[source].orderCount += 1;
      dbSummary[source].hasData = true;

      // Count products
      const raw = order.raw || {};
      const items =
        raw.items ||
        raw.orderItems ||
        raw.orderItem ||
        raw.order_items ||
        [];
      if (Array.isArray(items)) {
        items.forEach((item) => {
          dbSummary[source].productsSold += parseInt(item.quantity || 1) || 1;
        });
      }
    });

    analytics.databases = Object.values(dbSummary);

    return res.json(analytics);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Get available databases with order data
router.get("/analytics/databases", async (req, res) => {
  try {
    const databases = [
      {
        name: "railway",
        ordersTable: "/ecom/orders/orders/{userId}",
        hasData: true,
      },
      {
        name: "microservice",
        ordersTable: "/api/orders/my-orders",
        hasData: true,
      },
      {
        name: "phonewebsite",
        ordersTable: "/api/orders",
        hasData: true,
      },
    ];

    return res.json({ databases });
  } catch (error) {
    console.error("Error fetching databases:", error);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
