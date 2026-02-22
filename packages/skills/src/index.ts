export { browserControl } from './browser-control/index.js'
export { calendar } from './calendar/index.js'
export { email } from './email/index.js'
export { filesystem } from './filesystem/index.js'
export { github } from './github/index.js'
export { shellExecutor } from './shell-executor/index.js'
export { timerCron } from './timer-cron/index.js'
export { webFetch } from './web-fetch/index.js'
export { webSearch } from './web-search/index.js'

import { browserControl } from './browser-control/index.js'
import { calendar } from './calendar/index.js'
import { email } from './email/index.js'
import { filesystem } from './filesystem/index.js'
import { github } from './github/index.js'
import { shellExecutor } from './shell-executor/index.js'
import { timerCron } from './timer-cron/index.js'
import { webFetch } from './web-fetch/index.js'
import { webSearch } from './web-search/index.js'

export const allSkills = [
	shellExecutor,
	filesystem,
	webFetch,
	webSearch,
	browserControl,
	calendar,
	email,
	github,
	timerCron,
]
