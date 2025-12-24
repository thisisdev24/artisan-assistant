const Notification = require('../models/artisan_point/common/Notification');
const Admin = require('../models/artisan_point/admin/Admin');

/**
 * Send a notification to a specific user/entity
 */
const sendNotification = async ({ recipientId, recipientModel, title, message, link, type = 'info' }) => {
    try {
        await Notification.create({
            recipient: recipientId,
            recipientModel,
            title,
            message,
            link,
            type
        });
        // TODO: Integrate Socket.IO here for real-time alerts later
    } catch (err) {
        console.error('Notification creation failed:', err);
    }
};

/**
 * Send a notification to ALL admins (e.g., for force verify actions)
 * @param {string} excludeAdminId - Optional admin ID to exclude (e.g. the sender)
 */
const notifyAllAdmins = async ({ title, message, link, type = 'info', excludeAdminId = null }) => {
    try {
        const admins = await Admin.find({ deleted: false });

        const notifications = admins
            .filter(admin => !excludeAdminId || admin._id.toString() !== excludeAdminId.toString())
            .map(admin => ({
                recipient: admin._id,
                recipientModel: 'Admin',
                title,
                message,
                link,
                type
            }));

        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }
    } catch (err) {
        console.error('Notify all admins failed:', err);
    }
};

module.exports = {
    sendNotification,
    notifyAllAdmins
};
