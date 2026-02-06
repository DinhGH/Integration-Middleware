import { useState, useEffect, useCallback, useRef } from "react";
import {
  API_URL,
  ECOM_BASE_URL,
  RAILWAY_USER_ID,
  RAILWAY_CART_ID,
  RAILWAY_AUTH_TOKEN,
  ECOM_AUTH_TOKEN,
  PHONESTORE_USERNAME,
} from "./config/env";
import { buildCartItem, pickPhoneTable } from "./utils/tableHelpers";

const getRowImage = (row) => {
  const candidates = [
    "imageUrl",
    "image_url",
    "image",
    "thumbnail",
    "thumb",
    "img",
    "pictureUri",
    "picture_uri",
  ];
  for (const key of candidates) {
    if (row && row[key]) return row[key];
    const matchKey = Object.keys(row || {}).find(
      (col) => col.toLowerCase() === key.toLowerCase(),
    );
    if (matchKey && row[matchKey]) return row[matchKey];
  }
  return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=600&auto=format&fit=crop";
};

const formatPrice = (price) => {
  if (price === null || price === undefined) return "Liên hệ";
  const numeric = Number(price);
  if (!Number.isFinite(numeric)) return "Liên hệ";
  return `${numeric.toLocaleString("vi-VN")}₫`;
};

const pickProductTable = (list) => {
  if (!list || list.length === 0) return null;
  const candidates = ["product", "catalog", "item", "goods"];
  const matched = list.find((name) =>
    candidates.some((key) => name.toLowerCase().includes(key)),
  );
  return matched || list[0];
};

