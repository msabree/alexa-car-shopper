/* eslint valid-jsdoc: 0 */
/* eslint max-len: 0 */
const includes = require('lodash/includes');
const get = require('lodash/get');
const meanBy = require('lodash/meanBy');

// 'Machine Learning'
const objDeviations = {
    likes: {
        miles: [],
        year: [],
        makeAndModel: {},
        bodyStyle: {},
        price: [],
    },
    dislikes: {
        miles: [],
        year: [],
        makeAndModel: {},
        bodyStyle: {},
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

        let bodyStyle = get(arrViewedCars[i], 'body_type');
        if (bodyStyle !== undefined) {
            let currentCount = objDeviations[type].bodyStyle[body_type];
            if (currentCount === undefined) {
                objDeviations[type].bodyStyle[body_type] = 0;
            } else {
                objDeviations[type].bodyStyle[body_type] += 1;
            }
        }

        let make = get(arrViewedCars[i], 'make');
        let model = get(arrViewedCars[i], 'model');
        if (make !== undefined && model != undefined) {
            let currentCount = objDeviations[type].makeAndModel[`${make}|${model}`];
            if (currentCount === undefined) {
                objDeviations[type].makeAndModel[`${make}|${model}`] = 0;
            } else {
                objDeviations[type].makeAndModel[`${make}|${model}`] += 1;
            }
        }
    }
};

// Compute mileage score
const computeMileageScore = (car) => {
    const currentCarMileage = get(car, 'miles');
    console.log(`currentCarMileage ${currentCarMileage}`);
    if (currentCarMileage === undefined) {
        return 5;
    }

    // get like/dislike averages
    const likeMilesAverage = meanBy(objDeviations.likes.miles, (intMiles) => {
        return intMiles;
    });

    const dislikedMilesAverage = meanBy(objDeviations.dislikes.miles, (intMiles) => {
        return intMiles;
    });

    if (dislikedMilesAverage > likeMilesAverage) {
        // user wants a new car
        if (currentCarMileage < dislikedMilesAverage && currentCarMileage < likeMilesAverage) {
            return 10;
        } else if (Math.abs(currentCarMileage - dislikedMilesAverage) > Math.abs(currentCarMileage - likeMilesAverage)) {
            return 3;
        } else if (Math.abs(currentCarMileage - dislikedMilesAverage) < Math.abs(currentCarMileage - likeMilesAverage)) {
            return 7;
        } else {
            return 5;
        }
    } else if (dislikedMilesAverage < likeMilesAverage) {
        // user wants an older car
        if (currentCarMileage > dislikedMilesAverage && currentCarMileage > likeMilesAverage) {
            return 10;
        } else if (Math.abs(currentCarMileage - dislikedMilesAverage) < Math.abs(currentCarMileage - likeMilesAverage)) {
            return 3;
        } else if (Math.abs(currentCarMileage - dislikedMilesAverage) > Math.abs(currentCarMileage - likeMilesAverage)) {
            return 7;
        } else {
            return 5;
        }
    } else {
        return 5;
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

    console.log(objDeviations);

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
            let currScore = computeMileageScore(arrResults[i]);
            console.log(`Curr Score (miles only) ${currScore}`);
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
