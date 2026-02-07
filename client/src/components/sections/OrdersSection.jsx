const OrdersSection = ({ orders, ordersLoading, onRefresh, formatPrice }) => {
  const getStatusStyles = (status = "") => {
    const normalized = status.toLowerCase();
    if (normalized.includes("paid") || normalized.includes("đã thanh") || normalized.includes("complete")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (normalized.includes("pending") || normalized.includes("chờ") || normalized.includes("processing")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (normalized.includes("cancel") || normalized.includes("hủy") || normalized.includes("fail")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Đơn hàng tổng hợp</h2>
          <p className="text-sm text-slate-500">{orders.length} đơn hàng từ các nguồn</p>
        </div>
        <div className="flex items-center gap-3">
          {ordersLoading && <span className="text-sm text-slate-500">Đang tải...</span>}
          <button
            className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            onClick={onRefresh}
          >
            Xem hóa đơn
          </button>
        </div>
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có đơn hàng.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={`${order.sourceDb}-${order.id}`}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-4 transition hover:border-slate-300 hover:bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900">
                      #{order.id}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusStyles(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {order.sourceDb}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      {order.itemsCount} items
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      {order.customerName || "Khách hàng"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs uppercase tracking-wide text-slate-500">Tổng tiền</div>
                    <div className="text-base font-semibold text-amber-600">
                      {formatPrice(order.total)}
                    </div>
                  </div>
                  <button className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50">
                    Chi tiết
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default OrdersSection;
