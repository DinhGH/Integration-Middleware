const CartDrawer = ({
  open,
  cartItems,
  cartTotal,
  onClose,
  onUpdateQuantity,
  onCheckout,
  formatPrice,
}) => {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col gap-6 bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Giỏ hàng của bạn</h2>
            <p className="text-xs text-slate-500">
              {cartItems.length} sản phẩm
            </p>
          </div>
          <button
            className="h-9 w-9 rounded-full bg-slate-100 text-lg"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {cartItems.length === 0 ? (
          <p className="text-sm text-slate-500">Giỏ hàng đang trống.</p>
        ) : (
          <div className="flex-1 space-y-4 overflow-y-auto">
            {cartItems.map((item) => (
              <div
                key={item.key}
                className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3"
              >
                <div className="flex items-start gap-3">
                  <img
                    className="h-14 w-14 rounded-lg object-cover"
                    src={item.image}
                    alt={item.name}
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {item.name}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <span>{item.sourceDb}</span>
                      <span>•</span>
                      <span>{item.sourceTable}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold text-amber-600">
                      {formatPrice(item.price)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      className="h-8 w-8 rounded-full bg-slate-900 text-sm font-semibold text-white"
                      onClick={() => onUpdateQuantity(item.key, -1)}
                    >
                      −
                    </button>
                    <span className="text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      className="h-8 w-8 rounded-full bg-slate-900 text-sm font-semibold text-white"
                      onClick={() => onUpdateQuantity(item.key, 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatPrice((item.price ?? 0) * item.quantity)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-200 pt-4">
          <div className="mb-3 flex items-center justify-between text-base font-semibold text-slate-900">
            <span>Tổng cộng</span>
            <span>{formatPrice(cartTotal)}</span>
          </div>
          <button
            className="w-full rounded-xl bg-amber-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 transition hover:bg-amber-600"
            onClick={onCheckout}
          >
            Thanh toán
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
