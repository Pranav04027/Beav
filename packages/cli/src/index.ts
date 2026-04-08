const command = process.argv[2];
import {start} from "@beav/orchestrator"

switch (command) {
  case "start":
  start()
    break;
  case "status":
    console.log("beav status");
    break;
  case "logs":
    console.log("beav logs");
    break;
  default:
    console.log("Usage: beav <start|status|logs>");
}
