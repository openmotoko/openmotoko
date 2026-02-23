import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types.js'
import { skillsRoutes } from './routes/skills.js'
import { publishRoutes } from './routes/publish.js'
import { ratingsRoutes } from './routes/ratings.js'

const app = new Hono<{ Bindings: Env }>()

app.use('*', async (c, next) => {
	const origin = c.env.CORS_ORIGIN || '*'
	const corsMiddleware = cors({ origin, allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'] })
	return corsMiddleware(c, next)
})

app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/', skillsRoutes)
app.route('/', publishRoutes)
app.route('/', ratingsRoutes)

export { app }
