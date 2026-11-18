/** Build the browser half with DSH's module loader and stylesheet protocol. */
import { clientBundle } from '../../packages/client/tsdown.client.ts'

// The plugin's Node entry and user command are emitted separately by tsc.
export default clientBundle(import.meta.dirname, [])({}).filter(config => config.platform === 'browser')
