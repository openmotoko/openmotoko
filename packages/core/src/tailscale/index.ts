export { extractTailscaleHeaders, whoIs } from './auth.js'
export { detectTailscale, getNodes } from './detector.js'
export { getServeStatus, startServe, stopServe } from './serve.js'
export type {
	TailscaleIdentity,
	TailscaleNode,
	TailscaleServeConfig,
	TailscaleStatus,
} from './types.js'
