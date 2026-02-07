import { PHONESTORE_BASE_URL } from "../config/env";

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

const findNumericId = (row, selectedDb) => {
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

const normalizePhoneStoreImageUrl = (imageUrl) => {
  if (!imageUrl) return "";
  const raw = String(imageUrl).trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const base = PHONESTORE_BASE_URL.replace(/\/$/, "");
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${base}${path}`;
};

const buildPhoneStoreProduct = (row, rowIndex, selectedDb) => {
  const id = findNumericId(row, selectedDb);
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
    imageUrl: normalizePhoneStoreImageUrl(imageUrl),
  };
};

const buildCartItem = ({ row, rowIndex, selectedDb, selectedTable }) => {
  const numericId = findNumericId(row, selectedDb);
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
      ? buildPhoneStoreProduct(row, rowIndex, selectedDb)
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

const pickPhoneTable = (list) => {
  if (!list || list.length === 0) return null;
  const preferred = list.find((name) => name.toLowerCase().includes("phone"));
  if (preferred) return preferred;

  const productTable = list.find((name) =>
    name.toLowerCase().includes("product"),
  );
  return productTable || list[0];
};

export {
  getValueCaseInsensitive,
  normalizePrice,
  findNumericId,
  buildPhoneStoreProduct,
  buildCartItem,
  pickPhoneTable,
};
