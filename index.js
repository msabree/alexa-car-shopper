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
            `Ready to buy a car? I can help!`,
            `Welcome to Alexa Car Shopper. Let's get started on your car search!`,
        ];
        const speechText = welcomeOptions[Math.floor(Math.random() * welcomeOptions.length)];

      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard(APP_NAME, speechText)
        .getResponse();
    },
};

const SearchCarsNowIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'SearchCarsNowIntent';
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

        const speechText = `I found a ${description} with ${miles} miles at ${price} dollars. Would you like me to send you the full description?`;

      return handlerInput.responseBuilder
        .speak(speechText)
        .withSimpleCard(APP_NAME, speechText)
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

    // Get stored user preferences whenever doing an update.

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
                speechText = 'Unable to determine city, defaulting to Atlanta Georgia. To try again, say, Alexa update search city.';
            } else {
                speechText = `You have requested ${city} which maps to zipcode ${zip}. Your preferences will be updated.`;
            }
        }

        // Update the user's preferences
        dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'add', 'number', 'zip', zip);

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
        const speechText = `You have requested ${carCondition}. Your preferences will be updated.`;

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
        const speechText = `You have requested ${bodyStyle}. Your preferences will be updated.`;

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
      const speechText = `Your preferencs have been updated. Say 'Aexa, find my car now' to start searching!`;
      const filledSlots = handlerInput.requestEnvelope.request.intent.slots;

      console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);

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
      const speechText = `Your preferencs have been updated. Say 'Aexa, find my car now' to start searching!`;
      const filledSlots = handlerInput.requestEnvelope.request.intent.slots;

      console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);

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
      const speechText = `Your preferencs have been updated. Say 'Aexa, find my car now' to start searching!`;
      const filledSlots = handlerInput.requestEnvelope.request.intent.slots;

      console.log(`The filled slots: ${JSON.stringify(filledSlots)}`);

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
      const speechText = 'Sorry, I am new to this.!';

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
