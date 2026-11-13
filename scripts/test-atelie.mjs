import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('.sites-runtime', { recursive: true });
await build({ entryPoints:['tests/atelie.test.ts'], outfile:'.sites-runtime/atelie-tests.cjs', bundle:true, platform:'node', format:'cjs', packages:'external', plugins:[{name:'test-worker-env',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'worker-env',namespace:'test-env'}));b.onLoad({filter:/.*/,namespace:'test-env'},()=>({contents:'export const env = globalThis.__correioTestEnv;'}));}}] });
const result=spawnSync(process.execPath,['--test','.sites-runtime/atelie-tests.cjs'],{stdio:'inherit'});
process.exit(result.status??1);
