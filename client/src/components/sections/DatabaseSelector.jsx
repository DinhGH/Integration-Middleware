const DatabaseSelector = ({
  loading,
  visibleDatabases,
  selectedDb,
  onSelectDb,
  onSelectPhone,
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-200/70">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold">Chọn nguồn dữ liệu</h2>
        <p className="text-sm text-slate-500">Chuyển nhanh giữa các database</p>
      </div>
      {loading && !visibleDatabases.length && (
        <p className="text-sm text-slate-500">Đang tải database...</p>
      )}
      <div className="flex flex-wrap gap-3">
        {visibleDatabases.map((db) => (
          <button
            key={db}
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              selectedDb === db
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
            }`}
            onClick={() => onSelectDb(db)}
          >
            📦 {db}
          </button>
        ))}
        <button
          className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
            selectedDb === "phonewebsite"
              ? "border-slate-900 bg-slate-900 text-white"
              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300"
          }`}
          onClick={onSelectPhone}
        >
          📱 phone
        </button>
      </div>
    </section>
  );
};

export default DatabaseSelector;
