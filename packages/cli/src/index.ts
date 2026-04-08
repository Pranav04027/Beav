const command = process.argv[2];

switch (command) {
  case "start":
    console.log("beav start");
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
