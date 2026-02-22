import { SessionManager } from './session.js'
import type { SessionRouteKey } from './types.js'

export type RoutingMode = 'per-sender' | 'per-channel' | 'per-group' | 'shared'

export class SessionRouter {
	private manager: SessionManager
	private mode: RoutingMode

	constructor(mode: RoutingMode = 'per-sender') {
		this.manager = new SessionManager()
		this.mode = mode
	}

	resolveSession(key: SessionRouteKey, defaultConversationId: string): string {
		switch (this.mode) {
			case 'per-sender':
				return this.manager.findOrCreateSession(
					{ channelId: key.channelId, senderId: key.senderId },
					defaultConversationId,
				)
			case 'per-channel':
				return this.manager.findOrCreateSession({ channelId: key.channelId }, defaultConversationId)
			case 'per-group':
				return this.manager.findOrCreateSession(
					{ channelId: key.channelId, senderId: key.groupId },
					defaultConversationId,
				)
			case 'shared':
				return this.manager.findOrCreateSession({}, defaultConversationId)
		}
	}

	setMode(mode: RoutingMode): void {
		this.mode = mode
	}

	getMode(): RoutingMode {
		return this.mode
	}
}
