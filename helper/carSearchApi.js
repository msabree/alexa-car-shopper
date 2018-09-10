/* eslint valid-jsdoc: 0 */
/* eslint max-len: 0 */
const get = require('lodash/get');
const axios = require('axios');

/**
 * Makes the api request to get car inventory
 * based on constructed query params.
 */
module.exports = (storedUserPreferences, startIndex = 0) => {
    return new Promise((resolve) => {
        // basePreferences, dislikes, saved cars
        const basePreferences = storedUserPreferences.basePreferences;

        // Need a zip, default to Atlanta
        const zip = get(basePreferences, 'zip', 30318);
        const maxYear = 2021;
        const maxRowsPerRequest = 50;

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

        let baseUrl = `http://api.marketcheck.com/v1/search?api_key=${process.env.API_KEY}&start=${startIndex}&seller_type=dealer&radius=50&zip=${zip}&rows=${maxRowsPerRequest}&sort_by=${sortBy}&sort_order=${sortOrder}&carfax_clean_title=true`;

        baseUrl += `&miles_range=0-${get(basePreferences, 'maxMileage', 400000)}`;

        // Set max price only if specified
        const maxPrice = get(basePreferences, 'maxPrice');
        if (maxPrice !== undefined) {
            baseUrl += `&price_range=0-${maxPrice}`;
        }

        const carType = get(basePreferences, 'condition', 'used');
        baseUrl += `&car_type=${carType}`;

        if (carType !== 'new') {
            // new cars don't need a year range
            const minYear = get(basePreferences, 'minYear', 1981);
            const years = [];

            for (let i = minYear; i < maxYear; i++) {
                years.push(i);
            }

            baseUrl += `&year=${years.join(',')}`;
        }

        // Join makes to make a string (no pun intended)
        const makes = get(basePreferences, 'make', []);
        if (makes.length !== 0) {
            baseUrl += `&make=${makes.map((item) => item.toLowerCase()).join(',')}`;
        }

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

        axios.get(baseUrl, {
            headers: {
                'Host': 'marketcheck-prod.apigee.net',
            },
        })
        .then(function(response) {
            console.log(baseUrl);
            console.log(response);
            resolve(response.data);
        })
        .catch(function(error) {
            console.log(error);
            resolve({error: error.message});
        });
    });
};
