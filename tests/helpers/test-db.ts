import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resetDbForTests } from "../../src/server/db";

export type TestDatabaseContext = {
  dbPath: string;
  cleanup: () => void;
};

export function createTestDatabaseContext(): TestDatabaseContext {
  const directory = mkdtempSync(join(tmpdir(), "ichigo-test-"));
  const dbPath = join(directory, "ichigo.sqlite");

  process.env.ICHIGO_DB_PATH = dbPath;
  resetDbForTests();

  return {
    dbPath,
    cleanup() {
      resetDbForTests();
      delete process.env.ICHIGO_DB_PATH;
      rmSync(directory, { recursive: true, force: true });
    },
  };
}
