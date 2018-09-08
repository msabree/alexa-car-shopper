/* eslint valid-jsdoc: 0 */
/* eslint max-len: 0 */
/* eslint camelcase: 0 */
const includes = require('lodash/includes');
const get = require('lodash/get');
const meanBy = require('lodash/meanBy');

// 'Machine Learning'
const objDeviations = {
    likes: {
        miles: [],
        year: [],
        make: {},
        model: {},
        body_type: {},
        price: [],
    },
    dislikes: {
        miles: [],
        year: [],
        make: {},
        model: {},
        body_type: {},
        price: [],
    },
};

const learn = (arrViewedCars, type) => {
    for (let i = 0; i < arrViewedCars.length; i++) {
        let miles = get(arrViewedCars[i], 'miles');
        if (miles !== undefined) {
            objDeviations[type].miles.push(miles);
        }

        let price = get(arrViewedCars[i], 'price');
        if (price !== undefined) {
            objDeviations[type].price.push(price);
        }

        let year = get(arrViewedCars[i], 'build.year');
        if (year !== undefined) {
            objDeviations[type].year.push(year);
        }

        let body_type = get(arrViewedCars[i], 'body_type');
        if (body_type !== undefined) {
            let currentCount = objDeviations[type].body_type[body_type];
            if (currentCount === undefined) {
                objDeviations[type].body_type[body_type] = 0;
            } else {
                objDeviations[type].body_type[body_type] += 1;
            }
        }

        let make = get(arrViewedCars[i], 'build.make');
        if (make !== undefined) {
            let currentCount = objDeviations[type].make[make];
            if (currentCount === undefined) {
                objDeviations[type].make[make] = 0;
            } else {
                objDeviations[type].make[make] += 1;
            }
        }

        let model = get(arrViewedCars[i], 'build.model');
        if (model != undefined) {
            let currentCount = objDeviations[type].model[model];
            if (currentCount === undefined) {
                objDeviations[type].model[model] = 0;
            } else {
                objDeviations[type].model[model] += 1;
            }
        }
    }
};

// Compute score for number values
const computeNumberScore = (car, carPathSelector, objDeviationKey) => {
    const currentValue = get(car, carPathSelector);
    console.log(`${carPathSelector} ${objDeviationKey} ${currentValue}`);
    if (currentValue === undefined) {
        return 5;
    }

    // get like/dislike averages
    const likedAverage = meanBy(objDeviations.likes[objDeviationKey], (intValue) => {
        return intValue;
    });

    const dislikedAverage = meanBy(objDeviations.dislikes[objDeviationKey], (intValue) => {
        return intValue;
    });

    if (dislikedAverage > likedAverage) {
        // user wants a new car
        if (currentValue < dislikedAverage && currentValue < likedAverage) {
            return 10;
        } else if (Math.abs(currentValue - dislikedAverage) > Math.abs(currentValue - likedAverage)) {
            return 3;
        } else if (Math.abs(currentValue - dislikedAverage) < Math.abs(currentValue - likedAverage)) {
            return 7;
        } else {
            return 5;
        }
    } else if (dislikedAverage < likedAverage) {
        // user wants an older car
        if (currentValue > dislikedAverage && currentValue > likedAverage) {
            return 10;
        } else if (Math.abs(currentValue - dislikedAverage) < Math.abs(currentValue - likedAverage)) {
            return 3;
        } else if (Math.abs(currentValue - dislikedAverage) > Math.abs(currentValue - likedAverage)) {
            return 7;
        } else {
            return 5;
        }
    } else {
        return 5;
    }
};

// Compute score for string values
const computeStringScore = (car, carPathSelector, objDeviationKey) => {
    const currentValue = get(car, carPathSelector);
    console.log(`${carPathSelector} ${objDeviationKey} ${currentValue}`);
    if (currentValue === undefined) {
        return 5;
    }

    // Check the frequency that the string occurs in the deviations object
    const likedCount = get(objDeviations, ['dislikes', objDeviationKey, currentValue], 0);
    const dislikedCount = get(objDeviations, ['dislikes', objDeviationKey, currentValue], 0);

    const diff = likedCount - dislikedCount;

    if (diff >= -2 && diff <= 5) {
        return 5;
    } else if (diff > 5 && diff < 10) {
        return 8;
    } else if (diff > 10) {
        return 10;
    } else if (diff < -2) {
        return 2;
    } else {
        return 0;
    }
};


/**
 * Examines all of the returned cars and
 * uses the users likes and dislikes to suggest the
 * best one.
 * arrResults is what we get back from the initial search
 * objStoredUserData contains car ids we already showed to a user
 */
const findTopResult = (arrResults, objStoredUserData) => {
    // Which car ids have we already shown to the user
    const alreadyShownIds = [];
    const likedCars = get(objStoredUserData, 'likes', []);
    const dislikedCars = get(objStoredUserData, 'dislikes', []);

    learn(likedCars, 'likes');
    learn(dislikedCars, 'dislikes');

    console.log('deviations', objDeviations);

    for (let i = 0; i < likedCars.length; i++) {
        alreadyShownIds.push(likedCars[i].id);
    }

    for (let i = 0; i < dislikedCars.length; i++) {
        alreadyShownIds.push(dislikedCars[i].id);
    }

    console.log('Already shown --->', alreadyShownIds);

    let maxScoreIndex = -1;
    let maxScore = 0;

    for (let i = 0; i < arrResults.length; i++) {
        // Dont show again
        if (!includes(alreadyShownIds, arrResults[i].id)) {
            let mileageScore = computeNumberScore(arrResults[i], 'miles', 'miles');
            let priceScore = computeNumberScore(arrResults[i], 'price', 'price');
            let yearScore = computeNumberScore(arrResults[i], 'build.year', 'year');
            let makeScore = computeStringScore(arrResults[i], 'build.make', 'make');
            let modelScore = computeStringScore(arrResults[i], 'build.model', 'model');
            let bodyTypeScore = computeStringScore(arrResults[i], 'build.body_type', 'body_type');

            // Sum all scores, the greatest is the best match out of the available results
            let currScore = mileageScore + priceScore + yearScore + makeScore + modelScore + bodyTypeScore;
            console.log(JSON.stringify(arrResults[i]));
            console.log(`Curr Score ${currScore}`);

            if (currScore > maxScore) {
                maxScoreIndex = i;
                maxScore = currScore;
            }
        }
    }

    // if we end with -1, then we technically need to go to the next set of results and try agan?
    // but for now we set to the first item since we are short on time
    if (maxScoreIndex === -1) {
        console.log('TO DO: We need to page through results until we find one to return to the user.');
        console.log('Defaulting to car at index 0.');
    }
    return (maxScoreIndex === -1) ? arrResults[0] : arrResults[maxScoreIndex];
};

module.exports = {
    findTopResult,
};
