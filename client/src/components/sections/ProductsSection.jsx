const ProductsSection = ({
  show,
  showAll,
  selectedDb,
  selectedTable,
  filteredProducts,
  loading,
  loadingAll,
  onAddToCart,
  formatPrice,
}) => {
  if (!show) {
    return null;
  }

  return (
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
                  onClick={() => onAddToCart(product)}
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
  );
};

export default ProductsSection;
