/* eslint valid-jsdoc: 0 */
/* eslint max-len: 0 */
const get = require('lodash/get');
const sampleResponse = require('../data/sampleResponse');

/**
 * Makes the api request to get car inventory
 * based on constructed query params.
 */
module.exports = (storedUserPreferences, startIndex = 0) => {
    // basePreferences, dislikes, saved cars
    const basePreferences = storedUserPreferences.basePreferences;

    // Need a zip, default to Atlanta
    const zip = get(basePreferences, 'zip', 30318);
    const maxYear = 2021;

    // Randomize sort by to shuffle return for subsequent calls.
    const sortByOptions = [
        'dist',
        'price',
        'miles',
        'dom',
        'year',
        'price',
    ];

    const sortOrderOptions = [
        'asc',
        'desc',
    ];

    const sortBy = sortByOptions[Math.floor(Math.random() * sortByOptions.length)];
    const sortOrder = sortOrderOptions[Math.floor(Math.random() * sortOrderOptions.length)];

    // Base url w/ zip (zip is pretty much required)
    // End at 2019, rememeber to update next year :)
    // Search 50 miles since that is about how far i think people will want to drive.
    // If we don't match anything on the first search we can pass in startIndex + 1
    let baseUrl = `http://api.marketcheck.com/v1/search?api_key=${process.env.API_KEY}&start=${startIndex}&seller_type=dealer&radius=50&zip=${zip}&rows=100&sort_by=${sortBy}&sort_order=${sortOrder}`;

    baseUrl += `&miles_range=0-${get(basePreferences, 'maxMileage', 400000)}`;

    const minYear = get(basePreferences, 'minYear', 1981);

    for (let i = minYear; i < maxYear; i++) {
        years.push(i);
    }

    baseUrl += `&year=${years.join(',')}`;

    // Set max price only if specified
    const maxPrice = get(basePreferences, 'maxPrice');
    if (maxPrice !== undefined) {
        baseUrl += `&price_range=0-${maxPrice}`;
    }

    baseUrl += `&car_type=${get(basePreferences, 'condition', 'used')}`;

    const bodyStyles = get(basePreferences, 'bodyStyles', []);
    if (bodyStyles.length !== 0) {
        let bodyStylesQueryString = '';
        for (let i = 0; i < bodyStyles.length; i++) {
            let comma = (i === bodyStyles.length - 1) ? '' : ',';
            switch (bodyStyles[i]) {
                case 'convertible':
                    bodyStylesQueryString += `convertible${comma}`;
                    break;
                case 'coupe':
                    bodyStylesQueryString += `coupe${comma}`;
                    break;
                case 'hatchback':
                    bodyStylesQueryString += `hatchback${comma}`;
                    break;
                case 'sedan':
                    bodyStylesQueryString += `sedan`;
                    break;
                case 'suv/crossover':
                    bodyStylesQueryString += `suv`;
                    break;
                case 'truck':
                    bodyStylesQueryString += `pickup${comma}`;
                    break;
                case 'van/minivan':
                    bodyStylesQueryString += `van${comma}`;
                    break;
                case 'wagon':
                    bodyStylesQueryString += `wagon${comma}`;
                    break;
                default:
                    console.log('unknown body style');
                    break;
            }
        }
        baseUrl += `&body_type=${bodyStylesQueryString}`;
    }

    console.log(`TEST THIS URL ---> ${baseUrl}`);

    return sampleResponse;
};
