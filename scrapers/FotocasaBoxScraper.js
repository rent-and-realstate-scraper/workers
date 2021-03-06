const puppeteer = require('puppeteer');
const randomUA = require('modern-random-ua');
const PuppeteerScraper = require('./PuppeteerScraper');

module.exports = class FocotasaBoxScraper extends PuppeteerScraper {
    constructor(configPath= "../config/scrapingConfig.json") {
        super(configPath);
        this.config = require(configPath);

        this.timeWaitStart = 1 * 1000;
        this.timeWaitClick = 500;
    }

    async extractDataFromBox(boundingBox, centerPoint, type = "comprar") {
        //type can be comprar o alquiler
        console.log("--extracting data for type:" + type + " in url:")
        const url = `https://www.fotocasa.es/es/${type}/casas/espana/tu-zona-de-busqueda/l?latitude=40&longitude=-4&combinedLocationIds=724,0,0,0,0,0,0,0,0&gridType=list&mapBoundingBox=${boundingBox[0][0]},${boundingBox[1][1]};${boundingBox[0][0]},${boundingBox[0][1]};${boundingBox[1][0]},${boundingBox[0][1]};${boundingBox[1][0]},${boundingBox[1][1]};${boundingBox[0][0]},${boundingBox[1][1]};&latitudeCenter=${centerPoint[1]}&longitudeCenter=${centerPoint[0]}&zoom=16`

        console.log("\n---");
        console.log(url);
        console.log("---");

        await this.initializePuppeteer();
        
        try {
            await this.page.goto(url);
            await this.page.waitFor(this.timeWaitStart);
            
            let adData;
            if (await this.anyResultsFound()) {
                adData = [];
                let isNextPage = true;
                let pageNum = 1;
                let pageLimit = this.config.pageLimit;
                while (isNextPage) {
                    console.log("-->scraping page " + pageNum);
                    try {
                        const pageData = await this.extractPageData();
                        adData.push(...pageData);
                    } catch (err) {
                        console.log("error obtaining data for page");
                        console.log(err);
                    }

                    //console.log("found " + numberOfEntries + " entries in this page");
                    isNextPage = (await this.goToNextPage() && (pageNum < pageLimit));
                    pageNum = pageNum + 1;
                }

                let averagePrize = this.calculateAverage(adData);
                if (!averagePrize){
                    averagePrize=0;
                }
                let numberOfAds = adData.length;
                
                console.log(adData);
                console.log("------> " + averagePrize);

                await this.page.screenshot({ path: 'example.png' });
                await this.browser.close();
                return { averagePrize, numberOfAds, adData };
            }
        } catch (err) {
            console.log(err);
            await this.page.screenshot({ path: 'example.png' });
            await this.browser.close();
            return { numberOfAds: 0, averagePrize: 0, adData: undefined };
        }
    }

    async goToNextPage() {
        try {
            const form = await this.page.$x("//a[contains(text(), '>')]");
            if (form.length > 0) {
                await form[0].click();
                await this.page.waitFor(this.timeWaitClick);
                return true;
            } else {
                return false;
            }

        } catch (err) {
            console.log(err);
        }
    }


    async extractPageData() {
        try {
            let data = [];
            const divs = await this.page.$$('div.sui-CardComposable-secondary');
            for (const div of divs) {

                try {
                    const content = await this.page.evaluate(el => el.innerHTML, div);

                    const auxPrize = content.split("€")[0]
                    const prize = auxPrize.split('<span class=\"re-Card-price\">')[1].trim().replace(".", "");

                    const auxMeters = content.split("m²")[0]
                    const meters = auxMeters.split('<span class="re-Card-feature">')[auxMeters.split('<span class="re-Card-feature">').length - 1].trim();

                    if (meters.indexOf("hab") > -1 || prize.indexOf(">") > -1) {
                        throw Error;
                    }
                    const newAdInfo = { prize, meters }
                    data.push(newAdInfo);
                } catch (err) {
                    console.log("error obtaining prize and meters");
                }

            }

            return data
        } catch (err) {
            console.log(err);
        }


    }

    calculateAverage(adData) {
        let sum = 0;
        let errorCount = 0;

        for (const data of adData) {
            if (data.prize && data.meters && (data.prize.indexOf("<") == -1) && (data.meters.indexOf("<") == -1)) {
                sum = sum + data.prize / data.meters;
            } else {
                errorCount = errorCount + 1;
            }
        }

        return sum / (adData.length - errorCount);
    }

    async anyResultsFound() {
        const noResultsClass = "div.re-SearchresultNoResults-text";
        try {
            const div = await this.page.$(noResultsClass);
            const text = await (await div.getProperty('textContent')).jsonValue();
            return text == undefined;
        } catch (err) {
            return true
        }
    }



    async readNumberOfEntries() {
        try {
            const div = await this.page.$('div[style="margin-top: 8px;"]');
            const text = await (await div.getProperty('textContent')).jsonValue();
            await this.page.waitFor(this.timeWaitClick);
            return text.split(" ")[2].trim();
        } catch (err) {
            await this.saveHtml();
            console.log(err);
        }
    }
}
