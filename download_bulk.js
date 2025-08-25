const fs = require("fs-extra");
const path = require("path");
const cliProgress = require("cli-progress");
const yargs = require("yargs");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
const AdblockerPlugin = require("puppeteer-extra-plugin-adblocker");

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

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

// Hàm xóa cookies, cache, storage
async function clearPageData(page) {
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCookies');
  await client.send('Network.clearBrowserCache');

  try {
    const url = page.url();
    const { origin } = new URL(url);
    await client.send('Storage.clearDataForOrigin', { origin, storageTypes: 'all' });
  } catch (err) {
    console.warn('Không thể clear storage trực tiếp:', err.message);
  }
}

async function downloadWithPuppeteer(page, link) {
  let downloadLink = null;

  try {
    // Xóa cookies/storage trước khi load link
    await clearPageData(page);

    // Vào lại trang chính
    await page.goto("https://tmate.cc/", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // Chờ 1 giây để JS trên trang load xong và không xóa ô input
    // await page.waitForTimeout(1000);
    await page.evaluate(() => {
    const input = document.querySelector("input[name=url]");
    if (input) input.value = "";
  });
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));

    // Nhập link video
    await page.type("input[name=url]", link);
    await page.click("button[type=submit]");

    // Chờ render selector
    try {
      await page.waitForSelector(".downtmate-right.is-desktop-only.right a", { timeout: 20000 });

      if (!downloadLink) {
        const anchors = await page.$$eval(
          ".downtmate-right.is-desktop-only.right a",
          (els) => els.map((a) => a.href)
        );
        downloadLink = argv.watermark ? anchors[3] : anchors[0];
      }
    } catch (err) {
      if (!downloadLink) throw new Error("Không tìm thấy link tải");
    }

    if (!downloadLink) throw new Error("Download link is null");

    // Tải video bằng axios
    const videoRes = await axios.get(downloadLink, { responseType: "stream" });
    const fileSize = parseInt(videoRes.headers["content-length"], 10);

    const fileName = link.split("/").pop();
    const folderName = link.split("/")[3]; // username
    await fs.ensureDir(folderName);

    const filePath = path.join(folderName, `${fileName}.mp4`);
    const writer = fs.createWriteStream(filePath);

    await downloadStream(videoRes.data, filePath, fileSize, fileName);

  } catch (err) {
    console.error(`❌ Error with link: ${link} - ${err.message}`);
    fs.appendFileSync("errors.txt", link + "\n");
  }
}

function downloadStream(stream, filePath, fileSize, fileName) {
  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filePath);
    const progressBar = new cliProgress.SingleBar(
      { format: `[${fileName}] {bar} {percentage}% | {value}/{total} bytes` },
      cliProgress.Presets.shades_classic
    );
    progressBar.start(fileSize, 0);

    stream.on("data", (chunk) => {
      writer.write(chunk);
      progressBar.increment(chunk.length);
    });

    stream.on("end", () => {
      writer.end();
      progressBar.stop();
      console.log(`✅ Downloaded: ${filePath}`);
      resolve();
    });

    stream.on("error", (err) => {
      progressBar.stop();
      reject(err);
    });
  });
}

async function worker(links) {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  for (const link of links) {
    await downloadWithPuppeteer(page, link);
  }

  await browser.close();
}

async function main() {
  const links = fs.readFileSync(argv.links, "utf-8").split("\n").filter(Boolean);

  // Chia đều links cho các worker
  const chunkSize = Math.ceil(links.length / argv.workers);
  const chunks = [];
  for (let i = 0; i < links.length; i += chunkSize) {
    chunks.push(links.slice(i, i + chunkSize));
  }

  // Mỗi worker chạy trên 1 browser riêng
  await Promise.all(chunks.map((chunk) => worker(chunk)));
  console.log("🎉 All downloads finished.");
  process.exit(0); // Tự động thoát NodeJS
}

main();