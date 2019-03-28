const puppeteer = require('puppeteer');
const randomUA = require('modern-random-ua');
const get = require("lodash").get;
const fs = require('fs');
const PuppeteerScraper = require('./PuppeteerScraper');

module.exports = class AirbnbBoxScraper extends PuppeteerScraper {
    constructor(configPath= "../config/scrapingConfig.json") {
        super(configPath);
        this.timeWaitStart = 3 * 1000;
        this.timeWaitClick = 1 * 1000;
        this.config = require(configPath);
        this.retries = 5;
    }

    async extractDataFromBox(boundingBox) {
        //https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=18&search_by_map=true&sw_lat=40.41092513867345&sw_lng=-3.703897645186509&ne_lat=40.41257982118033&ne_lng=-3.700771836660386&s_tag=gSIPGig_"];
        //const url = `https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=15&search_by_map=true&sw_lat=${boundingBox[1][1]}&sw_lng=${boundingBox[0][0]}&ne_lat=${boundingBox[0][1]}&ne_lng=${boundingBox[1][0]}&s_tag=gSIPGig_`;
        const url = `https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=15&search_by_map=true&sw_lat=${boundingBox[1][1]}&sw_lng=${boundingBox[0][0]}&ne_lat=${boundingBox[0][1]}&ne_lng=${boundingBox[1][0]}`;


        console.log("\n---");
        console.log(url);
        console.log("---");

        await this.initializePuppeteer();
        try {

            await this.page.goto(url);
            await this.page.waitFor(this.timeWaitStart);

            let numberOfEntries;
            let prize;

            let tryCount = 1;
            let tryAgain = true
            while (tryAgain) {
                console.log("\n--->try number " + tryCount);
                let resultsFound = await this.anyResultsFound();

                if (resultsFound) {
                    console.log("results were found");
                    numberOfEntries = await this.extractNumberOfEntries();
                    console.log("found " + numberOfEntries + " entries in this page");
                    if (numberOfEntries && numberOfEntries !== 0) {
                        prize = await this.extracPrize();
                        console.log("average prize " + prize + "  in this page");
                    } else {
                        prize = 0;
                    }

                } else {
                    console.log("no results were found for this search");
                    prize = 0;
                }
                tryAgain = ((!numberOfEntries || !prize) && tryCount < this.retries);
                tryCount = tryCount + 1;
            }



            await this.page.screenshot({ path: 'example.png' });
            await this.browser.close();

            return { averagePrize: prize || 0, numberOfAds: numberOfEntries || 0, adData: "" };
        } catch (err) {
            console.error(err);
            return { averagePrize: 0, numberOfAds: 0, adData: "" };
        }
    }


    async anyResultsFound() {
        let title = await this.titleNumEntriesLess300();
        if (title) {
            return title.indexOf("alojamientos") > -1
        } else return false;
    }

    async extracPrize() {
        try {
            await this.clickPrizeButton();
            return await this.readPrize();
        } catch (err) {
            return undefined
        }

    }

    async clickPrizeButton() {
        try {
            const form = await this.page.$$('button._1i67wnzj>div');
            let prizeForm;
            for (const button of form) {
                const content = await this.page.evaluate(el => el.innerHTML, button);

                if (content.indexOf("Precio") > -1) {
                    prizeForm = button;
                    break;
                }
            }
            await prizeForm.click();
            await this.page.waitFor(this.timeWaitClick);
        } catch (err) {
            console.log(err);
        }
    }

    async readPrize() {
        try {
            let text = await this.page.evaluate(() => {
                let elements = document.getElementsByClassName("_1nhodd4u")[0].innerText
                return elements;
            });
            const prize = parseFloat(text.replace("El precio medio por noche es de ", "").replace("€", "").trim());
            return prize;
        } catch (err) {
            console.log(err);
            return 0;
        }
    }
    async extractNumberOfEntries() {
        let numberOfEntries;
        await this.page.waitFor(this.timeWaitClick);
        let titleNumEntries = await this.titleNumEntriesLess300();
        if (!titleNumEntries) {
            titleNumEntries = await this.extractMoreThan300();
        }
        if (titleNumEntries.indexOf("Más de") === -1) {
            numberOfEntries = titleNumEntries;
        } else {
            await this.goToLastPage()
            numberOfEntries = await this.readNumberOfEntries();
        }
        numberOfEntries = parseInt(numberOfEntries.replace("alojamientos", "").trim()) || 0;
        return numberOfEntries
    }

    async titleNumEntriesLess300() {
        //_jmmm34f
        try {
            const div = await this.page.$('h3._jmmm34f>div>div');
            const text = await (await div.getProperty('textContent')).jsonValue();
            return text
        } catch (err) {
            console.log(err);
            //await this.saveHtml();
            return undefined;
        }

    }

    async extractMoreThan300() {
        //_jmmm34f
        try {
            const div = await this.page.$('h3._jmmm34f>div');
            const text = await (await div.getProperty('textContent')).jsonValue();
            return text
        } catch (err) {
            console.log(err);
            //await this.saveHtml();
            return undefined;
        }
    }

    async goToLastPage() {
        try {
            const form = await this.page.$$('li._1am0dt>a._1ip5u88');
            const len = form.length;
            await form[len - 1].click();
            await this.page.waitFor(this.timeWaitClick);
        } catch (err) {
            console.log(err);
        }
    }

    async readNumberOfEntries() {
        try {
            const div = await this.page.$('div[style="margin-top: 8px;"]');
            const text = await (await div.getProperty('textContent')).jsonValue();
            await this.page.waitFor(this.timeWaitClick);
            return text.split(" ")[2].trim();
        } catch (err) {
            //await this.saveHtml();
            console.log(err);
        }
    }

    async saveHtml() {
        let bodyHTML = await this.page.evaluate(() => document.body.innerHTML);
        fs.writeFileSync("./data/htmPage.html", bodyHTML);
    }

    async interceptAjaxCall(boundingBox) {
        //https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=18&search_by_map=true&sw_lat=40.41092513867345&sw_lng=-3.703897645186509&ne_lat=40.41257982118033&ne_lng=-3.700771836660386&s_tag=gSIPGig_"];
        //const url = `https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=15&search_by_map=true&sw_lat=${boundingBox[1][1]}&sw_lng=${boundingBox[0][0]}&ne_lat=${boundingBox[0][1]}&ne_lng=${boundingBox[1][0]}&s_tag=gSIPGig_`;
        const url = `https://www.airbnb.es/s/madrid/homes?refinement_paths%5B%5D=%2Fhomes&query=madrid&click_referer=t%3ASEE_ALL%7Csid%3Aa7d1f39d-6aca-46ed-978b-e7866130e117%7Cst%3AMAGAZINE_HOMES&allow_override%5B%5D=&map_toggle=true&zoom=15&search_by_map=true&sw_lat=${boundingBox[1][1]}&sw_lng=${boundingBox[0][0]}&ne_lat=${boundingBox[0][1]}&ne_lng=${boundingBox[1][0]}`;
        console.log("scraping using ajax interception");
        await this.initializePuppeteer();
        let result;
        try {
            this.page.on('response', async  response => {

                const url = await response.url();
                if (url.indexOf("explore_tabs") > -1) {
                    let averagePrize;
                    let numberOfAds;
                    try {
                        const text = await response.text();
                        let responseJson = JSON.parse(text);

                        numberOfAds = parseInt(get(responseJson, '["explore_tabs"][0]["home_tab_metadata"]["listings_count"]'));
                        averagePrize = get(responseJson, '["explore_tabs"][0]["home_tab_metadata"]["price_histogram"]["average_price"]');

                    } catch (err) {
                        console.log(err);
                        await this.browser.close();

                    }
                    result = { numberOfAds: numberOfAds || 0, averagePrize: averagePrize || 0 }
                    console.log(result);
                }

            });

            await this.page.goto(url);
            await this.page.waitFor(this.timeWaitStart);
            await this.browser.close();
            return result;

        } catch (err) {
            await this.browser.close();
            return { numberOfAds: 0, averagePrize: 0 }
        }
    }
}
