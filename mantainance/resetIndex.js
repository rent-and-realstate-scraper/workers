const ScrapingIndexCreator = require('../ScrapingIndexCreator');

const creator = new ScrapingIndexCreator('./config/cities.json', "./config/scrapingConfig.json", "./initialize.sql");

(async () => await creator.regenerateScrapingIndex())();
