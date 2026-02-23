import { Command } from 'commander'

export const pairingCommand = new Command('pairing')
	.description('Manage channel pairing allowlist')

pairingCommand
	.command('list')
	.description('List approved senders')
	.option('-c, --channel <type>', 'Filter by channel type')
	.action(async (opts) => {
		const { listAllowed } = await import('@openmotoko/core')
		const entries = await listAllowed(opts.channel)
		if (entries.length === 0) {
			console.log('No approved senders.')
			return
		}
		console.log(`\n  Approved senders (${entries.length}):\n`)
		for (const e of entries) {
			const name = e.senderName ? ` (${e.senderName})` : ''
			const date = new Date(e.approvedAt).toISOString().slice(0, 10)
			console.log(`  ${e.channelType.padEnd(12)} ${e.senderId}${name}  [${date}]`)
		}
		console.log()
	})

pairingCommand
	.command('approve <channel> <senderId>')
	.description('Approve a sender for a channel')
	.option('-n, --name <name>', 'Sender display name')
	.action(async (channel, senderId, opts) => {
		const { approveSender } = await import('@openmotoko/core')
		await approveSender(channel, senderId, opts.name)
		console.log(`Approved ${senderId} for ${channel}`)
	})

pairingCommand
	.command('revoke <channel> <senderId>')
	.description('Revoke a sender from a channel')
	.action(async (channel, senderId) => {
		const { revokeSender } = await import('@openmotoko/core')
		const removed = await revokeSender(channel, senderId)
		if (removed) {
			console.log(`Revoked ${senderId} from ${channel}`)
		} else {
			console.log(`Sender ${senderId} not found for ${channel}`)
		}
	})
