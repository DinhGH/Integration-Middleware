import { useState, useEffect, useCallback } from "react";
import "./App.css";

function App() {
  const [databases, setDatabases] = useState([]);
  const [selectedDb, setSelectedDb] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartSyncError, setCartSyncError] = useState(null);
  const [phoneStoreUsername, setPhoneStoreUsername] = useState(
    import.meta.env.VITE_PHONESTORE_USERNAME || "",
  );

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const RAILWAY_BASE_URL = "https://test-9she.onrender.com";
  const ECOM_BASE_URL = "https://ecommerce-integration.onrender.com";
  const RAILWAY_USER_ID = import.meta.env.VITE_RAILWAY_USER_ID || "1";
  const RAILWAY_CART_ID = import.meta.env.VITE_RAILWAY_CART_ID || "1";
  const RAILWAY_AUTH_TOKEN = import.meta.env.VITE_RAILWAY_AUTH_TOKEN || "";
  const ECOM_AUTH_TOKEN = import.meta.env.VITE_ECOM_AUTH_TOKEN || "";

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
  }, [API_URL]);

  const fetchTables = useCallback(
    async (dbName) => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/${dbName}/tables`);
        const data = await response.json();
        setTables(data.tables || []);
        setError(null);
      } catch (err) {
        setError("Failed to fetch tables: " + err.message);
      } finally {
        setLoading(false);
      }
    },
    [API_URL],
  );

  // Fetch databases on mount
  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  // Fetch tables when database is selected
  useEffect(() => {
    if (selectedDb) {
      fetchTables(selectedDb);
      setSelectedTable(null);
      setTableData(null);
      setColumns([]);
    }
  }, [selectedDb, fetchTables]);

  const pickPhoneTable = (list) => {
    if (!list || list.length === 0) return null;
    const preferred = list.find((name) => name.toLowerCase().includes("phone"));
    if (preferred) return preferred;

    const productTable = list.find((name) =>
      name.toLowerCase().includes("product"),
    );
    return productTable || list[0];
  };

  const showPhoneTable = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/phonewebsite/tables`);
      const data = await response.json();
      const phoneTables = data.tables || [];
      const tableName = pickPhoneTable(phoneTables);

      setSelectedDb("phonewebsite");
      setTables(phoneTables);
      setSelectedTable(tableName);
      setTableData(null);
      setColumns([]);

      if (tableName) {
        await fetchTableData("phonewebsite", tableName);
      }
      setError(null);
    } catch (err) {
      setError("Failed to fetch phone table: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableData = async (dbName, tableName) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/${dbName}/${tableName}`);
      const data = await response.json();
      setTableData(data.data || []);
      setColumns(data.columns || []);
      setError(null);
    } catch (err) {
      setError("Failed to fetch table data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTableSelect = (tableName) => {
    setSelectedTable(tableName);
    if (selectedDb) {
      fetchTableData(selectedDb, tableName);
    }
  };

  const getValueCaseInsensitive = (row, aliases) => {
    const keyMap = Object.keys(row || {}).reduce((acc, key) => {
      acc[key.toLowerCase()] = key;
      return acc;
    }, {});

    for (const alias of aliases) {
      const foundKey = keyMap[alias.toLowerCase()];
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
        return row[foundKey];
      }
    }

    return null;
  };

  const normalizePrice = (value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const findNumericId = (row) => {
    const candidates =
      selectedDb === "railway"
        ? ["product_id", "productid", "id"]
        : ["id", "product_id", "productid", "catalogitemid", "itemid"];
    for (const key of candidates) {
      const value = getValueCaseInsensitive(row, [key]);
      if (value !== null && value !== undefined && value !== "") {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          return numeric;
        }
      }
    }
    return null;
  };

  const buildCartItem = (row, rowIndex) => {
    const numericId = findNumericId(row);
    const name = getValueCaseInsensitive(row, [
      "name",
      "title",
      "productname",
      "itemname",
    ]);
    const basePrice = normalizePrice(
      getValueCaseInsensitive(row, ["price", "unitprice", "cost", "amount"]),
    );
    const phoneStoreProduct =
      selectedDb === "phonewebsite"
        ? buildPhoneStoreProduct(row, rowIndex)
        : null;
    const phoneStorePrice =
      phoneStoreProduct &&
      Number.isFinite(phoneStoreProduct.original) &&
      phoneStoreProduct.original !== null
        ? Math.round(
            (1 - (phoneStoreProduct.discount || 0) / 100) *
              phoneStoreProduct.original,
          )
        : null;

    const displayName = name ?? `Item ${rowIndex + 1}`;
    const safeId = numericId ?? `${selectedDb}-${selectedTable}-${rowIndex}`;

    return {
      key: `${selectedDb}-${selectedTable}-${safeId}`,
      id: safeId,
      name: displayName,
      price: phoneStorePrice ?? basePrice,
      quantity: 1,
      sourceDb: selectedDb,
      sourceTable: selectedTable,
      phoneStoreProduct,
      raw: row,
    };
  };

  const buildPhoneStoreProduct = (row, rowIndex) => {
    const id = findNumericId(row);
    if (!Number.isFinite(Number(id))) {
      return null;
    }

    const name = getValueCaseInsensitive(row, [
      "name",
      "productname",
      "product_name",
      "title",
      "itemname",
    ]);
    const discount = normalizePrice(
      getValueCaseInsensitive(row, [
        "discount",
        "sale",
        "discountpercent",
        "percentdiscount",
        "percent_off",
      ]),
    );
    const original = normalizePrice(
      getValueCaseInsensitive(row, [
        "original",
        "originalprice",
        "original_price",
        "baseprice",
        "listprice",
        "price",
      ]),
    );
    const imageUrl = getValueCaseInsensitive(row, [
      "imageurl",
      "image_url",
      "image",
      "thumbnail",
      "thumb",
      "img",
    ]);

    return {
      id: Number(id),
      name: name ?? `Item ${rowIndex + 1}`,
      discount: discount ?? 0,
      original: original ?? 0,
      imageUrl: imageUrl ?? "",
    };
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
    const username = phoneStoreUsername.trim();
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

  const addToCart = async (row, rowIndex) => {
    const item = buildCartItem(row, rowIndex);
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
  const visibleTables = tables.slice(0, 2);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>Multi Database Viewer</h1>
            <p>View data from multiple MySQL databases</p>
          </div>
          <div className="header-actions">
            <div className="phonestore-config">
              <label htmlFor="phonestore-username">PhoneStore user</label>
              <input
                id="phonestore-username"
                type="text"
                placeholder="username"
                value={phoneStoreUsername}
                onChange={(event) => setPhoneStoreUsername(event.target.value)}
              />
              <span className="phonestore-hint">
                Required for PhoneStore cart sync.
              </span>
            </div>
            <button
              className="cart-button"
              onClick={() => setCartOpen((open) => !open)}
            >
              🛒 Cart <span className="cart-count">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {error && <div className="error-message">⚠️ {error}</div>}
        {cartSyncError && (
          <div className="error-message">⚠️ {cartSyncError}</div>
        )}

        <div className="container">
          {/* Database Selection */}
          <section className="section">
            <h2>Select Database</h2>
            {loading && !databases.length && <p>Loading databases...</p>}
            <div className="button-group">
              {visibleDatabases.map((db) => (
                <button
                  key={db}
                  className={`db-button ${selectedDb === db ? "active" : ""}`}
                  onClick={() => setSelectedDb(db)}
                >
                  📦 {db}
                </button>
              ))}
            </div>
          </section>

          {selectedDb && (
            <>
              {/* Table Selection */}
              <section className="section">
                <h2>Tables in {selectedDb}</h2>
                {loading && !visibleTables.length && <p>Loading tables...</p>}
                {visibleTables.length === 0 && !loading && (
                  <p>No tables found</p>
                )}
                <div className="table-list">
                  {visibleTables.map((table) => (
                    <button
                      key={table}
                      className={`table-button ${selectedTable === table ? "active" : ""}`}
                      onClick={() => handleTableSelect(table)}
                    >
                      📋 {table}
                    </button>
                  ))}
                  <button className="table-button" onClick={showPhoneTable}>
                    📱 phone table
                  </button>
                </div>
              </section>

              {/* Table Data Display */}
              {selectedTable && (
                <section className="section">
                  <h2>
                    Data from {selectedDb}.{selectedTable}
                  </h2>
                  {loading && <p>Loading data...</p>}

                  {tableData && tableData.length > 0 && (
                    <div className="data-info">
                      <p>
                        <strong>Total rows:</strong> {tableData.length}
                      </p>
                    </div>
                  )}

                  {tableData && tableData.length > 0 ? (
                    <div className="table-wrapper">
                      <table className="data-table">
                        <thead>
                          <tr>
                            {columns.map((col) => (
                              <th key={col.COLUMN_NAME}>
                                <div>
                                  <div className="col-name">
                                    {col.COLUMN_NAME}
                                  </div>
                                  <div className="col-type">
                                    {col.COLUMN_TYPE}
                                  </div>
                                  {col.COLUMN_KEY === "PRI" && (
                                    <span className="primary-key">PK</span>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th>
                              <div>
                                <div className="col-name">Actions</div>
                                <div className="col-type">Cart</div>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                              {columns.map((col) => (
                                <td key={col.COLUMN_NAME}>
                                  {row[col.COLUMN_NAME] !== null &&
                                  row[col.COLUMN_NAME] !== undefined ? (
                                    String(row[col.COLUMN_NAME]).substring(
                                      0,
                                      100,
                                    )
                                  ) : (
                                    <em className="null-value">NULL</em>
                                  )}
                                </td>
                              ))}
                              <td>
                                <button
                                  className="add-cart-button"
                                  onClick={() => addToCart(row, rowIndex)}
                                >
                                  Add to cart
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    tableData && !loading && <p>No data found in this table</p>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {cartOpen && (
        <div className="cart-drawer">
          <div className="cart-header">
            <h2>Shopping Cart</h2>
            <button className="cart-close" onClick={() => setCartOpen(false)}>
              ✕
            </button>
          </div>

          {cartItems.length === 0 ? (
            <p className="cart-empty">Your cart is empty.</p>
          ) : (
            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item.key} className="cart-item">
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-meta">
                      <span>{item.sourceDb}</span>
                      <span>•</span>
                      <span>{item.sourceTable}</span>
                    </div>
                    <div className="cart-item-price">
                      {item.price !== null ? `$${item.price}` : "Price N/A"}
                    </div>
                  </div>
                  <div className="cart-qty">
                    <button
                      className="qty-button"
                      onClick={() => updateCartQuantity(item.key, -1)}
                    >
                      −
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      className="qty-button"
                      onClick={() => updateCartQuantity(item.key, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="cart-footer">
            <div className="cart-total">
              <span>Total</span>
              <strong>${cartTotal.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
