import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { applicationDirectory } from '@beav/core/config';

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
  const ISSUE_LABEL = await ask('Issue Label (default: autofix): ');

  const env = `GITHUB_TOKEN=${GITHUB_TOKEN}
REPO_OWNER=${REPO_OWNER}
REPO_NAME=${REPO_NAME}
ISSUE_LABEL=${ISSUE_LABEL || 'autofix'}
`;

  const envPath = path.join(applicationDirectory, '.env');
  fs.writeFileSync(envPath, env);

  console.log(`\nConfig saved to ${envPath}`);

  rl.close();
}
