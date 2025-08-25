const fs = require("fs-extra");
const path = require("path");
const cliProgress = require("cli-progress");
const yargs = require("yargs");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");

puppeteer.use(StealthPlugin());

// CLI args
const argv = yargs
  .option("links", {
    alias: "l",
    default: "data.txt",
    describe: "The path to the .txt file that contains the TikTok links.",
    type: "string",
  })
  .option("no-watermark", {
    describe: "Download videos without watermark (default)",
    type: "boolean",
  })
  .option("watermark", {
    describe: "Download videos with watermark",
    type: "boolean",
  })
  .option("workers", {
    alias: "w",
    default: 3,
    describe: "Number of concurrent downloads",
    type: "number",
  })
  .help().argv;

async function downloadWithPuppeteer(page, link) {
  try {
    // Vào lại trang chính (reset state)
    await page.goto("https://tmate.cc/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Nhập link video
    await page.type("input[name=url]", link);
    await page.click("button[type=submit]");

    // Chờ kết quả render ra
    await page.waitForSelector(".downtmate-right.is-desktop-only.right a", {
      timeout: 60000,
    });

    const anchors = await page.$$eval(
      ".downtmate-right.is-desktop-only.right a",
      (els) => els.map((a) => a.href)
    );

    let downloadLink = argv.watermark ? anchors[3] : anchors[0];
    if (!downloadLink) throw new Error("Không tìm thấy link tải");

    // Tải video bằng axios
    const videoRes = await axios.get(downloadLink, { responseType: "stream" });
    const fileSize = parseInt(videoRes.headers["content-length"], 10);

    const fileName = link.split("/").pop();
    const folderName = link.split("/")[3]; // username
    await fs.ensureDir(folderName);

    const filePath = path.join(folderName, `${fileName}.mp4`);
    const writer = fs.createWriteStream(filePath);

    const progressBar = new cliProgress.SingleBar(
      { format: `[${fileName}] {bar} {percentage}% | {value}/{total} bytes` },
      cliProgress.Presets.shades_classic
    );
    progressBar.start(fileSize, 0);

    videoRes.data.on("data", (chunk) => {
      writer.write(chunk);
      progressBar.increment(chunk.length);
    });

    videoRes.data.on("end", () => {
      writer.end();
      progressBar.stop();
      console.log(`✅ Downloaded: ${filePath}`);
    });
  } catch (err) {
    console.error(`❌ Error with link: ${link} - ${err.message}`);
    fs.appendFileSync("errors.txt", link + "\n");
  }
}

async function main() {
  const links = fs.readFileSync(argv.links, "utf-8").split("\n").filter(Boolean);
  const browser = await puppeteer.launch({ headless: true });

  // Tạo page cho từng worker
  const pages = [];
  for (let i = 0; i < argv.workers; i++) {
    pages.push(await browser.newPage());
  }

  let index = 0;

  async function worker(page) {
    while (index < links.length) {
      const link = links[index++];
      await downloadWithPuppeteer(page, link);
    }
  }

  await Promise.all(pages.map((page) => worker(page)));

  await browser.close();
}

main();