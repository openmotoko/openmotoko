import { getConfig } from '../config/index.js'

export type UrgencyLevel = 'critical' | 'important' | 'informational' | 'digest' | 'silent'

export interface NotificationPayload {
	urgency: UrgencyLevel
	title: string
	body: string
	intentId?: string
	actions?: { label: string; value: string }[]
}

export interface RoutedNotification extends NotificationPayload {
	targetChannel: string
}

export class NotificationRouter {
	getTargetChannel(urgency: UrgencyLevel): string {
		const config = getConfig()
		const routing = config.notifications.routing
		return routing[urgency] ?? 'webchat'
	}

	route(notification: NotificationPayload): RoutedNotification {
		return {
			...notification,
			targetChannel: this.getTargetChannel(notification.urgency),
		}
	}

	routeMultiple(notifications: NotificationPayload[]): RoutedNotification[] {
		return notifications.map((n) => this.route(n))
	}
}

let instance: NotificationRouter | null = null

export function getNotificationRouter(): NotificationRouter {
	if (!instance) {
		instance = new NotificationRouter()
	}
	return instance
}
