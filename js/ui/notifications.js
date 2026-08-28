/**
 * ui/notifications.js — Тосты / уведомления
 */

function showNotification(message, type = 'info') {
    // Удаляем существующие уведомления
    document.querySelectorAll('.notification').forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}


window.showNotification = showNotification;
