import path from "node:path";
import fs from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function setupWorkspace(taskId: string, htmlUrl: string, workspaceRoot: string) {
  // 1. Resolve the absolute root and the target
  const rootDir = path.resolve(workspaceRoot);
  const targetDir = path.resolve(rootDir, taskId);

  // Ensure the resolved target actually sits INSIDE the root
  if (!targetDir.startsWith(rootDir)) {
    throw new Error(`SECURITY BREACH: Path traversal detected for ID ${taskId}`);
  }

  // If the directory exists (from a previous failed attempt), wipe it
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });

  // 4. Execution (Shallow Clone)
  console.log(`[Workspace] Cloning ${htmlUrl} into ${targetDir}...`);
  try {
    await execAsync(`git clone --depth 1 ${htmlUrl} .`, {
      cwd: targetDir,
    });
  } catch (err) {
    throw new Error(`Git clone failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return targetDir;
}