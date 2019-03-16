const ScraperDataAccess = require("./ScraperDataAccess");
const FotocasaBoxScraper = require("./scrapers/FotocasaBoxScraper");
const AirbnbBoxScraper = require("./scrapers/AirbnbBoxScraper");

const fs = require("fs");
module.exports = class ScraperApp {
    constructor() {
        require('dotenv').load();
        this.api = new ScraperDataAccess();

        this.configPath = "./config/scrapingConfig.json";
        this.config = require(this.configPath);

        this.citiesPath = "./config/cities.json";
        this.cities = require(this.citiesPath).cities;

        this.somethingWasScraped = false;

        if (this.config.appId === "fotocasa") {
            this.scraper = new FotocasaBoxScraper();
        } else {
            this.scraper = new AirbnbBoxScraper();
        }
    }

    async startScraper() {
        const numPieces = await this.api.countIndexEntries(this.config.deviceId);
        if (!numPieces || numPieces === 0) {
            console.log("regenerating index");
            const cities = this.cities;
            await this.api.regenerateScrapingIndex(this.config.deviceId, this.config.method, cities, this.config.appId);
        }
        let nextPieceToScrap = await this.api.getNextPieceToScrap(this.config.deviceId);
        console.log(nextPieceToScrap);
        while (nextPieceToScrap) {
            console.log("----\n scraping " + nextPieceToScrap.piece_id + "\n----");
            const boundingBox = [[nextPieceToScrap.bounding_box1_x, nextPieceToScrap.bounding_box1_y],
            [nextPieceToScrap.bounding_box2_x, nextPieceToScrap.bounding_box2_y]];
            if (this.config.appId === "fotocasa") {
                const centerPoint = [nextPieceToScrap.center_point_x, nextPieceToScrap.center_point_y];
                const dataBuy = await this.scraper.extractDataFromBox(boundingBox, centerPoint, "comprar");
                const dataRent = await this.scraper.extractDataFromBox(boundingBox, centerPoint, "alquiler");
                await this.saveData(nextPieceToScrap, dataBuy, dataRent);
            } else {
                const data = await this.scraper.interceptAjaxCall(boundingBox);
                console.log(data);
                await this.saveData(nextPieceToScrap, undefined, data);
            }

            await this.saveActivityInLog(nextPieceToScrap);
            await this.changePieceToScraped(nextPieceToScrap);
            nextPieceToScrap = await this.api.getNextPieceToScrap(this.config.deviceId);
            this.somethingWasScraped = true;
        }

        if (this.somethingWasScraped) {
            console.log("changing session id");
            this.updateSessionIdInConfig();
            console.log("setting all pieces as not scraped");
            await this.api.setIndexAsNotScraped(this.config.deviceId);
        } else {
            console.log("nothing was scraped, exiting session");
        }
    }

    async saveData(nextPieceToScrap, dataBuy, dataRent) {
        console.log("saving new data in database for " + nextPieceToScrap.piece_id);
        let record;
        if (dataBuy) {
            record = {
                result_id: nextPieceToScrap.piece_id + "---" + this.config.sessionId,
                piece_id: nextPieceToScrap.piece_id, scraping_id: this.config.sessionId,
                app_id: this.config.appId, device_id: this.config.deviceId,
                average_prize_buy: dataBuy.averagePrize, number_of_ads_buy: dataBuy.numberOfAds,
                average_prize_rent: dataRent.averagePrize, number_of_ads_rent: dataRent.numberOfAds, extra_data: ""
            }
        } else {
            record = {
                result_id: nextPieceToScrap.piece_id + "---" + this.config.sessionId,
                piece_id: nextPieceToScrap.piece_id, scraping_id: this.config.sessionId,
                app_id: this.config.appId, device_id: this.config.deviceId,
                average_prize_buy: 0, number_of_ads_buy: 0,
                average_prize_rent: dataRent.averagePrize, number_of_ads_rent: dataRent.numberOfAds, extra_data: ""
            }
        }

        await this.api.saveScrapingResults(record);
    }

    async saveActivityInLog(nextPieceToScrap) {
        console.log("updating activity log");
        const record = {
            scraping_id: this.config.sessionId, last_piece: nextPieceToScrap.piece_id,
            result_id: nextPieceToScrap.piece_id + "---" + this.config.sessionId
        }
        await this.api.saveExecutionLog(record);
    }

    updateSessionIdInConfig() {
        const date = new Date().toLocaleString().replace(/:/g, '_').replace(/ /g, '_').replace(/\//g, '_');
        this.config.sessionId = "scraping-" + this.config.appId + "-" + this.config.deviceId + "--" + date;
        fs.writeFileSync(this.configPath, JSON.stringify(this.config));
    }

    async changePieceToScraped(nextPieceToScrap) {
        console.log("changing piece " + nextPieceToScrap.piece_id + " in index to set it as scraped");
        const result = await this.api.setIndexPieceAsScraped(nextPieceToScrap.piece_id);
    }

} 
