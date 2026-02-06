const OrdersSection = ({ orders, ordersLoading, onRefresh, formatPrice }) => {
  return (
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
            onClick={onRefresh}
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
  );
};

export default OrdersSection;