function App() {
  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartSyncError, setCartSyncError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [showAll, setShowAll] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [ordersModalOpen, setOrdersModalOpen] = useState(false);
  const ordersPollingRef = useRef(false);

  const ORDER_POLL_INTERVAL_MS = 2000;
  const ORDER_POLL_TIMEOUT_MS = 120000;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchDatabases = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/databases`);
      const data = await response.json();
      setDatabases(data.databases);
      setError(null);
    } catch (err) {
      setError("Failed to fetch databases: " + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTables = useCallback(async (dbName) => {
    try {
      const response = await fetch(`${API_URL}/${dbName}/tables`);
      const data = await response.json();
      const tableList = data.tables || [];
      setTables(tableList);
      setError(null);
      return tableList;
    } catch (err) {
      setError("Failed to fetch tables: " + err.message);
      return [];
    }
  }, []);

  // Fetch databases on mount
  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  const loadDbProducts = useCallback(
    async (dbName) => {
      try {
        setLoading(true);
        setError(null);
        setSelectedDb(dbName);
        setShowAll(false);
        setSelectedTable(null);
        setTableData(null);

        const tableList = await fetchTables(dbName);
        const tableName =
          dbName === "phonewebsite"
            ? pickPhoneTable(tableList)
            : pickProductTable(tableList);

        setSelectedTable(tableName);

        if (tableName) {
          await fetchTableData(dbName, tableName);
        } else {
          setError("Không tìm thấy bảng sản phẩm phù hợp.");
        }

        requestAnimationFrame(() => {
          const element = document.getElementById("products-section");
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      } finally {
        setLoading(false);
      }
    },
    [fetchTables],
  );

  const showPhoneTable = async () => {
    await loadDbProducts("phonewebsite");
  };

  const fetchTableData = async (dbName, tableName) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/${dbName}/${tableName}`);
      const data = await response.json();
      setTableData(data.data || []);
      setError(null);
    } catch (err) {
      setError("Failed to fetch table data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsForDb = useCallback(async (dbName) => {
    try {
      const tablesResponse = await fetch(`${API_URL}/${dbName}/tables`);
      const tablesData = await tablesResponse.json();
      const tableList = tablesData.tables || [];
      const tableName =
        dbName === "phonewebsite"
          ? pickPhoneTable(tableList)
          : pickProductTable(tableList);

      if (!tableName) return [];

      const dataResponse = await fetch(`${API_URL}/${dbName}/${tableName}`);
      const data = await dataResponse.json();
      return (data.data || []).map((row, rowIndex) => {
        const item = buildCartItem({
          row,
          rowIndex,
          selectedDb: dbName,
          selectedTable: tableName,
        });
        const image =
          item.phoneStoreProduct?.imageUrl || getRowImage(item.raw || row);
        return {
          ...item,
          image,
          sourceDb: dbName,
          sourceTable: tableName,
          rowIndex,
        };
      });
    } catch (err) {
      console.error("Failed to fetch products for", dbName, err);
      return [];
    }
  }, []);

  const loadAllProducts = useCallback(async () => {
    try {
      setLoadingAll(true);
      const results = await Promise.all(
        databases.map((dbName) => fetchProductsForDb(dbName)),
      );
      const merged = results.flat();
      setAllProducts(merged);
    } finally {
      setLoadingAll(false);
    }
  }, [databases, fetchProductsForDb]);

  useEffect(() => {
    if (!databases.length || allProducts.length || loadingAll) {
      return;
    }
    loadAllProducts();
  }, [databases, allProducts.length, loadingAll, loadAllProducts]);

  const normalizeCartItems = (items, sourceDb) => {
    const list = Array.isArray(items)
      ? items
      : Array.isArray(items?.cartItems)
        ? items.cartItems
        : [];
    return list.map((entry) => {
      const product = entry.product || entry;
      const productId =
        entry.productId ??
        product?.productId ??
        product?.id ??
        entry.id ??
        entry.cartItemId;
      const keyId = entry.cartItemId ?? productId ?? entry.id;
      const name = product.name || product.title || entry.name || "Sản phẩm";
      const price =
        product.price ||
        product.original ||
        entry.price ||
        product.unitPrice ||
        0;
      const image = getRowImage(product);
      return {
        key: `${sourceDb}-${keyId ?? "unknown"}`,
        id: productId,
        name,
        price,
        quantity: entry.quantity || 1,
        sourceDb,
        sourceTable: "cart",
        image,
      };
    });
  };

  const refreshRemoteCart = useCallback(async () => {
    try {
      const [ecomResponse, phoneResponse, railwayResponse] = await Promise.all([
        fetch(`${ECOM_BASE_URL}/api/cart`, {
          credentials: "include",
          headers: ECOM_AUTH_TOKEN
            ? { Authorization: `Bearer ${ECOM_AUTH_TOKEN}` }
            : undefined,
        }),
        fetch(
          `${API_URL}/proxy/phonestore/cart?username=${encodeURIComponent(
            PHONESTORE_USERNAME,
          )}`,
          { credentials: "include" },
        ),
        fetch(
          `${API_URL}/proxy/railway/cart?userId=${RAILWAY_USER_ID}&cartId=${RAILWAY_CART_ID}`,
          {
            credentials: "include",
            headers: RAILWAY_AUTH_TOKEN
              ? { Authorization: `Bearer ${RAILWAY_AUTH_TOKEN}` }
              : undefined,
          },
        ),
      ]);

      const [ecomData, phoneData, railwayData] = await Promise.all([
        ecomResponse.json().catch(() => []),
        phoneResponse.json().catch(() => []),
        railwayResponse.json().catch(() => []),
      ]);

      const merged = [
        ...normalizeCartItems(Array.isArray(ecomData) ? ecomData : [], "ecom"),
        ...normalizeCartItems(
          Array.isArray(phoneData) ? phoneData : [],
          "phonewebsite",
        ),
        ...normalizeCartItems(railwayData, "railway"),
      ];

      setCartItems(merged);
    } catch (err) {
      setCartSyncError(`Failed to load cart: ${err.message}`);
    }
  }, []);

  const normalizeOrders = (list, sourceDb) => {
    const ordersList = Array.isArray(list) ? list : [];
    return ordersList.map((order) => {
      const orderId =
        order.orderId ?? order.id ?? order.order_id ?? order.paymentId;
      const total =
        order.totalAmount ?? order.total ?? order.paymentAmount ?? 0;
      const status = order.status ?? order.paymentStatus ?? "UNKNOWN";
      const createdAt =
        order.orderDate ?? order.createdAt ?? order.paymentDate ?? null;
      const items = order.items || order.orderItem || order.orderItems || [];

      return {
        sourceDb,
        id: orderId,
        total,
        status,
        createdAt,
        itemsCount: Array.isArray(items) ? items.length : 0,
        raw: order,
      };
    });
  };

  const fetchOrdersOnce = useCallback(async () => {
    const requests = [
      {
        key: "ecom",
        request: fetch(`${ECOM_BASE_URL}/api/orders/my-orders`, {
          credentials: "include",
        }),
      },
      {
        key: "railway",
        request: fetch(
          `${API_URL}/proxy/railway/orders?userId=${RAILWAY_USER_ID}`,
          {
            credentials: "include",
            headers: RAILWAY_AUTH_TOKEN
              ? { Authorization: `Bearer ${RAILWAY_AUTH_TOKEN}` }
              : undefined,
          },
        ),
      },
      {
        key: "phonewebsite",
        request: fetch(
          `${API_URL}/proxy/phonestore/orders?username=${encodeURIComponent(
            PHONESTORE_USERNAME,
          )}`,
          { credentials: "include" },
        ),
      },
    ];

    const results = await Promise.allSettled(
      requests.map((entry) => entry.request),
    );

    let allOk = true;
    const merged = [];

    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      const key = requests[index].key;

      if (result.status !== "fulfilled") {
        allOk = false;
        continue;
      }

      const response = result.value;
      if (!response.ok) {
        allOk = false;
        continue;
      }

      const data = await response.json().catch(() => []);
      merged.push(...normalizeOrders(data, key));
    }

    const mergedOrders = merged.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });

    return { mergedOrders, allOk };
  }, []);

  const fetchOrdersOnceAndUpdate = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const { mergedOrders } = await fetchOrdersOnce();
      setOrders(mergedOrders);
    } catch (err) {
      setOrdersError(`Failed to load orders: ${err.message}`);
    } finally {
      setOrdersLoading(false);
    }
  }, [fetchOrdersOnce]);

  const stopOrdersPolling = () => {
    ordersPollingRef.current = false;
    setOrdersLoading(false);
  };

  const startOrdersPolling = useCallback(async () => {
    ordersPollingRef.current = true;
    setOrdersLoading(true);
    setOrdersError(null);

    const startedAt = Date.now();
    let lastOrders = [];
    let allOk = false;

    while (
      ordersPollingRef.current &&
      Date.now() - startedAt < ORDER_POLL_TIMEOUT_MS
    ) {
      const { mergedOrders, allOk: pollOk } = await fetchOrdersOnce();
      lastOrders = mergedOrders;
      setOrders(mergedOrders);
      if (pollOk) {
        allOk = true;
        break;
      }
      await sleep(ORDER_POLL_INTERVAL_MS);
    }

    if (ordersPollingRef.current && !allOk) {
      setOrders(lastOrders);
      setOrdersError(
        "Chưa lấy được đơn hàng từ tất cả web con. Vui lòng thử lại sau.",
      );
    }

    ordersPollingRef.current = false;
    setOrdersLoading(false);
  }, [fetchOrdersOnce]);

  const handleCheckout = async () => {
    setCheckoutOpen(true);
    await startOrdersPolling();
  };

  const openOrdersModal = async () => {
    setOrdersModalOpen(true);
    await fetchOrdersOnceAndUpdate();
  };

  useEffect(() => {
    refreshRemoteCart();
  }, [refreshRemoteCart]);

  const toggleCart = async () => {
    if (!cartOpen) {
      await refreshRemoteCart();
    }
    setCartOpen((open) => !open);
  };

  const fetchEcomCartMap = async () => {
    const headers = {};
    if (ECOM_AUTH_TOKEN) {
      headers.Authorization = `Bearer ${ECOM_AUTH_TOKEN}`;
    }
    const response = await fetch(`${ECOM_BASE_URL}/api/cart`, {
      credentials: "include",
      headers,
    });
    const data = await response.json();

    return (Array.isArray(data) ? data : []).reduce((acc, entry) => {
      const productId =
        entry?.product?.id ?? entry?.productId ?? entry?.product_id;
      if (productId !== undefined && productId !== null) {
        acc[String(productId)] = {
          cartItemId: entry.id,
          quantity: entry.quantity,
        };
      }
      return acc;
    }, {});
  };

  const fetchPhoneStoreCartMap = async (username) => {
    const response = await fetch(
      `${API_URL}/proxy/phonestore/cart?username=${encodeURIComponent(username)}`,
      {
        credentials: "include",
      },
    );
    const data = await response.json();

    return (Array.isArray(data) ? data : []).reduce((acc, entry) => {
      const productId =
        entry?.productId ?? entry?.product_id ?? entry?.product?.id;
      if (productId !== undefined && productId !== null) {
        acc[String(productId)] = {
          cartItemId: entry.id,
          quantity: entry.quantity ?? 0,
        };
      }
      return acc;
    }, {});
  };

  const addPhoneStoreItem = async (username, product) => {
    await fetch(`${API_URL}/proxy/phonestore/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, product }),
    });
  };

  const syncPhoneStoreQuantity = async (item, nextQuantity) => {
    const username = PHONESTORE_USERNAME.trim();
    if (!username) {
      setCartSyncError(
        "PhoneStore username is required to sync the cart items.",
      );
      return;
    }

    const product = item.phoneStoreProduct;
    if (!product?.id) {
      setCartSyncError(
        "PhoneStore product is missing id. Please map the correct id column.",
      );
      return;
    }

    const map = await fetchPhoneStoreCartMap(username);
    const entry = map[String(product.id)];
    const currentQuantity = entry?.quantity ?? 0;
    const shouldDelete =
      entry && (nextQuantity <= 0 || currentQuantity > nextQuantity);

    if (shouldDelete) {
      await fetch(
        `${API_URL}/proxy/phonestore/cart?id=${entry.cartItemId}&username=${encodeURIComponent(username)}`,
        {
          method: "DELETE",
        },
      );
    }

    let addCount = 0;
    if (nextQuantity > 0) {
      if (!entry || shouldDelete) {
        addCount = nextQuantity;
      } else if (nextQuantity > currentQuantity) {
        addCount = nextQuantity - currentQuantity;
      }
    }

    for (let i = 0; i < addCount; i += 1) {
      await addPhoneStoreItem(username, product);
    }
  };

  const buildCartRequest = (item, action, quantity) => {
    if (!item.id) {
      setCartSyncError("Product is missing id. Cannot sync cart.");
      return null;
    }

    if (item.sourceDb === "microservice") {
      const headers = {
        "Content-Type": "application/json",
      };
      if (ECOM_AUTH_TOKEN) {
        headers.Authorization = `Bearer ${ECOM_AUTH_TOKEN}`;
      }
      if (action === "add") {
        return {
          url: `${ECOM_BASE_URL}/api/cart/add`,
          options: {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify({ productId: item.id }),
          },
        };
      }

      return {
        resolve: async () => {
          const map = await fetchEcomCartMap();
          const entry = map[String(item.id)];
          if (!entry) {
            return null;
          }

          if (action === "remove" || quantity <= 0) {
            return {
              url: `${ECOM_BASE_URL}/api/cart/${entry.cartItemId}`,
              options: {
                method: "DELETE",
                headers,
                credentials: "include",
              },
            };
          }

          return {
            url: `${ECOM_BASE_URL}/api/cart/${entry.cartItemId}`,
            options: {
              method: "PUT",
              headers,
              credentials: "include",
              body: JSON.stringify({ quantity }),
            },
          };
        },
      };
    }

    if (item.sourceDb === "railway") {
      const headers = {};
      if (RAILWAY_AUTH_TOKEN) {
        headers.Authorization = `Bearer ${RAILWAY_AUTH_TOKEN}`;
      }
      if (action === "add") {
        return {
          url: `${API_URL}/proxy/railway/add-product?userId=${RAILWAY_USER_ID}&productId=${item.id}&cartId=${RAILWAY_CART_ID}`,
          options: {
            method: "POST",
            credentials: "include",
            headers,
          },
        };
      }

      if (action === "increase") {
        return {
          url: `${API_URL}/proxy/railway/increase-productQty/${RAILWAY_CART_ID}/${item.id}`,
          options: {
            method: "PUT",
            credentials: "include",
            headers,
          },
        };
      }

      if (action === "decrease") {
        return {
          url: `${API_URL}/proxy/railway/decrease-productQty/${RAILWAY_CART_ID}/${item.id}`,
          options: {
            method: "PUT",
            credentials: "include",
            headers,
          },
        };
      }

      if (action === "remove" || quantity <= 0) {
        return {
          url: `${API_URL}/proxy/railway/remove-product/${RAILWAY_CART_ID}/${item.id}`,
          options: {
            method: "DELETE",
            credentials: "include",
            headers,
          },
        };
      }
    }

    return null;
  };

  const syncCartItem = async (item, action, quantity) => {
    if (item.sourceDb === "phonewebsite") {
      try {
        setCartSyncError(null);
        await syncPhoneStoreQuantity(item, quantity);
      } catch (err) {
        setCartSyncError(`Failed to sync cart to phonewebsite: ${err.message}`);
      }
      return;
    }

    const request = buildCartRequest(item, action, quantity);
    if (!request) {
      return;
    }

    try {
      setCartSyncError(null);
      const resolved = request.resolve ? await request.resolve() : request;
      if (!resolved) {
        return;
      }
      await fetch(resolved.url, resolved.options);
    } catch (err) {
      setCartSyncError(
        `Failed to sync cart to ${item.sourceDb}: ${err.message}`,
      );
    }
  };

  const addProductToCart = async (product) => {
    const item = buildCartItem({
      row: product.raw,
      rowIndex: product.rowIndex ?? 0,
      selectedDb: product.sourceDb,
      selectedTable: product.sourceTable,
    });
    if (!Number.isFinite(Number(item.id))) {
      setCartSyncError(
        "ProductId must be numeric for cart APIs. Please map the correct id column.",
      );
      return;
    }
    const existing = cartItems.find((entry) => entry.key === item.key);
    const nextQuantity = existing ? existing.quantity + 1 : 1;

    setCartItems((prev) => {
      const entry = prev.find((stored) => stored.key === item.key);
      if (entry) {
        return prev.map((stored) =>
          stored.key === item.key
            ? { ...stored, quantity: stored.quantity + 1 }
            : stored,
        );
      }
      return [...prev, item];
    });

    await syncCartItem(item, "add", nextQuantity);
  };

  const updateCartQuantity = async (key, delta) => {
    let updatedItem = null;
    let nextQuantity = 0;

    setCartItems((prev) => {
      return prev
        .map((item) => {
          if (item.key !== key) {
            return item;
          }
          const quantity = Math.max(item.quantity + delta, 0);
          updatedItem = { ...item, quantity };
          nextQuantity = quantity;
          return updatedItem;
        })
        .filter((item) => item.quantity > 0);
    });

    if (updatedItem) {
      if (nextQuantity === 0) {
        await syncCartItem(updatedItem, "remove", nextQuantity);
      } else {
        const action = delta > 0 ? "increase" : "decrease";
        await syncCartItem(updatedItem, action, nextQuantity);
      }
    }
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + (item.price ?? 0) * item.quantity,
    0,
  );

  const visibleDatabases = databases.filter(
    (db) => db === "railway" || db === "microservice",
  );
  const products = (tableData || []).map((row, rowIndex) => {
    const item = buildCartItem({
      row,
      rowIndex,
      selectedDb,
      selectedTable,
    });
    const image =
      item.phoneStoreProduct?.imageUrl || getRowImage(item.raw || row);
    return {
      ...item,
      image,
      sourceDb: selectedDb,
      sourceTable: selectedTable,
      rowIndex,
    };
  });
  const displayProducts = showAll ? allProducts : products;
  const filteredProducts = displayProducts.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-linear-to-r from-slate-950 via-slate-900 to-slate-950 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛍️</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                DataMall Store
              </h1>
              <p className="text-sm text-slate-300">
                Hệ thống dữ liệu sản phẩm hợp nhất
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
            <input
              className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/70 sm:w-72"
              type="text"
              placeholder="Tìm sản phẩm..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              onClick={openOrdersModal}
            >
              🧾 Đơn hàng
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600"
              onClick={toggleCart}
            >
              🛒 Giỏ hàng
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {cartCount}
              </span>
            </button>
          </div>
        </div>
        <div className="mx-auto grid w-full max-w-6xl gap-6 px-6 pb-10">
          <div>
            <h2 className="text-3xl font-semibold leading-tight">
              Trung tâm quản lý cửa hàng thương mại điện tử
            </h2>
            <p className="mt-3 text-sm text-slate-200">
              Chọn nguồn dữ liệu, xem bảng sản phẩm và thêm hàng vào giỏ chỉ với
              một cú nhấp.
            </p>
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-slate-200">
              <div>
                <div className="text-2xl font-bold text-white">
                  {databases.length}
                </div>
                <div>Databases</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {tables.length}
                </div>
                <div>Tables</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{cartCount}</div>
                <div>Giỏ hàng</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-8 w-full max-w-6xl space-y-6 px-6 pb-16">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            ⚠️ {error}
          </div>
        )}
        {cartSyncError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            ⚠️ {cartSyncError}
          </div>
        )}
        {ordersError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            ⚠️ {ordersError}
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="mb-4 space-y-1">
            <h2 className="text-lg font-semibold">Chọn nguồn dữ liệu</h2>
            <p className="text-sm text-slate-500">
              Chuyển nhanh giữa các database
            </p>
          </div>
          {loading && !databases.length && (
            <p className="text-sm text-slate-500">Đang tải database...</p>
          )}
          <div className="flex flex-wrap gap-3">
            {visibleDatabases.map((db) => (
              <button
                key={db}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selectedDb === db
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
                }`}
                onClick={() => loadDbProducts(db)}
              >
                📦 {db}
              </button>
            ))}
            <button
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                selectedDb === "phonewebsite"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
              }`}
              onClick={showPhoneTable}
            >
              📱 phone
            </button>
          </div>
        </section>

        {(showAll || selectedDb) && (
          <section
            id="products-section"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">
                  {showAll
                    ? "Tất cả sản phẩm"
                    : `Sản phẩm từ ${selectedDb}${
                        selectedTable ? `.${selectedTable}` : ""
                      }`}
                </h2>
                <p className="text-sm text-slate-500">
                  {filteredProducts.length} sản phẩm khả dụng
                </p>
              </div>
              {(loadingAll || loading) && (
                <span className="text-sm text-slate-500">Đang tải...</span>
              )}
            </div>
            {filteredProducts.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((product, index) => (
                  <div
                    key={product.key ?? index}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-xl"
                  >
                    <img
                      className="h-44 w-full object-cover"
                      src={product.image}
                      alt={product.name}
                    />
                    <div className="space-y-3 p-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{product.sourceDb}</span>
                        <span>•</span>
                        <span>{product.sourceTable}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {product.name}
                      </h3>
                      <div className="text-lg font-bold text-amber-600">
                        {formatPrice(product.price)}
                      </div>
                      <button
                        className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                        onClick={() => addProductToCart(product)}
                      >
                        Thêm vào giỏ
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              !loadingAll && (
                <p className="text-sm text-slate-500">
                  Không có sản phẩm để hiển thị.
                </p>
              )
            )}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Đơn hàng tổng hợp</h2>
              <p className="text-sm text-slate-500">
                {orders.length} đơn hàng từ các nguồn
              </p>
            </div>
            <div className="flex items-center gap-3">
              {ordersLoading && (
                <span className="text-sm text-slate-500">Đang tải...</span>
              )}
              <button
                className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                onClick={fetchOrdersOnceAndUpdate}
              >
                Xem hóa đơn
              </button>
            </div>
          </div>
          {orders.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có đơn hàng.</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={`${order.sourceDb}-${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      #{order.id} • {order.sourceDb}
                    </div>
                    <div className="text-xs text-slate-500">
                      {order.status} • {order.itemsCount} items
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-amber-600">
                    {formatPrice(order.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col gap-6 bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Giỏ hàng của bạn</h2>
                <p className="text-xs text-slate-500">
                  {cartItems.length} sản phẩm
                </p>
              </div>
              <button
                className="h-9 w-9 rounded-full bg-slate-100 text-lg"
                onClick={() => setCartOpen(false)}
              >
                ✕
              </button>
            </div>

            {cartItems.length === 0 ? (
              <p className="text-sm text-slate-500">Giỏ hàng đang trống.</p>
            ) : (
              <div className="flex-1 space-y-4 overflow-y-auto">
                {cartItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        className="h-14 w-14 rounded-lg object-cover"
                        src={item.image}
                        alt={item.name}
                      />
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {item.name}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span>{item.sourceDb}</span>
                          <span>•</span>
                          <span>{item.sourceTable}</span>
                        </div>
                        <div className="mt-2 text-sm font-semibold text-amber-600">
                          {formatPrice(item.price)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          className="h-8 w-8 rounded-full bg-slate-900 text-sm font-semibold text-white"
                          onClick={() => updateCartQuantity(item.key, -1)}
                        >
                          −
                        </button>
                        <span className="text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          className="h-8 w-8 rounded-full bg-slate-900 text-sm font-semibold text-white"
                          onClick={() => updateCartQuantity(item.key, 1)}
                        >
                          +
                        </button>
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatPrice((item.price ?? 0) * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-slate-200 pt-4">
              <div className="mb-3 flex items-center justify-between text-base font-semibold text-slate-900">
                <span>Tổng cộng</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <button
                className="w-full rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600"
                onClick={handleCheckout}
              >
                Thanh toán
              </button>
            </div>
          </div>
        </div>
      )}

      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Đang xử lý thanh toán
              </h3>
              <button
                className="h-8 w-8 rounded-full bg-slate-100 text-lg"
                onClick={() => setCheckoutOpen(false)}
              >
                ✕
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Đang chờ các web con hoàn tất thanh toán và tạo đơn hàng...
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              {ordersLoading ? "Đang tổng hợp đơn hàng" : "Hoàn tất"}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                onClick={fetchOrdersOnceAndUpdate}
              >
                Xem hóa đơn
              </button>
              {ordersLoading ? (
                <button
                  className="rounded-full border border-rose-200 px-4 py-1.5 text-sm font-semibold text-rose-600 transition hover:border-rose-300"
                  onClick={stopOrdersPolling}
                >
                  Dừng chờ
                </button>
              ) : (
                <button
                  className="rounded-full border border-amber-200 px-4 py-1.5 text-sm font-semibold text-amber-600 transition hover:border-amber-300"
                  onClick={startOrdersPolling}
                >
                  Chờ thêm
                </button>
              )}
            </div>
            {!ordersLoading && orders.length > 0 && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Đã tổng hợp {orders.length} đơn hàng. Bạn có thể xem ở mục "Đơn
                hàng tổng hợp".
              </div>
            )}
          </div>
        </div>
      )}

      {ordersModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOrdersModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                Đơn hàng tổng hợp
              </h3>
              <button
                className="h-8 w-8 rounded-full bg-slate-100 text-lg"
                onClick={() => setOrdersModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                {orders.length} đơn hàng từ các nguồn
              </p>
              <button
                className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
                onClick={fetchOrdersOnceAndUpdate}
              >
                Xem hóa đơn
              </button>
            </div>

            {ordersLoading && (
              <p className="mt-3 text-sm text-slate-500">Đang tải...</p>
            )}

            {orders.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">Chưa có đơn hàng.</p>
            ) : (
              <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                {orders.map((order) => (
                  <div
                    key={`${order.sourceDb}-${order.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        #{order.id} • {order.sourceDb}
                      </div>
                      <div className="text-xs text-slate-500">
                        {order.status} • {order.itemsCount} items
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-amber-600">
                      {formatPrice(order.total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
