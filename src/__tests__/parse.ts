import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { genMarkdown, parseFromHTML, writeToDataFile } from "src/main";

async function testParse() {
  const data = await readFile(join(__dirname, "./index.html"));
  const res = await parseFromHTML(data.toString());
  await writeToDataFile({ all: res });
  await genMarkdown();
}
testParse();
setTimeout(testParse, 5000);
