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
import {
  formatPrice,
  getRowImage,
  pickProductTable,
} from "./utils/productHelpers";
import AppHeader from "./components/layout/AppHeader";
import DatabaseSelector from "./components/sections/DatabaseSelector";
import ProductsSection from "./components/sections/ProductsSection";
import CartDrawer from "./components/cart/CartDrawer";
import CheckoutModal from "./components/modals/CheckoutModal";
import OrdersModal from "./components/modals/OrdersModal";

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
  const [bestSellingProducts, setBestSellingProducts] = useState([]);
  const [showBestSelling, setShowBestSelling] = useState(false);
  const [loadingBestSelling, setLoadingBestSelling] = useState(false);
  const [bestSellingSourceFilter, setBestSellingSourceFilter] = useState("all");
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
      return merged;
    } finally {
      setLoadingAll(false);
    }
  }, [databases, fetchProductsForDb]);

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

  const loadBestSellingProducts = useCallback(async () => {
    try {
      setLoadingBestSelling(true);
      setShowBestSelling(true);
      setShowAll(true);

      const productsList = allProducts.length
        ? allProducts
        : await loadAllProducts();

      const { mergedOrders } = await fetchOrdersOnce();
      setOrders(mergedOrders);

      const buildItemList = (order) => {
        const raw = order?.raw ?? order ?? {};
        const candidates = [
          raw.items,
          raw.orderItems,
          raw.order_items,
          raw.orderItem,
          raw.products,
        ];

        for (const candidate of candidates) {
          if (Array.isArray(candidate)) return candidate;
        }

        if (raw.items && typeof raw.items === "object") return [raw.items];
        if (raw.orderItem && typeof raw.orderItem === "object") return [raw.orderItem];
        return [];
      };

      const resolveProductId = (item) =>
        item?.product_id ??
        item?.productId ??
        item?.product?.productId ??
        item?.product?.product_id ??
        item?.product?.id ??
        item?.id ??
        item?.itemId ??
        item?.item_id;

      const resolveQuantity = (item) => {
        const qty =
          item?.quantity ??
          item?.qty ??
          item?.count ??
          item?.amount ??
          item?.units;
        const numeric = Number(qty);
        return Number.isFinite(numeric) ? numeric : 1;
      };

      const productIndex = new Map();
      productsList.forEach((product) => {
        if (product?.id === undefined || product?.id === null) return;
        const key = `${product.sourceDb}:${product.id}`;
        if (!productIndex.has(key)) {
          productIndex.set(key, product);
        }
      });

      const salesMap = new Map();
      mergedOrders.forEach((order) => {
        const sourceDb = order.sourceDb === "ecom" ? "microservice" : order.sourceDb;
        const items = buildItemList(order);
        items.forEach((item) => {
          const productId = resolveProductId(item);
          if (productId === undefined || productId === null) return;
          const key = `${sourceDb}:${productId}`;
          const next = (salesMap.get(key) || 0) + resolveQuantity(item);
          salesMap.set(key, next);
        });
      });

      const merged = Array.from(salesMap.entries())
        .map(([key, totalSold]) => {
          const product = productIndex.get(key);
          if (!product) return null;
          return {
            ...product,
            totalSold,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          if ((b.totalSold || 0) !== (a.totalSold || 0)) {
            return (b.totalSold || 0) - (a.totalSold || 0);
          }
          return (b.price || 0) - (a.price || 0);
        });

      setBestSellingProducts(merged);
    } finally {
      setLoadingBestSelling(false);
    }
  }, [allProducts, loadAllProducts, fetchOrdersOnce]);

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

  const handleShowBestSelling = () => {
    loadBestSellingProducts();
  };

  const handleBestSellingBack = () => {
    setShowBestSelling(false);
    setShowAll(true);
  };

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
  const displayProducts = showBestSelling ? bestSellingProducts : showAll ? allProducts : products;
  const filteredProducts = displayProducts
    .filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    .filter((product) => {
      if (!showBestSelling || bestSellingSourceFilter === "all") return true;
      return product.sourceDb === bestSellingSourceFilter;
    });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onOpenOrders={openOrdersModal}
        onToggleCart={toggleCart}
        onShowBestSelling={handleShowBestSelling}
        cartCount={cartCount}
        databasesCount={databases.length}
        tablesCount={tables.length}
      />

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

        <DatabaseSelector
          loading={loading}
          visibleDatabases={visibleDatabases}
          selectedDb={selectedDb}
          onSelectDb={loadDbProducts}
          onSelectPhone={showPhoneTable}
        />

        <ProductsSection
          show={showAll || showBestSelling || Boolean(selectedDb)}
          showAll={showAll}
          showBestSelling={showBestSelling}
          selectedDb={selectedDb}
          selectedTable={selectedTable}
          filteredProducts={filteredProducts}
          loading={loading}
          loadingAll={loadingAll}
          loadingBestSelling={loadingBestSelling}
          onAddToCart={addProductToCart}
          onBestSellingBack={handleBestSellingBack}
          bestSellingSourceFilter={bestSellingSourceFilter}
          onBestSellingSourceChange={setBestSellingSourceFilter}
          formatPrice={formatPrice}
        />
      </main>
      <CartDrawer
        open={cartOpen}
        cartItems={cartItems}
        cartTotal={cartTotal}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={updateCartQuantity}
        onCheckout={handleCheckout}
        formatPrice={formatPrice}
      />

      <CheckoutModal
        open={checkoutOpen}
        ordersLoading={ordersLoading}
        ordersCount={orders.length}
        onClose={() => setCheckoutOpen(false)}
        onRefresh={fetchOrdersOnceAndUpdate}
        onStopPolling={stopOrdersPolling}
        onStartPolling={startOrdersPolling}
      />

      <OrdersModal
        open={ordersModalOpen}
        orders={orders}
        ordersLoading={ordersLoading}
        onClose={() => setOrdersModalOpen(false)}
        onRefresh={fetchOrdersOnceAndUpdate}
        formatPrice={formatPrice}
      />
    </div>
  );
}

export default App;
