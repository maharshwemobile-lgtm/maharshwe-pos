const { spawn } = require('child_process');
const http = require('http');

const children = [];

function health() {
  return new Promise((resolve) => {
    const request = http.get('http://127.0.0.1:4000/api/health', (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.setTimeout(800, () => { request.destroy(); resolve(false); });
    request.on('error', () => resolve(false));
  });
}

function start(command, args, label) {
  const child = spawn(command, args, { stdio: 'inherit', shell: true, env: process.env });
  children.push(child);
  child.on('exit', (code) => {
    if (code && label === 'api') console.error(`API stopped with code ${code}`);
  });
  return child;
}

async function waitForApi() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await health()) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function run() {
  const alreadyRunning = await health();
  if (alreadyRunning) {
    console.log('API already running on http://127.0.0.1:4000');
  } else {
    start('node', ['server/api-connected.js'], 'api');
    const ready = await waitForApi();
    if (!ready) {
      console.error('API failed to start on port 4000');
      process.exit(1);
    }
  }

  console.log('API ready. Starting Vite...');
  start('npx', ['vite', '--host', '0.0.0.0', '--port', '5173'], 'web');
}

function stop() {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(0);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
run().catch((error) => {
  console.error(error);
  stop();
});
