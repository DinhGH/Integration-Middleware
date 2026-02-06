const CheckoutModal = ({
  open,
  ordersLoading,
  ordersCount,
  onClose,
  onRefresh,
  onStopPolling,
  onStartPolling,
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            Đang xử lý thanh toán
          </h3>
          <button
            className="h-8 w-8 rounded-full bg-slate-100 text-lg"
            onClick={onClose}
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
            onClick={onRefresh}
          >
            Xem hóa đơn
          </button>
          {ordersLoading ? (
            <button
              className="rounded-full border border-rose-200 px-4 py-1.5 text-sm font-semibold text-rose-600 transition hover:border-rose-300"
              onClick={onStopPolling}
            >
              Dừng chờ
            </button>
          ) : (
            <button
              className="rounded-full border border-amber-200 px-4 py-1.5 text-sm font-semibold text-amber-600 transition hover:border-amber-300"
              onClick={onStartPolling}
            >
              Chờ thêm
            </button>
          )}
        </div>
        {!ordersLoading && ordersCount > 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Đã tổng hợp {ordersCount} đơn hàng. Bạn có thể xem ở mục "Đơn hàng
            tổng hợp".
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
