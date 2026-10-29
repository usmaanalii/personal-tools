import type { E2EConfig } from 'e2e'
import { web } from '@e2e-dev/web'

export default {
  tests: 'tests/**/*.e2e.ts',
  targets: [
    {
      name: 'web',
      engine: web(),
      app: {
        url: 'http://127.0.0.1:0',
        command: {
          executable: 'npm',
          args: ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '{port}'],
          log: '.e2e/logs/app.log',
        },
      },
    },
  ],
} satisfies E2EConfig
