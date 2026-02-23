export function generateId(length = 21): string {
	const bytes = new Uint8Array(length)
	crypto.getRandomValues(bytes)
	const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-'
	let id = ''
	for (const byte of bytes) {
		id += alphabet[byte & 63]
	}
	return id
}
