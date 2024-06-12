import { join } from "node:path";

import cheerio from "cheerio";
import dayjs from "dayjs";
import {
  exists,
  existsSync,
  mkdir,
  readJSON,
  readdir,
  writeFile,
  writeJSON
} from "fs-extra";
import fetch from "node-fetch";

import type { Dayjs } from "dayjs";

export const dataDir = join(__dirname, "../data");
export const markdownDir = join(__dirname, "../archived");
const readmePath = join(__dirname, "../README.md");
interface GitHubRepo {
  date: string;
  title: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  starGrowth: number;
  isNewDay?: boolean;
}

interface GitHubTrendingData {
  [language: string]: GitHubRepo[];
}
/**
 * @param delay
 */
export async function sleep(delay: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}
/**
 * 获取数据文件路径
 * @returns {dir, filename, fullPath}
 */
export function getDataPath(day?: Dayjs) {
  const now = day ?? dayjs();
  const dir = join(dataDir, now.format("YYYY"), now.format("MM"));
  const filename = `${now.format("YYYY-MM-DD")}.json`;
  return {
    dir,
    filename,
    fullPath: join(dir, filename)
  };
}

export function getArchivedPath(day?: Dayjs) {
  const now = day ?? dayjs();
  const year = now.format("YYYY");
  const date = now.format("YYYY-MM");
  const dir = join(markdownDir, year);
  const filename = `${date}.md`;
  return {
    dir,
    filename,
    fullPath: join(dir, filename)
  };
}
export async function parseFromHTML(html: string): Promise<GitHubRepo[]> {
  const results: GitHubRepo[] = [];
  const $ = cheerio.load(html);
  const items = $("div.Box article.Box-row");
  for (const item of items) {
    const title = $(item).find(".lh-condensed a").text().replace(/\n| /g, "");
    const description = $(item)
      .find("p.col-9")
      .text()
      .replace(/^\s+|\s+$/g, "");
    const _url = `https://github.com${$(item)
      .find(".lh-condensed a")
      .attr("href")}`;
    const language = $(item)
      .find('span[itemprop="programmingLanguage"]')
      .text();
    const stars = Number(
      $(item)
        .find(".f6 a .octicon.octicon-star")
        .parent()
        .text()
        .trim()
        .replace(/,/g, "")
    );
    const forks = Number(
      $(item)
        .find(".f6 a .octicon.octicon-repo-forked")
        .parent()
        .text()
        .trim()
        .replace(/,/g, "")
    );
    const starGrowth = Number(
      $(item)
        .find(".f6 span .octicon.octicon-star")
        .parent()
        .text()
        .trim()
        .replace(/\D/g, "")
    );
    results.push({
      date: dayjs().format("YYYY-MM-DD"),
      title,
      url: _url,
      description,
      language,
      stars,
      forks,
      starGrowth
    });
  }
  return results;
}
async function crawlFromUrl(url: string): Promise<GitHubRepo[]> {
  console.log("crawl url:", url);
  // 请求头
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:11.0) Gecko/20100101 Firefox/11.0",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Encoding": "gzip,deflate,sdch",
    "Accept-Language": "zh-CN,zh;q=0.8"
  };
  let content = "";
  // 增加重试
  for (let index = 0; index < 3; index++) {
    try {
      const res = await fetch(url, { headers, method: "GET" });
      if (res.status !== 200) {
        throw new Error(`调用URL: ${url} 异常, ${res.text()}`);
      }
      content = await res.text();
      break;
    } catch (error) {
      console.error("请求发生错误:", error);
      // 超过最大的重试次数，抛出错误
      if (index === 2) {
        throw new Error("获取内容失败");
      }
    }
    // 增加睡眠，避免时间太接近，没有太大效果
    await sleep(3 * 1000);
  }
  return parseFromHTML(content);
}
// 将数据保存
export async function writeToDataFile(data: any, day?: Dayjs) {
  const { dir, fullPath } = getDataPath(day);
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
  return writeJSON(fullPath, data);
}
// 生成内容
export async function genMarkdownContent(options?: {
  title?: boolean;
  day?: Dayjs;
}) {
  const { title: showTitle = true, day = dayjs() } = options || {};
  const now = day;
  const year = now.format("YYYY");
  const month = now.format("MM");
  const date = now.format("YYYY-MM");
  // 生成 markdown 数据
  const title = `# Github 趋势榜(${date})\n`;
  let content = "";
  const monthDir = join(dataDir, year, month);
  const files = (await readdir(monthDir)).sort((a, b) => {
    // 时间降序
    return dayjs(a.slice(0, -5)).isAfter(dayjs(b.slice(0, -5))) ? -1 : 1;
  });
  const data: GitHubTrendingData = {};
  const tasks: GitHubTrendingData[] = await Promise.all(
    files.map(async (filename) => {
      const filePath = join(monthDir, filename);
      return readJSON(filePath);
    })
  );

  tasks.forEach((v) => {
    Object.entries(v).forEach(([key, value]) => {
      if (value[0]) {
        value[0].isNewDay = true;
      }
      if (data[key]) {
        data[key].push(...value);
      } else {
        data[key] = value;
      }
    });
  });
  Object.entries(data).forEach(([lang, value]) => {
    content += `## ${lang.toUpperCase()}\n`;
    content += value
      .map((item) => {
        let dayHeader = "";
        let tableHeader = "";
        // 如果是新的一天，则需要新增一个日期的标题
        if (item.isNewDay) {
          dayHeader = `### ${item.date}\n`;
          tableHeader = "| Title | Description |\n| :---- | :---- |\n";
        }
        const tableRow = `| [${item.title}](${item.url}) | ${item.description} |`;
        return `${dayHeader}${tableHeader}${tableRow}`;
      })
      .join("\n");
    content += "\n";
  });
  return `${showTitle ? title : ""}${content}`;
}
export async function genArchive(content: string, day?: Dayjs) {
  const { dir, fullPath } = getArchivedPath(day);
  if (!(await exists(dir))) {
    await mkdir(dir, { recursive: true });
  }
  return writeFile(fullPath, content);
}
// 生成 README 文档
function genREADME(content: string, day?: Dayjs) {
  const title = "# Github 趋势榜追踪\n";
  const header = `## 说明:\n本项目通过定时获取 Github 的趋势信息，并将信息保存到仓库中，便于后续数据处理，同时也会自动生成对应的 Markdown 格式的趋势榜文档。灵感来源: [github-trending](https://github.com/aneasystone/github-trending)\n\n最后更新时间: ${(
    day ?? dayjs()
  ).format("YYYY-MM-DD hh:mm:ss")}\n`;
  const footer = "## LICENSE\nMIT";
  return writeFile(readmePath, `${title}${header}${content}${footer}`);
}
/**
 * 检查当天是否已经生成了文件
 * @returns
 */
