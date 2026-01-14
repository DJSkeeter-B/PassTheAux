import { onMessageListener, requestNotificationPermission } from "./firebase";

export class NotificationService {
    private static instance: NotificationService;

    private constructor() {
        this.init();
    }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    private init() {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            // Listen for foreground messages
            onMessageListener()?.then((payload: any) => {
                this.showLocalNotification(payload);
            });
        }
    }

    public async requestPermission(userId: string): Promise<boolean> {
        return await requestNotificationPermission(userId);
    }

    public showLocalNotification(payload: any) {
        if (Notification.permission === 'granted') {
            const { title, body } = payload.notification || {};
            if (title) {
                new Notification(title, { body, icon: '/vite.svg' });
            }
        }
    }

    // --- LOCAL TRIGGERS (Simulated for this implementation phase without Cloud Functions) ---

    public triggerBenchmarkNotification(type: 'VOTES' | 'TIME', value: number | string) {
        let title = "Milestone Reached! 🎉";
        let body = "";

        if (type === 'VOTES') {
            body = `Your request just hit ${value} votes! It's heating up!`;
        } else if (type === 'TIME') {
            body = `It's been ${value} minutes. Hang tight, the DJ sees you!`;
        }

        this.showLocalNotification({ notification: { title, body } });
    }

    public triggerGuestConversionNotification() {
        this.showLocalNotification({
            notification: {
                title: "Don't lose your Vibe!",
                body: "Create an account now to save your Vibe Score and history."
            }
        });
    }
}
