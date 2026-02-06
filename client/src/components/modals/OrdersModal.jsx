const OrdersModal = ({
  open,
  orders,
  ordersLoading,
  onClose,
  onRefresh,
  formatPrice,
}) => {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
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
            onClick={onClose}
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
            onClick={onRefresh}
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
  );
};

export default OrdersModal;
