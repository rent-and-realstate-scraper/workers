const ScraperDataAccess = require('../ScraperDataAccess');
const GeojsonGeneratorFromBoundingBox = require('./GeoJsonGeneratorFromBoundingBox');
const GeojsonGeneratorFromCusec = require('./GeoJsonGeneratorFromCusec');
var jsonexport = require('jsonexport');

const fs = require('fs');

require('dotenv').load();

const filterResultsForCsv = (results) => {
    const filteredCols = [];
    //result_id, piece_id, scraping_id, app_id, device_id, date_scraped, average_prize_buy, number_of_ads_buy, average_prize_rent, number_of_ads_rent, extra_data
    results.map(result => {
        const piece_name = result.piece_id.split("--")[1];
        const shortResult = {
            cusec: piece_name,
            piece_id: result.piece_id.replace(result.device_id, ""),
            average_prize_buy: result.average_prize_buy, number_of_ads_buy: result.number_of_ads_buy,
            average_prize_rent: result.average_prize_rent, number_of_ads_rent: result.number_of_ads_rent,
            extra_data: result.extra_data
        };
        filteredCols.push(shortResult);
    });
    return filteredCols;
}




(async () => {
    const db = new ScraperDataAccess(process.env["MYSQL_HOST"], process.env["MYSQL_USER"], process.env["MYSQL_PASSWORD"], process.env["MYSQL_DATABASE"]);
    const geojsonGenBoundingBox = new GeojsonGeneratorFromBoundingBox();
    const geojsonGenCusec = new GeojsonGeneratorFromCusec();

    //const id = "scraping-airbnb-gCloud--2018-11-29_14_04_43";
    //const id = "scraping-fotocasa-gCloud--12_7_2018,_7_11_51_AM";
    const id = "scraping-fotocasa-gCloud--12_11_2018,_3_11_39_AM";
    const outputPath = "tmp";
    const cities = await db.getScrapedCities(id);

    console.log(cities);

    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath);
    }
    if (!fs.existsSync(outputPath + "/geoJson_output")) {
        fs.mkdirSync(outputPath + "/geoJson_output");
    }
    if (!fs.existsSync(outputPath + "/geoJson_output/" + id)) {
        fs.mkdirSync(outputPath + "/geoJson_output/" + id);
    }
    if (!fs.existsSync(outputPath + "/csv_output")) {
        fs.mkdirSync(outputPath + "/csv_output");
    }
    if (!fs.existsSync(outputPath + "/csv_output/" + id)) {
        fs.mkdirSync(outputPath + "/csv_output/" + id);
    }

    const mixedResults = [];

    for (const city of cities) {
        const results = await db.getScrapingResultsCity(city.city_name, id);
        mixedResults.push(...results)
        let geoJson;
        if (results[0].method === "cusec") {
            geoJson = geojsonGenCusec.generateGeoJsonFromResultFromCusec(results);
        } else {
            geoJson = geojsonGenBoundingBox.generateGeoJsonFromResultFromBoundingBox(results);
        }
        //console.log(await csv.toString());

        const geoJsonPath = "./" + outputPath + "/geoJson_output/" + id + "/" + city.city_name + "-" + results[0].scraping_id + ".json";
        const csvPath = "./" + outputPath + "/csv_output/" + id + "/" + city.city_name + "-" + results[0].scraping_id + ".csv";


        const filteredCols = filterResultsForCsv(results);

        jsonexport(filteredCols, function (err, csv) {
            if (err) return console.log(err);
            console.log("creating " + csvPath);
            fs.writeFile(csvPath, csv);
        });
        fs.writeFileSync(geoJsonPath, JSON.stringify(geoJson));
    }


    const filteredColsMixed = filterResultsForCsv(mixedResults);
    const csvPath = "./" + outputPath + "/csv_output/mixed_results_" + id + ".csv";

    jsonexport(filteredColsMixed, function (err, csv) {
        if (err) return console.log(err);
        console.log("creating " + csvPath);
        fs.writeFile(csvPath, csv);
    });

})()

