# Download All TikTok Videos

Download all TikTok videos with or without a watermark.  
Additionally, you can **fetch all video links from a TikTok channel** using Puppeteer (NodeJS).

---

## ✨ Features
* Concurrent downloading (multiple videos at once).
* Download videos **with watermark** or **without watermark**.
* Supports all TikTok URL formats.
* Automatically creates folders per TikTok user.
* Logs errors to `errors.txt`.
* **NEW**: Fetch all video links from a TikTok channel using Puppeteer Extra.

---

## 📦 Requirements
* **NodeJS 16+**: [Download NodeJS](https://nodejs.org/en/download/)
* Puppeteer Extra (already included in `package.json`).

---

## ⚙️ Installation
Step 1. Clone the repository:  
```bash
git clone https://github.com/LilyRisa/Tiktok-download-all-in-one
```

Step 2. Enter the directory:  
```bash
cd Tiktok-download-all-in-one
```

Step 3. Install dependencies:  
```bash
npm install
```

---

## 🚀 Available Options


### Downloader
```bash
node download_bulk.js [--links file.txt] [--no-watermark | --watermark] [--workers n]
```

**Options**
```
--links        Path to the .txt file containing TikTok links (Default: data.txt)
--no-watermark Download videos without watermark (default)
--watermark    Download videos with watermark
--workers      Number of concurrent downloads (Default: 3)
```

### Link Grabber (Fetch all video links from a TikTok channel)
```bash
node .\get_link_video.js --link {TikTokUserLink}
```

Example:  
```bash
node .\get_link_video.js --link https://www.tiktok.com/@cong.minh.store

👉 Result: All video links will be saved into `data.txt`.

---

## 📖 Usage Examples

1. **Fetch all video links from a channel**  
   ```bash
   node .\get_link_video.js --link https://www.tiktok.com/@cong.minh.store
   ```
   → All video links will be saved to `data.txt`.

2. **Download videos (default: no watermark, links.txt)**  
   ```bash
   node download_bulk.js
   ```

3. **Download videos with watermark**  
   ```bash
   node download_bulk.js --watermark
   ```

4. **Download videos without watermark from a custom file**  
   ```bash
   node download_bulk.js --no-watermark --links my_links.txt
   ```

5. **Download videos with watermark, 8 videos at a time**  
   ```bash
   node download_bulk.js --watermark --links links.txt --workers 8
   ```

---

## 📌 Notes
* A separate folder will be created for each TikTok user.
* Videos are saved by their video IDs.
* Previously downloaded videos will be **overwritten** if re-run.
* Links with errors will be logged in `errors.txt`.

---

☕ website [CIMO.VN - Mọi thứ bạn cần với mức giá rẻ nhất](https://cimo.vn)