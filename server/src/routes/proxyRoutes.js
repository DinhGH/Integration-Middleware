const express = require("express");
const {
  RAILWAY_BASE_URL,
  ECOM_BASE_URL,
  PHONESTORE_BASE_URL,
  RAILWAY_AUTH_TOKEN,
  ECOM_AUTH_TOKEN,
} = require("../config/env");
const {
  forwardRequest,
  buildForwardHeaders,
  buildPhoneStoreCookie,
} = require("../utils/http");

const router = express.Router();

router.post("/proxy/railway/add-product", async (req, res) => {
  const userId = req.query.userId || req.body.userId;
  const productId = req.query.productId || req.body.productId;
  const cartId = req.query.cartId || req.body.cartId;

  if (!userId || !productId) {
    return res.status(400).json({ error: "Missing userId or productId" });
  }

  const url = new URL("/ecom/cart/add-product", RAILWAY_BASE_URL);
  url.searchParams.set("userId", userId);
  url.searchParams.set("productId", productId);

  try {
    const headers = buildForwardHeaders(
      req,
      {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      RAILWAY_AUTH_TOKEN,
    );
    console.log("Railway add-product", {
      url: url.toString(),
      hasAuth: Boolean(headers.Authorization),
    });

    const result = await forwardRequest(url.toString(), {
      method: "POST",
      headers,
    });
    console.log("Railway add-product response", {
      status: result.status,
      data: result.data,
    });

    const alreadyInCart =
      result.status === 502 &&
      typeof result.data?.message === "string" &&
      result.data.message.toLowerCase().includes("already in the cart");

    if (alreadyInCart && cartId) {
      const increaseUrl = new URL(
        `/ecom/cart/increase-productQty/${cartId}/${productId}`,
        RAILWAY_BASE_URL,
      );
      const increaseResult = await forwardRequest(increaseUrl.toString(), {
        method: "PUT",
        headers,
      });
      console.log("Railway add-product fallback increase", {
        status: increaseResult.status,
        data: increaseResult.data,
      });
      return res.status(increaseResult.status).json(increaseResult.data);
    }

    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Railway proxy failed:", error?.message || error);
    return res
      .status(502)
      .json({ error: "Railway proxy failed", detail: error?.message });
  }
});

router.put(
  "/proxy/railway/increase-productQty/:cartId/:productId",
  async (req, res) => {
    const { cartId, productId } = req.params;
    const url = new URL(
      `/ecom/cart/increase-productQty/${cartId}/${productId}`,
      RAILWAY_BASE_URL,
    );

    try {
      const headers = buildForwardHeaders(
        req,
        {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        RAILWAY_AUTH_TOKEN,
      );
      console.log("Railway increase-productQty", {
        url: url.toString(),
        hasAuth: Boolean(headers.Authorization),
      });
      const result = await forwardRequest(url.toString(), {
        method: "PUT",
        headers,
      });
      console.log("Railway increase-productQty response", {
        status: result.status,
        data: result.data,
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

router.put(
  "/proxy/railway/decrease-productQty/:cartId/:productId",
  async (req, res) => {
    const { cartId, productId } = req.params;
    const url = new URL(
      `/ecom/cart/decrease-productQty/${cartId}/${productId}`,
      RAILWAY_BASE_URL,
    );

    try {
      const headers = buildForwardHeaders(
        req,
        {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        RAILWAY_AUTH_TOKEN,
      );
      console.log("Railway decrease-productQty", {
        url: url.toString(),
        hasAuth: Boolean(headers.Authorization),
      });
      const result = await forwardRequest(url.toString(), {
        method: "PUT",
        headers,
      });
      console.log("Railway decrease-productQty response", {
        status: result.status,
        data: result.data,
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

router.delete(
  "/proxy/railway/remove-product/:cartId/:productId",
  async (req, res) => {
    const { cartId, productId } = req.params;
    const url = new URL(
      `/ecom/cart/remove-product/${cartId}/${productId}`,
      RAILWAY_BASE_URL,
    );

    try {
      const headers = buildForwardHeaders(
        req,
        {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        RAILWAY_AUTH_TOKEN,
      );
      console.log("Railway remove-product", {
        url: url.toString(),
        hasAuth: Boolean(headers.Authorization),
      });
      const result = await forwardRequest(url.toString(), {
        method: "DELETE",
        headers,
      });
      console.log("Railway remove-product response", {
        status: result.status,
        data: result.data,
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

router.get("/proxy/railway/cart", async (req, res) => {
  const userId = req.query.userId;
  const cartId = req.query.cartId;

  if (!cartId && !userId) {
    return res.status(400).json({ error: "Missing cartId or userId" });
  }

  const headers = buildForwardHeaders(req, {}, RAILWAY_AUTH_TOKEN);

  const tryRequest = async (path, label) => {
    const url = new URL(path, RAILWAY_BASE_URL);
    console.log("Railway cart", {
      url: url.toString(),
      hasAuth: Boolean(headers.Authorization),
      label,
    });
    const result = await forwardRequest(url.toString(), {
      method: "GET",
      headers,
    });
    console.log("Railway cart response", {
      label,
      status: result.status,
      data: result.data,
    });
    return result;
  };

  try {
    const resolvedCartId = cartId || userId;
    let result = await tryRequest(
      `/ecom/cart/products/${resolvedCartId}`,
      "products-cartId",
    );

    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Railway cart proxy failed:", error?.message || error);
    return res
      .status(502)
      .json({ error: "Railway cart proxy failed", detail: error?.message });
  }
});

router.get("/proxy/ecom/cart", async (req, res) => {
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

router.post("/proxy/ecom/cart/add", async (req, res) => {
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

router.put("/proxy/ecom/cart/:id", async (req, res) => {
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

router.delete("/proxy/ecom/cart/:id", async (req, res) => {
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

router.get("/proxy/phonestore/cart", async (req, res) => {
  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ error: "Missing username" });
  }

  const url = new URL("/api/cart", PHONESTORE_BASE_URL);
  try {
    const headers = buildForwardHeaders(req, {}, "");
    headers.Cookie = buildPhoneStoreCookie(username);

    const result = await forwardRequest(url.toString(), {
      method: "GET",
      headers,
    });
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("PhoneStore proxy failed:", error?.message || error);
    return res
      .status(502)
      .json({ error: "PhoneStore proxy failed", detail: error?.message });
  }
});

router.get("/proxy/railway/orders", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const url = new URL(`/ecom/orders/orders/${userId}`, RAILWAY_BASE_URL);
  try {
    const headers = buildForwardHeaders(req, {}, RAILWAY_AUTH_TOKEN);
    console.log("Railway orders", {
      url: url.toString(),
      hasAuth: Boolean(headers.Authorization),
    });
    const result = await forwardRequest(url.toString(), {
      method: "GET",
      headers,
    });
    console.log("Railway orders response", {
      status: result.status,
    });
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Railway orders proxy failed:", error?.message || error);
    return res
      .status(502)
      .json({ error: "Railway orders proxy failed", detail: error?.message });
  }
});

router.get("/proxy/ecom/orders", async (req, res) => {
  const url = new URL("/api/orders/my-orders", ECOM_BASE_URL);
  try {
    const headers = buildForwardHeaders(req, {}, ECOM_AUTH_TOKEN);
    const rawToken = headers.Authorization
      ? headers.Authorization.replace(/^Bearer\s+/i, "")
      : "";
    if (rawToken) {
      headers["x-access-token"] = rawToken;
      headers.token = rawToken;
    }
    console.log("Ecom orders", {
      url: url.toString(),
      hasAuth: Boolean(headers.Authorization),
    });
    const result = await forwardRequest(url.toString(), {
      method: "GET",
      headers,
    });
    console.log("Ecom orders response", {
      status: result.status,
      data: result.data,
    });
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("Ecommerce orders proxy failed:", error?.message || error);
    return res
      .status(502)
      .json({ error: "Ecommerce orders proxy failed", detail: error?.message });
  }
});

router.get("/proxy/phonestore/orders", async (req, res) => {
  const username = req.query.username;
  if (!username) {
    return res.status(400).json({ error: "Missing username" });
  }

  const url = new URL("/api/orders", PHONESTORE_BASE_URL);
  try {
    const headers = buildForwardHeaders(req, {}, "");
    headers.Cookie = buildPhoneStoreCookie(username);

    const result = await forwardRequest(url.toString(), {
      method: "GET",
      headers,
    });
    console.log("PhoneStore orders response", {
      status: result.status,
      data: result.data,
    });
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("PhoneStore orders proxy failed:", error?.message || error);
    return res.status(502).json({
      error: "PhoneStore orders proxy failed",
      detail: error?.message,
    });
  }
});

router.post("/proxy/phonestore/cart", async (req, res) => {
  const url = new URL("/api/cart", PHONESTORE_BASE_URL);
  try {
    const headers = buildForwardHeaders(
      req,
      {
        "Content-Type": "application/json",
      },
      "",
    );

    const result = await forwardRequest(url.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(req.body || {}),
    });
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("PhoneStore proxy failed:", error?.message || error);
    return res
      .status(502)
      .json({ error: "PhoneStore proxy failed", detail: error?.message });
  }
});

router.delete("/proxy/phonestore/cart", async (req, res) => {
  const { id, username } = req.query;
  if (!id) {
    return res.status(400).json({ error: "Missing id" });
  }

  const url = new URL("/api/cart", PHONESTORE_BASE_URL);
  url.searchParams.set("id", id);

  try {
    const headers = buildForwardHeaders(req, {}, "");
    if (username) {
      headers.Cookie = buildPhoneStoreCookie(username);
    }

    const result = await forwardRequest(url.toString(), {
      method: "DELETE",
      headers,
    });
    return res.status(result.status).json(result.data);
  } catch (error) {
    console.error("PhoneStore proxy failed:", error?.message || error);
    return res
      .status(502)
      .json({ error: "PhoneStore proxy failed", detail: error?.message });
  }
});

// ============= Analytics Endpoints =============

// Get ALL orders from Railway for analytics
router.get("/analytics/railway/orders", async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }
  const url = new URL(`/ecom/orders/orders/${userId}`, RAILWAY_BASE_URL);
  try {
    const headers = buildForwardHeaders(req, {}, RAILWAY_AUTH_TOKEN);
    console.log("Analytics - Railway orders all", {
      url: url.toString(),
      hasAuth: Boolean(headers.Authorization),
    });
    const result = await forwardRequest(url.toString(), {
      method: "GET",
      headers,
    });
    return res.status(result.status).json(result.data || []);
  } catch (error) {
    console.error("Analytics - Railway orders proxy failed:", error?.message || error);
    return res.status(502).json({ error: "Failed to fetch Railway orders", detail: error?.message });
  }
});

// Get orders from Microservice (user current)
router.get("/analytics/microservice/orders", async (req, res) => {
  const url = new URL("/api/orders/my-orders", ECOM_BASE_URL);
  try {
    const headers = buildForwardHeaders(req, {}, ECOM_AUTH_TOKEN);
    const rawToken = headers.Authorization ? headers.Authorization.replace(/^Bearer\s+/i, "") : "";
    if (rawToken) {
      headers["x-access-token"] = rawToken;
      headers.token = rawToken;
    }
    headers["Content-Type"] = "application/json";
    console.log("Analytics - Microservice orders", {
      url: url.toString(),
      hasAuth: Boolean(headers.Authorization),
    });
    const result = await forwardRequest(url.toString(), {
      method: "GET",
      headers,
    });
    return res.status(result.status).json(result.data || []);
  } catch (error) {
    console.error("Analytics - Microservice orders proxy failed:", error?.message || error);
    return res.status(502).json({ error: "Failed to fetch Microservice orders", detail: error?.message });
  }
});

// Get orders from Phone Store
router.get("/analytics/phonestore/orders", async (req, res) => {
  const username = req.query.username;
  const url = new URL("/api/orders", PHONESTORE_BASE_URL);
  try {
    const headers = buildForwardHeaders(req, {}, "");
    headers.Cookie = buildPhoneStoreCookie(username || "");

    console.log("Analytics - PhoneStore orders", {
      url: url.toString(),
      hasCookie: Boolean(headers.Cookie),
    });
    const result = await forwardRequest(url.toString(), {
      method: "GET",
      headers,
    });
    return res.status(result.status).json(result.data || []);
  } catch (error) {
    console.error("Analytics - PhoneStore orders proxy failed:", error?.message || error);
    return res.status(502).json({ error: "Failed to fetch PhoneStore orders", detail: error?.message });
  }
});

module.exports = router;
