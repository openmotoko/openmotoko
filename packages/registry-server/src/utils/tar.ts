export interface TarEntry {
	path: string
	content: string
	size: number
}

export async function parseTarGz(buffer: ArrayBuffer): Promise<TarEntry[]> {
	const decompressed = await decompress(buffer)
	return parseTar(decompressed)
}

async function decompress(buffer: ArrayBuffer): Promise<ArrayBuffer> {
	const ds = new DecompressionStream('gzip')
	const writer = ds.writable.getWriter()
	const reader = ds.readable.getReader()

	const writePromise = writer.write(new Uint8Array(buffer)).then(() => writer.close())

	const chunks: Uint8Array[] = []
	while (true) {
		const { done, value } = await reader.read()
		if (done) break
		chunks.push(value)
	}

	await writePromise

	let totalLength = 0
	for (const chunk of chunks) totalLength += chunk.length
	const result = new Uint8Array(totalLength)
	let offset = 0
	for (const chunk of chunks) {
		result.set(chunk, offset)
		offset += chunk.length
	}
	return result.buffer
}

function parseTar(buffer: ArrayBuffer): TarEntry[] {
	const entries: TarEntry[] = []
	const view = new Uint8Array(buffer)
	let offset = 0

	while (offset < view.length - 512) {
		const header = view.slice(offset, offset + 512)
		if (header.every((b) => b === 0)) break

		const name = readString(header, 0, 100)
		const size = readOctal(header, 124, 12)
		const typeFlag = header[156]

		const prefix = readString(header, 345, 155)
		const fullPath = prefix ? `${prefix}/${name}` : name

		const stripped = fullPath.replace(/^[^/]+\//, '')

		offset += 512

		if (typeFlag === 0 || typeFlag === 48) {
			if (size > 0 && size < 10_000_000) {
				const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: false })
				const content = decoder.decode(view.slice(offset, offset + size))
				entries.push({ path: stripped, content, size })
			}
		}

		offset += Math.ceil(size / 512) * 512
	}

	return entries
}

function readString(buf: Uint8Array, offset: number, length: number): string {
	let end = offset
	while (end < offset + length && buf[end] !== 0) end++
	const decoder = new TextDecoder('ascii')
	return decoder.decode(buf.slice(offset, end))
}

function readOctal(buf: Uint8Array, offset: number, length: number): number {
	const str = readString(buf, offset, length).trim()
	return parseInt(str, 8) || 0
}
