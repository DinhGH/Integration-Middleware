import { useEffect, useMemo, useRef, useState } from "react";
import { API_URL } from "../../config/env";

const SITE_GUIDE = [
  "Ứng dụng DataMall Store hỗ trợ:",
  "- Chọn nguồn dữ liệu trong 'Databases' và xem bảng sản phẩm.",
  "- Tìm kiếm sản phẩm và thêm vào giỏ hàng.",
  "- Mở giỏ hàng để cập nhật số lượng và thanh toán.",
  "- Xem đơn hàng ở nút 'Đơn hàng'.",
  "- Chuyển sang 'Dashboard' để xem thống kê.",
].join("\n");

const createMessage = (role, content) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  role,
  content,
});

const ChatWidget = ({ currentView }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [
    createMessage(
      "assistant",
      "Chào bạn! Minh là trợ lý hỗ trợ sử dụng DataMall Store. Bạn cần mình giúp gì?",
    ),
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);

  const context = useMemo(
    () => ({
      siteGuide: SITE_GUIDE,
      currentView,
    }),
    [currentView],
  );

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMessage = createMessage("user", trimmed);
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const payload = {
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        context,
      };

      const response = await fetch(`${API_URL}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "AI request failed");
      }

      const replyText = (data?.reply || "").trim();
      setMessages((prev) => [
        ...prev,
        createMessage(
          "assistant",
          replyText || "Xin lỗi, mình chưa có câu trả lời rõ ràng.",
        ),
      ]);
    } catch {
      setError("Không thể kết nối với AI lúc này. Thử lại sau nhé.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Trợ lý DataMall</p>
              <p className="text-xs text-slate-300">Hỗ trợ nhanh cho web</p>
            </div>
            <button
              className="rounded-full bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20"
              onClick={() => setOpen(false)}
              type="button"
            >
              Đóng
            </button>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto px-4 py-4 text-sm" ref={listRef}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.role === "user"
                    ? "ml-auto max-w-[75%] rounded-2xl bg-amber-500 px-3 py-2 text-white"
                    : "mr-auto max-w-[75%] rounded-2xl bg-slate-100 px-3 py-2 text-slate-800"
                }
              >
                {msg.content}
              </div>
            ))}
            {sending && (
              <div className="mr-auto max-w-[75%] rounded-2xl bg-slate-100 px-3 py-2 text-slate-500">
                Đang trả lời...
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-3 py-3">
            {error && (
              <div className="mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">
                {error}
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                className="h-12 flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="Nhập câu hỏi..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
              />
              <button
                className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
                onClick={sendMessage}
                type="button"
                disabled={!input.trim() || sending}
              >
                Gửi
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!open && (
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-md">
            Bạn cần hỗ trợ gì không?
          </span>
        )}
        <button
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-xl text-white shadow-lg shadow-slate-400/30 transition hover:-translate-y-0.5"
          onClick={() => setOpen((prev) => !prev)}
          type="button"
          aria-label="Mở Trợ Lý "
        >
          💬
        </button>
      </div>
    </div>
  );
};

export default ChatWidget;
