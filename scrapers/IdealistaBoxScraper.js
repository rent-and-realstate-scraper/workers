const puppeteer = require('puppeteer');
const randomUA = require('modern-random-ua');
const PuppeteerScraper = require('./PuppeteerScraper');
const encode = require('geojson-polyline').encode;

module.exports = class FocotasaBoxScraper extends PuppeteerScraper {
    constructor(configPath= "../config/scrapingConfig.json") {
        super(configPath);
        this.config = require(configPath);

        this.timeWaitStart = 1 * 1000;
        this.timeWaitClick = 500;
    }

    async extractDataFromBox(boundingBox, type = "comprar") {
        //type can be comprar o alquiler
        console.log("--extracting data for type:" + type + " in url:")
        const url = "https://www.idealista.com/en/areas/venta-viviendas/?shape=" + this.getPolylineEncoded(boundingBox);

        console.log("\n---");
        console.log(url);
        console.log("---");

        await this.initializePuppeteer();
        
        try {
            await this.page.goto(url);
            await this.page.waitFor(this.timeWaitStart);
            
            let results = {}
            let adData;
            if (await this.anyResultsFound()) {

            }
        } catch (err) {
            console.log(err);
            await this.page.screenshot({ path: 'example.png' });
            await this.browser.close();
            return { numberOfAds: 0, averagePrize: 0, adData: undefined };
        }
    }

    getPolylineEncoded(boundingBox){
        const bbox = [boundingBox[1][0], boundingBox[1][1], boundingBox[0][0], boundingBox[0][1]];
        const coordinates = [[[bbox[0], bbox[3]], [bbox[2], bbox[3]], [bbox[2], bbox[1]], [bbox[0], bbox[1]], [bbox[0], bbox[3]]]]
        const geojson = {type:"Multipolygon" , coordinates}

        const polylineEncoded = encode(geojson)["coordinates"];
        const polylineEncodedPreURL = "((" + polylineEncoded + "))";
        const urlEncoded = encodeURIComponent(polylineEncodedPreURL)
        console.log(urlEncoded);
        return urlEncoded;
    }

    async goToNextPage() {

    }


    async extractPageData() {
    }


    async anyResultsFound() {

    }

}
