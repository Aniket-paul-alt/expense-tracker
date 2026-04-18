import { useEffect } from "react";

const Modal = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg", center = false }) => {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[60] flex justify-center ${center ? "items-center p-4" : "items-end sm:items-center p-0 sm:p-4"}`}>

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`relative w-full ${maxWidth} bg-white dark:bg-gray-900 rounded-t-2xl
        sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto no-scrollbar transition-colors`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4
          border-b border-gray-100 dark:border-gray-800/80 sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-t-2xl z-10">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg
              text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition"
          >
            <svg width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;