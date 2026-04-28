import { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { format } from "date-fns";
import { markAllRead, clearAll, markRead } from "../../features/notifications/notificationsSlice";

const NotificationPanel = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { items, unreadCount } = useSelector((state) => state.notifications);
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        // Only close if it's not the bell button itself (to avoid double toggle)
        // The bell button is technically outside this component.
        // But since this is a child of the 'relative' div that contains the bell, 
        // usually we can just rely on event propagation or checking classes.
        // However, a simpler way is to check if the click target is the button.
        // But wait, the onClose is what closes it.
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={panelRef} className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden transition-all duration-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => dispatch(markAllRead())}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {items.length > 0 ? (
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {items.map((n) => (
              <div
                key={n.id}
                onClick={() => dispatch(markRead(n.id))}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
                  !n.read ? "bg-indigo-50/30 dark:bg-indigo-900/10" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">
                    {n.title}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
                    {format(new Date(n.timestamp), "MMM dd, hh:mm a")}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  {n.message}
                </p>
                {n.category && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 capitalize">
                      {n.category}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 capitalize">
                      {n.period} budget
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="text-gray-400">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">No notifications yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">We'll notify you when you reach your budget limits.</p>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="p-2 border-t border-gray-50 dark:border-gray-800 text-center">
          <button
            onClick={() => dispatch(clearAll())}
            className="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors font-medium py-1 px-4"
          >
            Clear All History
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
