import { spawn } from 'child_process';
import path from 'path';
import { Client } from 'pg';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';

const rootDir = process.cwd();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const testPort = Number(process.env.INTEGRATION_TEST_PORT ?? '3105');
const testHost = process.env.INTEGRATION_TEST_HOST ?? '127.0.0.1';
const baseUrl = `http://${testHost}:${testPort}`;

function requireEnv(name: 'TEST_DATABASE_URL'): string {
  const value = process.env[name];

  if (!value) {
    throw new Error('TEST_DATABASE_URL is required for integration tests.');
  }

  return value;
}

function buildEnv(
  databaseUrl: string,
  extraEnv: Partial<NodeJS.ProcessEnv> = {}
): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...extraEnv,
    DATABASE_URL: databaseUrl,
    TEST_DATABASE_URL: databaseUrl,
    INTEGRATION_TEST_BASE_URL: baseUrl,
    INTEGRATION_TEST_PORT: String(testPort),
    INTEGRATION_TEST_HOST: testHost,
    JWT_SECRET: process.env.JWT_SECRET ?? 'integration-test-secret',
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ?? 'test-access-key',
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ?? 'test-secret-key',
    R2_URL: process.env.R2_URL ?? 'https://example.invalid',
    R2_BUCKET: process.env.R2_BUCKET ?? 'test-bucket',
    NODE_ENV: 'test',
    NEXT_TELEMETRY_DISABLED: '1',
  };
}

function runCommand(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  options: { cwd?: string } = {}
) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? rootDir,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(' ')} failed with code ${code ?? 'null'}${
            signal ? ` (signal ${signal})` : ''
          }`
        )
      );
    });
  });
}

async function runMigrations(connectionString: string) {
  const sql = neon(connectionString);
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: path.join(rootDir, 'db/migrations') });
}

function pgClient(connectionString: string) {
  return new Client({ connectionString, ssl: { rejectUnauthorized: false } });
}


async function truncateTables(connectionString: string) {
  const client = pgClient(connectionString);
  await client.connect();
  try {
    await client.query('TRUNCATE TABLE "posts", "users" RESTART IDENTITY CASCADE;');
  } finally {
    await client.end();
  }
}

async function waitForServerReady(url: string, timeoutMs = 180000) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/posts?page=1&limit=1`);

      if (response.ok) {
        return;
      }

      lastError = new Error(`Unexpected readiness status ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Timed out waiting for the Next.js test server at ${url}. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

async function main() {
  const connectionString = requireEnv('TEST_DATABASE_URL');
  const env = buildEnv(connectionString);

  console.log('Preparing integration test database...');
  await runMigrations(connectionString);
  await truncateTables(connectionString);
  await runCommand(npmCommand, ['exec', '--', 'tsx', 'db/seed.ts'], env);

  console.log(`Starting Next.js dev server on ${baseUrl}...`);
  const server = spawn(
    npmCommand,
    ['run', 'dev', '--', '--hostname', testHost, '--port', String(testPort)],
    {
      cwd: rootDir,
      env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    }
  );

  try {
    await waitForServerReady(baseUrl);
    await runCommand(npmCommand, ['exec', '--', 'jest', '--config', 'jest.integration.config.js', '--runInBand', '--verbose'], env);
  } finally {
    if (!server.killed) {
      server.kill();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});