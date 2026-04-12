import path from "node:path";
import fs from "node:fs/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function setupWorkspace(
  taskId: string,
  repoOwner: string,
  repoName: string,
  workspaceRoot: string,
) {
  const rootDir = path.resolve(workspaceRoot);
  const targetDir = path.resolve(rootDir, taskId);

  const relativeTarget = path.relative(rootDir, targetDir);
  if (relativeTarget.startsWith("..") || path.isAbsolute(relativeTarget)) {
    throw new Error(`SECURITY BREACH: Path traversal detected for ID ${taskId}`);
  }

  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });

  const repoCloneUrl = `https://github.com/${repoOwner}/${repoName}.git`;
  console.log(`[Workspace] Cloning ${repoCloneUrl} into ${targetDir}...`);
  try {
    await execAsync(`git clone --depth 1 ${repoCloneUrl} .`, {
      cwd: targetDir,
    });
  } catch (err) {
    throw new Error(`Git clone failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return targetDir;
}
