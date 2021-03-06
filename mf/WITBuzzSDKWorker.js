self.addEventListener('install', onServiceWorkerInstalled);
self.addEventListener('activate', onServiceWorkerActivated);
self.addEventListener('push', event => event.waitUntil(onPushReceived(event)));
self.addEventListener('notificationclick', event => event.waitUntil(onNotificationClicked(event)));

function onServiceWorkerInstalled(event) {
    console.info("Installing service worker...");
    event.waitUntil(self.skipWaiting());
}

function onServiceWorkerActivated(event) {
    console.info('WITBuzz Service Worker activated');
    event.waitUntil(self.clients.claim());
}

async function onPushReceived(event) {
    if (event && event.data) {
        const msg = event.data.json();
        console.info('onPushReceived', msg);
        self.registration.showNotification(msg.title, msg.options);
    }
}

async function onNotificationClicked(event) {
    event.notification.close();
    const notificationData = event.notification;
    console.info('WITBuzz onNotificationClicked', notificationData);
    const urlToOpen = parseUrl(notificationData.data);
    if (urlToOpen) {
        let openClient = null;
        const allClients = await self.clients.matchAll({includeUncontrolled: true, type: 'window'});
        for (const client of allClients) {
            if (client.url === urlToOpen) {
                openClient = client;
                break;
            }
        }
        if (openClient instanceof WindowClient) {
            try {
                await openClient.focus();
            } catch (e) {
                console.error("Failed to focus:", openClient, e);
            }
            try {
                if (openClient.navigate) {
                    await openClient.navigate(urlToOpen);
                }
            } catch (e) {
                console.error("Failed to navigate:", openClient, urlToOpen, e);
            }
        } else {
            await openUrl(urlToOpen);
        }
    }
}

function parseUrl(url) {
    if (url) return new URL(url).href;
    return new URL('/', self.location.origin).href;
}

async function openUrl(url) {
    console.info('Opening notification URL:', url);
    try {
        return await self.clients.openWindow(url).then(windowClient => windowClient ? windowClient.navigate(url) : null);
    } catch (e) {
        console.warn(`Failed to open the URL '${url}':`, e);
        return null;
    }
}

async function needToShowNotification() {
    const allClients = await self.clients.matchAll({includeUncontrolled: true});
    for (const client of allClients) {
        if (client.visibilityState === 'visible') {
            return false;
        }
    }
    return true;
}
