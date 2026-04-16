import { exec } from "node:child_process"
import { type Task } from "@beav/core"

function run(cmd: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd }, (err, stdout, stderr) => {
      if (err) return reject(stderr || err.message);
      resolve(stdout);
    });
  });
}

async function prExists(branch: string, cwd: string) {
  try {
    const res = await run(
      `gh pr list --head ${branch} --json number --jq '.[0].number'`,
      cwd
    );
    return res.trim() !== "";
  } catch {
    return false;
  }
}

export async function createPR(task: any) {
  const cwd = task.workspacePath;
  const branch = `beav-fix-${task.id}`;

  await run(`git checkout -B ${branch}`, cwd);

  await run(`git add .`, cwd);

  // avoid empty commit
  try {
    await run(`git diff --cached --quiet`, cwd);
    console.log("No changes → skipping commit + PR");
    return;
  } catch {
    await run(
      `git commit -m "fix: ${task.issueTitle.replace(/"/g, "")}"`,
      cwd
    );
  }

  await run(`git push -u origin ${branch}`, cwd);

  const exists = await prExists(branch, cwd);

  if (!exists) {
    await run(
      `gh pr create --base main --head ${branch} \
      --title "${task.issueTitle}" \
      --body "Auto fix\n\nCloses #${task.githubIssueNumber}"`,
      cwd
    );
  } else {
    console.log("PR already exists → skipping");
  }
}

