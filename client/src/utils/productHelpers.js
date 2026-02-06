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

export { getRowImage, formatPrice, pickProductTable };
