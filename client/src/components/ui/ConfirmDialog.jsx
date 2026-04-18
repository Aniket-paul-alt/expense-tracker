import Modal from "./Modal";

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Delete",
  isLoading = false,
  danger = true,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm" center>
    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
    <div className="flex gap-3">
      <button
        onClick={onClose}
        className="flex-1 py-2 px-4 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300
          text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={isLoading}
        className={`flex-1 py-2 px-4 text-white text-sm font-medium
          rounded-lg transition disabled:opacity-60
          ${danger
            ? "bg-red-500 hover:bg-red-600"
            : "bg-indigo-600 hover:bg-indigo-700"
          }`}
      >
        {isLoading ? "..." : confirmLabel}
      </button>
    </div>
  </Modal>
);

export default ConfirmDialog;