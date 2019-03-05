const convert = require('xml-js');
const axios = require('axios');
module.exports = class ExtractBoundingBoxApi {
    constructor() {
        //this.apiUrl = "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20geo.places%20where%20text%3D-----&diagnostics=true"
        this.apiUrl = `https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20geo.places%20where%20text%3D%22-----%22&diagnostics=true`
    }

    async extractBoundingBoxFromCityName(cityname) {
        cityname = encodeURIComponent(cityname);
        const url = `https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20geo.places%20where%20text%3D"${cityname}"`;
        try {
            const response = await axios.get(url);
            if (response.data) {
                const results = convert.xml2js(response.data, { compact: true, spaces: 4 })
                if (Array.isArray(results.query.results.place)) {
                    const bb = results.query.results.place[0].boundingBox;
                    const calculatedBoundingBox = [[bb.southWest.longitude._text, bb.northEast.latitude._text],
                    [bb.northEast.longitude._text, bb.southWest.latitude._text]];
                    return calculatedBoundingBox;
                } else {
                    const bb = results.query.results.place.boundingBox;
                    const calculatedBoundingBox = [[bb.southWest.longitude._text, bb.northEast.latitude._text],
                    [bb.northEast.longitude._text, bb.southWest.latitude._text]];
                    return calculatedBoundingBox;
                }

            }

        } catch (err) {
            console.log("error");
        }


    }

}