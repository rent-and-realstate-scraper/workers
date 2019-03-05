const mapDir = "../data/";
const geoJson = require(mapDir + "SECC_CPV_E_20111101_01_R_INE_MADRID_cs_epsg.geojson.json");
const citiesPath = '../config/cities.json'
const deviceId = 'raspberryOld';
const cities = require(citiesPath).cities;
require('dotenv').load();


const extractCityFeatures = (cities) => {
    console.log("extracting features from geojson ");
    const result = {};
    for (const city of cities) {
        result[city] = [];
    }

    for (const feature of geoJson.features) {
        if (cities.includes(feature.properties["NMUN"])) {
            let procFeature = {cusec:feature.properties["CUSEC"],
                geojsonGeometry: JSON.stringify({geometry:feature["geometry"]}).replace(new RegExp("\"", 'g'), "'")};
            result[feature.properties["NMUN"]].push(procFeature);
        }
    }
    return result;
}


const citiesFeaturesObject = extractCityFeatures(cities);
const ScraperDataAccess = require('../ScraperDataAccess');


( async () =>{
    const db = new ScraperDataAccess(process.env["MYSQL_HOST"], process.env["MYSQL_USER"], process.env["MYSQL_PASSWORD"], process.env["MYSQL_DATABASE"]);
    
    for (city of cities){
        for (procFeature of citiesFeaturesObject[city]){
            const id = city  + "--" + procFeature.cusec + "--" + deviceId;
            console.log("updating " + id);
            try{
                await db.updateGeoJsonField(procFeature.geojsonGeometry, id)
            } catch(err){
                console.log(err);
            }
        }
    }
})()

