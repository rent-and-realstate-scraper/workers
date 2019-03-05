const chai = require('chai');
const ExtractBoundingBoxScraper = require('../scrapers/ExtractBoundingBoxApi');
const assert = chai.assert;
const cities = require("../config/cities.json").cities;
const expect = chai.expect;
describe('App', function () {
    this.timeout(150000);

    describe('test that ExtractBoundingBoxScraper scraps data from Móstoles and Madrid', async function () {
        const scraper = new ExtractBoundingBoxScraper();


        for (city of cities) {
            const result = await scraper.extractBoundingBoxFromCityName(city);
            console.log(result);
            assert(result !== null);
        }
    });

});