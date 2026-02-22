export interface TailscaleStatus {
	installed: boolean
	running: boolean
	version: string | null
	hostname: string | null
	magicDns: string | null
	tailnetName: string | null
	ipv4: string | null
	ipv6: string | null
	online: boolean
}

export interface TailscaleNode {
	id: string
	hostname: string
	dnsName: string
	os: string
	online: boolean
	ipv4: string | null
	ipv6: string | null
	lastSeen: string | null
}

export interface TailscaleServeConfig {
	serving: boolean
	port: number
	protocol: 'http' | 'https'
	url: string | null
}

export interface TailscaleIdentity {
	loginName: string
	displayName: string
	profilePicUrl: string | null
	tailnetName: string
}
