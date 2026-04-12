const command = process.argv[2];

async function main() {
  switch (command) {
    case "start": {
      const { start } = await import("@beav/orchestrator");
      await start();
      break;
    }
    case "status":
      console.log("beav status");
      break;
    case "logs":
      console.log("beav logs");
      break;
    default:
      console.log("Usage: beav <start|status|logs>");
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
