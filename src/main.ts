import { run } from "./task";

async function runTask() {
  let retry = 3;
  while (retry > 0) {
    try {
      await run();
      break;
    } catch (e) {
      retry -= 1;
    }
  }
}

runTask();
