import { readFile } from 'node:fs/promises'
import type { SkillManifest } from '@openmotoko/skill-sdk'
import { defineSkill } from '@openmotoko/skill-sdk'

const manifest: SkillManifest = JSON.parse(
	await readFile(new URL('./manifest.json', import.meta.url), 'utf-8'),
)

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'

interface TokenCache {
	accessToken: string
	expiresAt: number
}

let tokenCache: TokenCache | null = null

async function getAccessToken(env: Record<string, string | undefined>): Promise<string> {
	const clientId = env.SPOTIFY_CLIENT_ID
	const clientSecret = env.SPOTIFY_CLIENT_SECRET
	const refreshToken = env.SPOTIFY_REFRESH_TOKEN

	if (!clientId || !clientSecret || !refreshToken) {
		throw new Error(
			'SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN are required',
		)
	}

	if (tokenCache && Date.now() < tokenCache.expiresAt) {
		return tokenCache.accessToken
	}

	const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
	const response = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${credentials}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
		}),
	})

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Spotify token refresh failed: ${response.status} ${text}`)
	}

	const data = (await response.json()) as { access_token: string; expires_in: number }
	tokenCache = {
		accessToken: data.access_token,
		expiresAt: Date.now() + (data.expires_in - 60) * 1000,
	}

	return tokenCache.accessToken
}

async function spotifyFetch(
	env: Record<string, string | undefined>,
	path: string,
	options?: RequestInit,
): Promise<unknown> {
	const token = await getAccessToken(env)
	const response = await fetch(`${SPOTIFY_API_BASE}${path}`, {
		...options,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			...options?.headers,
		},
	})

	if (response.status === 204) {
		return { success: true }
	}

	if (!response.ok) {
		const text = await response.text()
		throw new Error(`Spotify API error: ${response.status} ${text}`)
	}

	return response.json()
}

interface SpotifyTrack {
	id: string
	name: string
	uri: string
	duration_ms: number
	artists: Array<{ id: string; name: string }>
	album: { id: string; name: string; images: Array<{ url: string; width: number; height: number }> }
	external_urls: { spotify: string }
}

interface SpotifyPlaybackState {
	is_playing: boolean
	progress_ms: number
	item: SpotifyTrack | null
	device: { id: string; name: string; type: string; volume_percent: number }
	shuffle_state: boolean
	repeat_state: string
}

interface SpotifySearchResponse {
	tracks: {
		items: SpotifyTrack[]
		total: number
		next: string | null
	}
}

interface SpotifyPlaylistsResponse {
	items: Array<{
		id: string
		name: string
		description: string
		tracks: { total: number }
		external_urls: { spotify: string }
		public: boolean
	}>
	next: string | null
	total: number
}

function formatTrack(track: SpotifyTrack): Record<string, unknown> {
	return {
		id: track.id,
		name: track.name,
		uri: track.uri,
		durationMs: track.duration_ms,
		artists: track.artists.map((a) => ({ id: a.id, name: a.name })),
		album: track.album.name,
		url: track.external_urls.spotify,
	}
}

export const spotify = defineSkill(manifest, async (toolName, args, ctx) => {
	switch (toolName) {
		case 'now_playing': {
			ctx.log('Getting currently playing track')

			try {
				const data = (await spotifyFetch(ctx.env, '/me/player')) as
					| SpotifyPlaybackState
					| { success: true }
				if ('success' in data || !('item' in data) || !data.item) {
					return {
						success: true,
						data: { playing: false, message: 'Nothing is currently playing' },
					}
				}
				return {
					success: true,
					data: {
						playing: data.is_playing,
						track: formatTrack(data.item),
						progressMs: data.progress_ms,
						device: data.device,
						shuffle: data.shuffle_state,
						repeat: data.repeat_state,
					},
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'play': {
			const uri = args.uri as string | undefined
			ctx.log(uri ? `Playing: ${uri}` : 'Resuming playback')

			try {
				const body: Record<string, unknown> = {}
				if (uri) {
					if (uri.startsWith('spotify:track:')) {
						body.uris = [uri]
					} else {
						body.context_uri = uri
					}
				}

				await spotifyFetch(ctx.env, '/me/player/play', {
					method: 'PUT',
					body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
				})
				return {
					success: true,
					data: { message: uri ? `Now playing: ${uri}` : 'Playback resumed' },
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'pause': {
			ctx.log('Pausing playback')

			try {
				await spotifyFetch(ctx.env, '/me/player/pause', { method: 'PUT' })
				return { success: true, data: { message: 'Playback paused' } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'skip': {
			ctx.log('Skipping to next track')

			try {
				await spotifyFetch(ctx.env, '/me/player/next', { method: 'POST' })
				return { success: true, data: { message: 'Skipped to next track' } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'search_tracks': {
			const query = args.query as string
			const limit = Math.min((args.limit as number | undefined) ?? 10, 50)
			ctx.log(`Searching tracks: ${query}`)

			try {
				const params = new URLSearchParams({
					q: query,
					type: 'track',
					limit: String(limit),
				})
				const data = (await spotifyFetch(ctx.env, `/search?${params}`)) as SpotifySearchResponse
				const tracks = data.tracks.items.map(formatTrack)
				return { success: true, data: { tracks, total: data.tracks.total } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'get_playlists': {
			ctx.log('Getting user playlists')

			try {
				const playlists: Array<Record<string, unknown>> = []
				let url = '/me/playlists?limit=50'

				while (url) {
					const data = (await spotifyFetch(ctx.env, url)) as SpotifyPlaylistsResponse
					for (const p of data.items) {
						playlists.push({
							id: p.id,
							name: p.name,
							description: p.description,
							trackCount: p.tracks.total,
							url: p.external_urls.spotify,
							public: p.public,
						})
					}
					url = data.next ? data.next.replace(SPOTIFY_API_BASE, '') : ''
				}

				return { success: true, data: { playlists, count: playlists.length } }
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		case 'add_to_playlist': {
			const playlistId = args.playlistId as string
			const trackUri = args.trackUri as string
			ctx.log(`Adding ${trackUri} to playlist ${playlistId}`)

			try {
				const data = (await spotifyFetch(ctx.env, `/playlists/${playlistId}/tracks`, {
					method: 'POST',
					body: JSON.stringify({ uris: [trackUri] }),
				})) as { snapshot_id: string }
				return {
					success: true,
					data: { snapshotId: data.snapshot_id, message: `Track added to playlist ${playlistId}` },
				}
			} catch (err) {
				return { success: false, error: (err as Error).message }
			}
		}

		default:
			return { success: false, error: `Unknown tool: ${toolName}` }
	}
})
