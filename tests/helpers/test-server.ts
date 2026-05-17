import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";

type TestServer = {
  baseUrl: string;
  stop: () => Promise<void>;
};

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
  const port = await getAvailablePort();
  const command = "./node_modules/next/dist/bin/next";
  const child = spawn(
    process.execPath,
    [command, "start", "-p", String(port)],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
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
