/* eslint max-len: 0 */
const Alexa = require('ask-sdk-core');
const zipcodes = require('zipcodes');
const get = require('lodash/get');
const carApiSearch = require('./helper/api');
const getSlotValues = require('./helper/getSlotValues');
const dynamoDB = require('./helper/dynamoDB');

// TEST
const storedUserPreferencesTEST = require('./data/samplePreferenceModel');

const APP_NAME = 'Alexa - Car Shopper';

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const welcomeOptions = [
            'Hey, my name is Alexa and I will help you find the perfect car.',
            `Hey, there are lots of great cars for sale, let's find you one.`,
            `Ready to buy a car? I can help you with that!`,
            `Welcome to Alexa Car Shopper. Let's get started on your car search!`,
        ];
        const speechText = welcomeOptions[Math.floor(Math.random() * welcomeOptions.length)];

      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withStandardCard(APP_NAME, speechText, 'https://lh5.googleusercontent.com/6dynkppIJoHsGtB-Zmzl-4wyuXfiRQOLU1jIss89913NlUfwiFwA91eiksjNdYunXHIPtzWGR59jxg=w1440-h703', 'https://lh5.googleusercontent.com/6dynkppIJoHsGtB-Zmzl-4wyuXfiRQOLU1jIss89913NlUfwiFwA91eiksjNdYunXHIPtzWGR59jxg=w1440-h703')
        .getResponse();
    },
};

const SearchCarsNowIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'SearchCarsNowIntent'
        && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {
        // Pull the stored user preferences from the database
        const getUserPreferencesPromise = getStoredUserPreferences(handlerInput.requestEnvelope);
        console.log(typeof getUserPreferencesPromise);

        // increment by 100 if no results found
        const startIndex = 0;

        // Perform car search
        const results = carApiSearch(storedUserPreferencesTEST, startIndex);

        // for testing we'll use the first item
        const firstListingForTest = results.alphaShowcase[0];

        // parse results
        const description = get(firstListingForTest, 'description.label', 'car');
        const miles = get(firstListingForTest, 'specifications.mileage.value', 'miles unknown');
        let price = get(firstListingForTest, 'pricingDetail.salePrice', 'price unknown');

        const speechText = `I found a ${description} with ${miles} miles at ${price} dollars.`;

      return handlerInput.responseBuilder
        .speak(speechText)
        .withSimpleCard(APP_NAME, speechText)
        .getResponse();
    },
};

const CompleteSearchCarsNowIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateCityIntent';
    },
    handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const slotValues = getSlotValues(filledSlots);
        const saveResponse = get(slotValues, 'SaveResponse.resolved');
        let speechText;
        if (saveResponse === undefined) {
            speechText = 'Unable to determine your choice, your like and dislike history was not affected. You can continue your search as normal.';
        } else {
            if (saveResponse === 'yes') {
                // Update the user's preferences
                dynamoDB.updateCarSearchHistory(handlerInput.requestEnvelope, 'likes', {car: 'jag'});
            } else if (saveResponse === 'no') {
                dynamoDB.updateCarSearchHistory(handlerInput.requestEnvelope, 'dislikes', {car: 'volvo'});
            } else {
                speechText = 'Unable to determine your choice, your like and dislike history was not affected. You can continue your search as normal.';
            }
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    },
};

const UpdateMakeIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateMakeIntent'
        && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {
      return handlerInput.responseBuilder
        .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
        .getResponse();
    },
};

const CompleteUpdateMakeIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateMakeIntent';
    },
    handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const slotValues = getSlotValues(filledSlots);
        const make = get(slotValues, 'Make.resolved');
        let speechText;
        if (make === undefined) {
            speechText = 'Unable to determine make. To try again, say, Alexa update make.';
        } else {
            const cityStateArray = city.split(' '); // city state
            const location = zipcodes.lookupByName(cityStateArray[0], cityStateArray[1])[0];
            zip = get(location, 'zip');

            if (zip === undefined) {
                zip = 30318;
                speechText = 'Unable to determine city, setting to Atlanta Georgia. To try again, say, Alexa update search city.';
            } else {
                speechText = `You have requested ${city} which maps to zipcode ${zip}. Your preferences will be updated.`;
            }
        }

        // Update the user's preferences
        dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'add', 'string', 'zip', zip);

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    },
};

const UpdateCityIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateCityIntent'
        && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {
      return handlerInput.responseBuilder
        .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
        .getResponse();
    },
};

const CompleteUpdateCityIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateCityIntent';
    },
    handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const slotValues = getSlotValues(filledSlots);
        const city = get(slotValues, 'City.resolved');
        let zip = 30318;
        let speechText;
        if (city === undefined || city.split(' ').length !== 2) {
            speechText = 'Unable to determine city, defaulting to Atlanta Georgia. To try again, say, Alexa update search city.';
        } else {
            const cityStateArray = city.split(' '); // city state
            const location = zipcodes.lookupByName(cityStateArray[0], cityStateArray[1])[0];
            zip = get(location, 'zip');

            if (zip === undefined) {
                zip = 30318;
                speechText = 'Unable to determine city, setting to Atlanta Georgia. To try again, say, Alexa update search city.';
            } else {
                speechText = `You have requested ${city} which maps to zipcode ${zip}. Your preferences will be updated.`;
            }
        }

        // Update the user's preferences
        dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'add', 'string', 'zip', zip);

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    },
};

const UpdateConditionsIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateConditionsIntent'
        && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {
      return handlerInput.responseBuilder
        .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
        .getResponse();
    },
};

const CompleteUpdateConditionsIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateConditionsIntent';
    },
    handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const slotValues = getSlotValues(filledSlots);
        const carCondition = get(slotValues, 'CarCondition.resolved');
        let speechText = '';

        if (carCondition === undefined) {
            speechText = 'Unable to understand condition request. To try again, say, Alexa update search conditions.';
        } else {
            speechText = `You have requested to search ${carCondition} vehicles. Your preferences will be updated.`;

            // Update the user's preferences
            dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'add', 'array', 'conditions', carCondition);
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    },
};

const UpdateBodyStyleIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateBodyStyleIntent'
        && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {
      return handlerInput.responseBuilder
        .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
        .getResponse();
    },
};

const CompleteUpdateBodyStyleIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateBodyStyleIntent';
    },
    handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const slotValues = getSlotValues(filledSlots);
        const bodyStyle = get(slotValues, 'BodyStyle.resolved');
        let speechText = '';

        if (bodyStyle === undefined) {
            speechText = 'Unable to understand body style request. To try again, say, Alexa update body styles.';
        } else {
            speechText = `You have requested to search ${bodyStyle} body styles. Your preferences will be updated.`;

            // Update the user's preferences
            dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'add', 'array', 'bodyStyles', bodyStyle);
        }

      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    },
};

const UpdateMaxPriceIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateMaxPriceIntent'
        && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {
      return handlerInput.responseBuilder
        .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
        .getResponse();
    },
};

const CompleteUpdateMaxPriceIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateMaxPriceIntent';
    },
    handle(handlerInput) {
      const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
      const slotValues = getSlotValues(filledSlots);
      const maxPrice = get(slotValues, 'MaxPrice.resolved');
      let speechText = '';

      if (maxPrice === undefined) {
          speechText = 'Unable to understand max price request. To try again, say, Alexa update max price.';
      } else {
          speechText = `You have requested to set a max price of ${maxPrice} thousand. Your preferences will be updated.`;

          // Update the user's preferences
          dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'add', 'string', 'maxPrice', maxPrice + '000');
      }

      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    },
};

const UpdateMaxMileageIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateMaxMileageIntent'
        && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {
      return handlerInput.responseBuilder
        .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
        .getResponse();
    },
};

const CompleteUpdateMaxMileageIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateMaxMileageIntent';
    },
    handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const slotValues = getSlotValues(filledSlots);
        const maxMileage = get(slotValues, 'MaxMileage.resolved');
        let speechText = '';

        if (maxMileage === undefined) {
            speechText = 'Unable to understand max mileage request. To try again, say, Alexa update max mileage.';
        } else {
            speechText = `You have requested to set a max mileage of ${maxMileage} thousand. Your preferences will be updated.`;

            // Update the user's preferences
            dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'add', 'string', 'maxMileage', maxMileage + '000');
        }

      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    },
};

const UpdateMinYearIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateMinYearIntent'
        && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {
      return handlerInput.responseBuilder
        .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
        .getResponse();
    },
};

const CompleteUpdateMinYearIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'UpdateMinYearIntent';
    },
    handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const slotValues = getSlotValues(filledSlots);
        const minYear = get(slotValues, 'MinYear.resolved');
        let speechText = '';

        if (minYear === undefined) {
            speechText = 'Unable to understand minimum year request. To try again, say, Alexa update min year.';
        } else {
            speechText = `You have requested to set a minimum search year of ${minYear}. Your preferences will be updated.`;

            // Update the user's preferences
            dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'add', 'string', 'minYear', minYear);
        }

      return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    },
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
      const speechText = 'To get started simply say Alexa show me a car. Or you can update your preferences. See the app help section for an exhaustive guide.';

      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard(APP_NAME, speechText)
        .getResponse();
    },
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
            || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'Your preferences are saved. You can resume your search where you left off. Good bye';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard(APP_NAME, speechText)
            .getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // any cleanup logic goes here
        return handlerInput.responseBuilder.getResponse();
    },
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);

        return handlerInput.responseBuilder
            .speak('Sorry, there was an error processing the request. The dev team has been notified. Please try again later.')
            .reprompt('Sorry, there was an error processing the request. The dev team has been notified. Please try again later.')
            .getResponse();
    },
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        SearchCarsNowIntent,
        CompleteSearchCarsNowIntent,
        UpdateMakeIntent,
        CompleteUpdateMakeIntent,
        UpdateConditionsIntent,
        UpdateBodyStyleIntent,
        UpdateMaxMileageIntent,
        UpdateMaxPriceIntent,
        UpdateMinYearIntent,
        UpdateCityIntent,
        CompleteUpdateConditionsIntent,
        CompleteUpdateBodyStyleIntent,
        CompleteUpdateMaxMileageIntent,
        CompleteUpdateMaxPriceIntent,
        CompleteUpdateMinYearIntent,
        CompleteUpdateCityIntent,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