function checkExists(): boolean {
  return existsSync(getDataPath().fullPath);
}
export async function run() {
  // 需要获取的语言趋势榜, 空字符串表示所有
  const langs = [
    "",
    "javascript",
    "css",
    "html",
    "go",
    "rust",
    "python",
    "java",
    "c",
    "c++",
    "c#"
  ];
  // 检查是否已生成对应的文档
  if (checkExists()) {
    console.log("当天文件已生成");
    return;
  }
  const urls = [
    ...langs.map((lang) => ({
      language: lang,
      spoken: "",
      url: `https://github.com/trending/${lang}`
    })),
    ...langs.map((lang) => ({
      language: lang,
      spoken: "zh",
      url: `https://github.com/trending/${lang}?spoken_language_code=zh`
    }))
  ];
  const tasks = await Promise.all([
    ...urls.map(async ({ url, spoken, language }) => {
      return { spoken, language, data: await crawlFromUrl(url) };
    })
  ]);
  const data: GitHubTrendingData = {};
  tasks.forEach((task) => {
    const lang = task.language || "all";
    if (task.spoken) {
      const newData = [...data[lang]];
      // 去重
      task.data.forEach((item) => {
        if (!newData.find((i) => i.url === item.url)) {
          newData.push(item);
        }
      });
      data[lang] = newData;
    } else {
      data[lang] = task.data;
    }
  });
  const day = dayjs();
  await writeToDataFile(data, day);
  await genArchive(await genMarkdownContent({ day }), day);
  await genREADME(await genMarkdownContent({ title: false, day }));
}
