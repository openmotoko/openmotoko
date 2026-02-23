#!/usr/bin/env node
import { program } from 'commander'
import { gatewayCommand } from './commands/gateway.js'
import { agentCommand } from './commands/agent.js'
import { channelsCommand } from './commands/channels.js'
import { configureCommand } from './commands/configure.js'
import { doctorCommand } from './commands/doctor.js'
import { onboardCommand } from './commands/onboard.js'
import { pairingCommand } from './commands/pairing.js'
import { tailscaleCommand } from './commands/tailscale.js'

program
	.name('openmotoko')
	.description('OpenMotoko CLI')
	.version('0.1.0')

program.addCommand(gatewayCommand)
program.addCommand(agentCommand)
program.addCommand(channelsCommand)
program.addCommand(configureCommand)
program.addCommand(doctorCommand)
program.addCommand(onboardCommand)
program.addCommand(pairingCommand)
program.addCommand(tailscaleCommand())

program.parse()
