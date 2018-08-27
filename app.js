const get = require('lodash/get');
const includes = require('lodash/includes');
const getPreferenceProfile = require('./data/samplePreferenceModel');
const baseBodyStyles = require('./data/bodyStyles');

// Later we'll create weights to avoid missing things we like due to 'binary' filters.
const NO_WEIGHT = 0;
const LOW_WEIGHT = 1;
const MED_WEIGHT = 3
const HIGH_WEIGHT = 5;

const determineDislikeWeights = () => {

}

const determineLikeWeights = () => {

}

// Eval like weights vs dislike weights and create a search query
// Choices is a collection of 'filters' that almost all sites use
const createSearch = () => {

}

/**
 * Returns the max price to show.
 * We only report wehn price is too high. 
 * Price too low should never hold any weight, the other car factors matter more in that case (year/mileage/condition).
 */
const determineMaxPrice = (prefProf) => {
    const DIFF_PERCENT = .1;
    let maxPrice;
    for(let i = 0; i < prefProf.dislikes.length; i++){
        let objDislikeReason = prefProf.dislikes[i].reasons;
        const dislikePrice = get(objDislikeReason, 'price');
        if(dislikePrice && (maxPrice === undefined || dislikePrice < maxPrice)){
            maxPrice = dislikePrice;
        }
    }

    return (maxPrice === undefined) ? 0 : maxPrice - (maxPrice * DIFF_PERCENT);
}

/**
 * Returns the minimum year that a user is interested in searching for.
 */
const determineMinYear = (prefProf) => {
    let minYear = 1929;
    for(let i = 0; i < prefProf.dislikes.length; i++){
        let objDislikeReason = prefProf.dislikes[i].reasons;
        const dislikeYear = get(objDislikeReason, 'year', 0);
        if(dislikeYear > minYear){
            minYear = dislikeYear;
        }
    }

    const years = [];
    for(let i = minYear; i < 2020; i++){
        years.push(i);
    }
    return years;
}

/**
 * Returns the max amount of miles to return. Will return undefined if no preference for mileage recorded.
 * Return DIFF_PERCENT < than lowest recorded max mileage
 */
const determineMaxMiles = (prefProf) => {
    const DIFF_PERCENT = .15; // ---> if i dislike a car @ 90,000 miles dont return 88,000
    let maxMiles;
        for(let i = 0; i < prefProf.dislikes.length; i++){
        let objDislikeReason = prefProf.dislikes[i].reasons;
        const dislikeMiles = get(objDislikeReason, 'miles');
        if(dislikeMiles !== undefined && (maxMiles === undefined || dislikeMiles < maxMiles)){
            maxMiles = dislikeMiles;
        }
    }
    return Math.round(maxMiles - (maxMiles * DIFF_PERCENT));
}

const determineBodyStyles = (prefProf) => {
    const dislikedBodyStyles = [];
    for(let i = 0; i < prefProf.dislikes.length; i++){
        let objDislikeReason = prefProf.dislikes[i].reasons;
        const dislikeBodyStyle = get(objDislikeReason, 'bodyStyle');
        if(dislikeBodyStyle){
            dislikedBodyStyles.push(dislikeBodyStyle)
        }
    }

    return baseBodyStyles.filter(style => !includes(dislikedBodyStyles, style));
}

const preferenceProfile = getPreferenceProfile('makeen.sabree@gmail.com');

// Create search filters below here

// Create a max price point
const maxPrice = determineMaxPrice(preferenceProfile);

// Create a year range
const yearRange = determineMinYear(preferenceProfile);

// Determine max miles
const maxMiles = determineMaxMiles(preferenceProfile);

// Determine body styles
const bodyStyles = determineBodyStyles(preferenceProfile);

console.log(`max price -> ${maxPrice}`);
console.log(`year range -> ${yearRange}`);
console.log(`max mileage -> ${maxMiles}`);
console.log(`body styles -> ${bodyStyles}`);