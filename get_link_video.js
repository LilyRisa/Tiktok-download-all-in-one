const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const yargs = require("yargs");


puppeteer.use(StealthPlugin());


const argv = yargs.option("link", {
    describe: "Link channel tiktok",
    type: "string",
  }).help()
  .argv;

(async () => {
	console.log(argv);
  const browser = await puppeteer.launch({
    headless: false, 
    defaultViewport: null,
  });

  const page = await browser.newPage();

  await page.goto(argv.link, {
    waitUntil: "networkidle2",
  });

  // Hàm scroll để load toàn bộ video
  async function autoScroll(page) {
    let previousHeight = await page.evaluate("document.body.scrollHeight");
    while (true) {
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await new Promise(resolve => setTimeout(resolve, 2000)); 
      let newHeight = await page.evaluate("document.body.scrollHeight");
      if (newHeight === previousHeight) break;
      previousHeight = newHeight;
    }
  }

  await autoScroll(page);

  // Lấy toàn bộ link video
  const videoLinks = await page.$$eval('a[href*="/video/"]', els =>
    els.map(el => el.href.split("?")[0]) // bỏ query string
  );
  const content = videoLinks.join("\n");
  console.log(`✅ Tìm thấy ${videoLinks.length} video`);

  fs.writeFileSync("data.txt", content, "utf-8");

  console.log("💾 Đã lưu vào data.txt");

  await browser.close();
})();

