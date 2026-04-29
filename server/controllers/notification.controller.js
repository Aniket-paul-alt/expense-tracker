const Notification = require("../models/notification.model");

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Clear all notification history
// @route   DELETE /api/notifications
// @access  Private
exports.clearNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.status(200).json({ success: true, message: "Notification history cleared" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
