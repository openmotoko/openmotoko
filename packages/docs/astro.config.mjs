import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  site: 'https://openmotoko.ai',
  base: '/docs',
  integrations: [
    starlight({
      title: 'OpenMotoko',
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Overview', link: '/' },
            { label: 'Installation', link: '/setup/installation/' },
            { label: 'Configuration', link: '/setup/configuration/' },
            { label: 'Environment Variables', link: '/setup/environment/' },
          ],
        },
        {
          label: 'Features',
          items: [
            { label: 'Skills', link: '/features/skills/' },
            { label: 'Channels', link: '/features/channels/' },
            { label: 'Memory', link: '/features/memory/' },
            { label: 'RAG', link: '/features/rag/' },
            { label: 'MCP', link: '/features/mcp/' },
            { label: 'Proactive Agent', link: '/features/proactive-agent/' },
            { label: 'Multi-Agent', link: '/features/multi-agent/' },
            { label: 'Canvas', link: '/features/canvas/' },
          ],
        },
        {
          label: 'Security',
          items: [
            { label: 'Overview', link: '/security/overview/' },
            { label: 'Docker Sandbox', link: '/security/sandbox/' },
            { label: 'Skill Scanning', link: '/security/skill-scanning/' },
          ],
        },
        {
          label: 'API Reference',
          items: [
            { label: 'REST API', link: '/api/rest/' },
            { label: 'WebSocket', link: '/api/websocket/' },
            { label: 'OpenAI Compatible', link: '/api/openai-compat/' },
          ],
        },
        {
          label: 'Deployment',
          items: [
            { label: 'Docker', link: '/deployment/docker/' },
            { label: 'Fly.io', link: '/deployment/fly-io/' },
            { label: 'Tailscale', link: '/deployment/tailscale/' },
            { label: 'Desktop App', link: '/deployment/desktop/' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Writing a Skill', link: '/guides/writing-a-skill/' },
            { label: 'Adding a Channel', link: '/guides/adding-a-channel/' },
            { label: 'Contributing', link: '/guides/contributing/' },
          ],
        },
      ],
    }),
  ],
})
