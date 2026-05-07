import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

export async function setup(): Promise<void> {
  console.log('\nSet up Beav workflow configuration\n');

  const GITHUB_TOKEN = await ask('GitHub Token: ');
  const REPO_OWNER = await ask('Repo Owner: ');
  const REPO_NAME = await ask('Repo Name: ');
  const ISSUE_TITLE = await ask('Issue Title (default: autofix): ');

  const env = `GITHUB_TOKEN=${GITHUB_TOKEN}
REPO_OWNER=${REPO_OWNER}
REPO_NAME=${REPO_NAME}
ISSUE_TITLE=${ISSUE_TITLE || 'autofix'}
`;

  const envPath = path.resolve(process.cwd(), '.env');
  fs.writeFileSync(envPath, env);

  console.log(`\nConfig saved to ${envPath}`);

  rl.close();
}
