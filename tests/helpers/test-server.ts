import { spawn } from "node:child_process";
import { once } from "node:events";
import { access } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

type TestServer = {
  baseUrl: string;
  stop: () => Promise<void>;
};

const BUILD_READY_TIMEOUT_MS = 20_000;
const BUILD_READY_POLL_MS = 250;

async function fileExists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function hasProductionBuild(cwd: string) {
  const buildIdPath = path.join(cwd, ".next", "BUILD_ID");
  return await fileExists(buildIdPath);
}

async function waitForProductionBuild(cwd: string, timeoutMs = BUILD_READY_TIMEOUT_MS) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await hasProductionBuild(cwd)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, BUILD_READY_POLL_MS));
  }

  return await hasProductionBuild(cwd);
}

async function buildProductionApp(cwd: string) {
  const command = "./node_modules/next/dist/bin/next";
  const child = spawn(process.execPath, [command, "build"], {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";

  const appendOutput = (chunk: Buffer | string) => {
    output += chunk.toString();
    if (output.length > 24_000) {
      output = output.slice(-24_000);
    }
  };

  child.stdout.on("data", appendOutput);
  child.stderr.on("data", appendOutput);

  const [code] = (await once(child, "exit")) as [number | null];

  if (code !== 0) {
    throw new Error(`Could not build Ichigo for HTTP smoke tests.\n${output}`);
  }
}

async function ensureProductionBuild(cwd: string) {
  if (await hasProductionBuild(cwd)) {
    return;
  }

  const buildAppeared = await waitForProductionBuild(cwd);

  if (buildAppeared) {
    return;
  }

  await buildProductionApp(cwd);

  if (!(await hasProductionBuild(cwd))) {
    throw new Error("Ichigo HTTP smoke tests could not find a usable production build.");
  }
}

async function getAvailablePort() {
  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not resolve test server port"));
        return;
      }

      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });
  });
}

async function waitForServer(url: string) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 45_000) {
    try {
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(2_500),
      });

      if (response.status >= 200 && response.status < 500) {
        return;
      }
    } catch {
      // ignore until next retry
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for Ichigo test server at ${url}`);
}

export async function startTestServer(dbPath: string): Promise<TestServer> {
  const cwd = process.cwd();
  await ensureProductionBuild(cwd);
  const port = await getAvailablePort();
  const command = "./node_modules/next/dist/bin/next";
  const child = spawn(
    process.execPath,
    [command, "start", "-p", String(port)],
    {
      cwd,
      env: {
        ...process.env,
        ICHIGO_DISABLE_SMTP: "true",
        ICHIGO_DB_PATH: dbPath,
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let output = "";

  const appendOutput = (chunk: Buffer | string) => {
    output += chunk.toString();
    if (output.length > 12_000) {
      output = output.slice(-12_000);
    }
  };

  child.stdout.on("data", appendOutput);
  child.stderr.on("data", appendOutput);

  child.once("exit", (code) => {
    if (code && code !== 0) {
      console.error(output);
    }
  });

  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await waitForServer(`${baseUrl}/login`);
  } catch (error) {
    child.kill("SIGTERM");
    await once(child, "exit").catch(() => undefined);
    throw error;
  }

  return {
    baseUrl,
    async stop() {
      child.kill("SIGTERM");
      await once(child, "exit").catch(() => undefined);
    },
  };
}
