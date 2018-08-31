/* eslint valid-jsdoc: 0 */
/* eslint max-len: 0 */
const get = require('lodash/get');
const sampleResponse = require('../data/sampleResponse');

// Autotrader specific
const maxMileageOptions = [
    15000,
    30000,
    45000,
    60000,
    75000,
    100000,
    150000,
    200000,
];

/**
 * Makes the api request to get car inventory
 * based on constructed query params.
 */
module.exports = (storedUserPreferences, startIndex = 0) => {
    // basePreferences, dislikes, saved cars
    const basePreferences = storedUserPreferences.basePreferences;

    // Need a zip, default to Atlanta
    const zip = get(basePreferences, 'zip', 30318);

    // Randomize sort by to shuffle return for subsequent calls.
    const sortByOptions = [
        'mileageASC',
        'mileageDESC',
        'relevance',
        'derivedpriceASC',
        'derivedpriceDESC',
        'yearASC',
        'yearDESC',
        'distanceASC',
    ];

    const sortBy = sortByOptions[Math.floor(Math.random() * sortByOptions.length)];

    // Base url w/ zip (zip is pretty much required)
    // End at 2019, rememeber to update next year :)
    // Search 50 miles since that is about how far i think people will want to drive.
    // If we don't match anything on the first search we can pass in startIndex + 1
    let baseUrl = `https://www.autotrader.com/rest/v1/alphashowcase/base?zip=${zip}&sortBy=${sortBy}&endYear=2019&searchRadius=50&firstRecord=${startIndex}`;

    // Round up to nearest autotrader mile for query to work
    // then filter results to match user specification exactly
    const maxMileage = get(basePreferences, 'maxMileage');
    if (maxMileage !== undefined) {
        let searchIndex = 0;
        for (let i = 0; i < maxMileageOptions.length; i++) {
            if (maxMileage === i || maxMileage < i) {
                searchIndex = i;
                break;
            }
        }
        baseUrl += `&maxMileage=${maxMileageOptions[searchIndex]}`;
    }

    // 1981 is the default earliest year for autotrader
    baseUrl += `&startYear=${get(basePreferences, 'minYear', 1981)}`;

    // Set max price only if specified
    const maxPrice = get(basePreferences, 'maxPrice');
    if (maxPrice !== undefined) {
        baseUrl += `&maxPrice=${maxPrice}`;
    }

    // DO NOT tightly integrate api specifics to my implementation
    // Do url construction explicitly
    const conditions = get(basePreferences, 'conditions', []);
    if (conditions.length !== 0) {
        let conditionsQueryString = '';
        for (let i = 0; i < conditions.length; i++) {
            let comma = (i === conditions.length - 1) ? '' : ',';
            switch (conditions[i]) {
                case 'new':
                    conditionsQueryString += `NEW${comma}`;
                    break;
                case 'used':
                    conditionsQueryString += `USED${comma}`;
                    break;
                case 'certified':
                    conditionsQueryString += `CERTIFIED${comma}`;
                    break;
                default:
                    console.log('unknown condition');
                    break;
            }
        }
        baseUrl += `&listingTypes=${conditionsQueryString}`;
    }

    const bodyStyles = get(basePreferences, 'bodyStyles', []);
    if (bodyStyles.length !== 0) {
        let bodyStylesQueryString = '';
        for (let i = 0; i < bodyStyles.length; i++) {
            let comma = (i === bodyStyles.length - 1) ? '' : ',';
            switch (bodyStyles[i]) {
                case 'convertible':
                    bodyStylesQueryString += `CONVERT${comma}`;
                    break;
                case 'coupe':
                    bodyStylesQueryString += `COUPE${comma}`;
                    break;
                case 'hatchback':
                    bodyStylesQueryString += `HATCH${comma}`;
                    break;
                case 'sedan':
                    bodyStylesQueryString += `SEDAN${comma}`;
                    break;
                case 'suv/crossover':
                    bodyStylesQueryString += `SUVCROSS${comma}`;
                    break;
                case 'truck':
                    bodyStylesQueryString += `TRUCKS${comma}`;
                    break;
                case 'van/minivan':
                    bodyStylesQueryString += `VANMV${comma}`;
                    break;
                case 'wagon':
                    bodyStylesQueryString += `WAGON${comma}`;
                    break;
                default:
                    console.log('unknown body style');
                    break;
            }
        }
        baseUrl += `&vehicleStyleCodes=${bodyStylesQueryString}`;
    }

    console.log(`TEST THIS URL ---> ${baseUrl}`);

    return sampleResponse;
};
