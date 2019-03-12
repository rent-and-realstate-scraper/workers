const puppeteer = require('puppeteer');
const randomUA = require('modern-random-ua');


module.exports = class PuppeteerScraper {
    constructor(configPath= "../config/scrapingConfig.json") {
        this.browser = null;
        this.page = null;

        require('dotenv').load();
    }

    async initializePuppeteer() {
        if (process.env['RASPBERRY_MODE']) {
            this.browser = await puppeteer.launch({
                executablePath: '/usr/bin/chromium-browser',
                userAgent: randomUA.generate(),
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        } else {
            this.browser = await puppeteer.launch({
                userAgent: randomUA.generate(),
                headless: true,
                args: ['--no-sandbox']
            });
        }
        this.page = await this.browser.newPage();
    }
}
