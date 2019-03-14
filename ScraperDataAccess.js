const fs = require('fs');
const mysql = require('mysql');
const config = require('./config/scrapingConfig.json');
const axios = require('axios');
const get = require('lodash').get;
module.exports = class ScraperDataAccess {
    constructor() {
        this.urlBase = config.urlBase;
    }

    async saveExecutionLog(executionLogRecord) {
        const url = `${this.urlBase}/api/workers/execution_log`;
        return axios.put(url, executionLogRecord).then(response => response.data);
    }

    async saveScrapingPiecesIndex(scapingPiecesIndexRecord) {
        const url = `${this.urlBase}/api/workers/scraping_piece_index`;
        return axios.put(url, scapingPiecesIndexRecord).then(response => response.data);
    }

    async saveScrapingResults(scapingResultsRecord) {
        const url = `${this.urlBase}/api/workers/scraping_results`;
        return axios.put(url, scapingResultsRecord).then(response => response.data);
    }

    async dropIndex(device_id) {
        const url = `${this.urlBase}/api/workers/drop_index?device_id=${device_id}`;
        return axios.delete(url).then(response => response.data);
    }

    async regenerateScrapingIndex(device_id, method = "boundingBox", cities, appId="airbnb") {
        const device = {device_id, method, cities, app_id:appId}
        console.log(device);
        const url = `${this.urlBase}/api/workers/regenerate_scraping_index`;
        return axios.post(url, device).then(response => response.data);
    }

    async getNextPieceToScrap(device_id) {
        const url = `${this.urlBase}/api/workers/next_piece_to_scrap?device_id=${device_id}`;
        return axios.get(url).then(response => response.data);
    }
    async setIndexAsNotScraped(device_id) {
        const url = `${this.urlBase}/api/workers/set_index_as_not_scraped?device_id=${device_id}`;
        return axios.delete(url).then(response => response.data);
    }

    async setIndexPieceAsScraped(piece_id) {
        const url = `${this.urlBase}/api/workers/set_index_piece_as_scraped?piece_id=${piece_id}`;
        return axios.delete(url).then(response => response.data);
    }

    async countIndexEntries(device_id) {
        const url = `${this.urlBase}/api/workers/count_index_pieces?device_id=${device_id}`;
        return axios.get(url).then(response => get(response.data, 'count'));

    }
}
