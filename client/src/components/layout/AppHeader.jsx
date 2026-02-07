const AppHeader = ({
  searchTerm,
  onSearchChange,
  onOpenOrders,
  onToggleCart,
  cartCount,
  databasesCount,
  tablesCount,
  currentView,
  onChangeView,
  showSummary = true,
  showSearch = true,
}) => {
  return (
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
          <div className="flex gap-2">
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                currentView === "products"
                  ? "bg-amber-500 text-white"
                  : "border border-white/30 bg-white/10 text-white hover:bg-white/20"
              }`}
              onClick={() => onChangeView?.("products")}
            >
              🛍️ Sản phẩm
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                currentView === "dashboard"
                  ? "bg-amber-500 text-white"
                  : "border border-white/30 bg-white/10 text-white hover:bg-white/20"
              }`}
              onClick={() => onChangeView?.("dashboard")}
            >
              📊 Dashboard
            </button>
          </div>
          {showSearch && (
            <input
              className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/70 sm:w-72"
              type="text"
              placeholder="Tìm sản phẩm..."
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          )}
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            onClick={onOpenOrders}
          >
            🧾 Đơn hàng
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600"
            onClick={onToggleCart}
          >
            🛒 Giỏ hàng
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {cartCount}
            </span>
          </button>
        </div>
      </div>
      {showSummary && (
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
                  {databasesCount}
                </div>
                <div>Databases</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">
                  {tablesCount}
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
      )}
    </header>
  );
};

export default AppHeader;
