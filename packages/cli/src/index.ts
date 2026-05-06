const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  switch (command) {
    case 'start': {
      const { start } = await import('@beav/orchestrator');
      await start();
      break;
    }
    case 'status':
      console.log('beav status');
      break;
    case 'logs':
      console.log('beav logs');
      break;
    case 'worker': {
      if (!arg) {
        throw new Error('Usage: beav worker <taskId>');
      }

      const { launchTaskProcess, loadTaskForLaunch } = await import('@beav/orchestrator');
      const task = await loadTaskForLaunch(arg);
      const pid = await launchTaskProcess(task);
      console.log(`Launched worker ${pid} for task ${arg}`);
      break;
    }
    default:
      console.log('Usage: beav <start|status|logs|worker>');
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
