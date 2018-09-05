/* eslint valid-jsdoc: 0 */
/* eslint max-len: 0 */
const includes = require('lodash/includes');
const get = require('lodash/get');

// 'Machine Learning'

// Set default weights for all preferences that
// we will analyze
// Weights are between 1 - 5 in relation to importance
// In the future we may let user configure these.
// const objWeights = {
//     mileage: 3,
//     year: 3,
//     makeAndModel: 3, // i think it makes sense to look at these together
//     bodyStyle: 4,
//     price: 5,
//     color: 2,
//     transmission: 5,
// };

// test
const computeScore = (objCarDetais) => {
    if (objCarDetais.build.make.toLowerCase() === 'dodge') {
        return 100;
    } else if (objCarDetais.build.make.toLowerCase() === 'honda') {
        return 90;
    } else if (objCarDetais.build.make.toLowerCase() === 'ford') {
        return 80;
    } else if (objCarDetais.build.make.toLowerCase() === 'chevrolet') {
        return 70;
    }
    return 0;
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
            let currScore = computeScore(arrResults[i]);
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
