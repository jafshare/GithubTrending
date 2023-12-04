import { join } from "node:path";

import dayjs from "dayjs";
import { readdir } from "fs-extra";

import { dataDir, genArchive, genMarkdownContent } from "./task";

import type { Dayjs } from "dayjs";

async function regenArchive() {
  const archives: Dayjs[] = [];
  // 遍历所有的文件
  const years = await readdir(dataDir);
  for await (const [year, months] of years.map(async (year) => [
    year,
    await readdir(join(dataDir, year))
  ])) {
    (months as string[]).forEach((month) => {
      archives.push(dayjs(`${year}-${month}`));
    });
  }
  for await (const day of archives) {
    await genArchive(await genMarkdownContent({ day }), day);
  }
}
regenArchive();
