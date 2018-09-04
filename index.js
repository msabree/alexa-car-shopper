/* eslint max-len: 0 */
/* eslint-disable  func-names */
/* eslint-disable  no-console */
/* eslint-disable  no-restricted-syntax */
const Alexa = require('ask-sdk-core');
const zipcodes = require('zipcodes');
const get = require('lodash/get');
const carApiSearch = require('./helper/carSearchApi');
const getSlotValues = require('./helper/getSlotValues');
const dynamoDB = require('./helper/dynamoDB');

const APP_NAME = 'Alexa - Car Shopper';
const LOGO_URL = 'https://s3.amazonaws.com/alexa-car-shopper/logo.png';

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
        .withStandardCard(APP_NAME, speechText, LOGO_URL, LOGO_URL)
        .getResponse();
    },
};

const SearchCarsNowIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'SearchCarsNowIntent';
    },
    async handle(handlerInput) {
        const storedUserPreferences = await dynamoDB.getStoredUserPreferences(handlerInput.requestEnvelope);

        // increment by 100 if no results found
        const startIndex = 0;

        // Perform car search
        // returns static data for testing
        const results = carApiSearch(storedUserPreferences, startIndex);

        const carDetails = results.alphaShowcase[Math.floor(Math.random() * results.alphaShowcase.length)];

        const description = get(carDetails, 'description.label', 'car');
        const miles = get(carDetails, 'specifications.mileage.value', 'miles unknown');
        const price = get(carDetails, 'pricingDetail.salePrice', 'price unknown');
        const imageText = get(carDetails, 'images.sources[0].title', '');
        const imageSrc = get(carDetails, 'images.sources[0].src', '');
        const ownerPhone = get(carDetails, 'owner.phone.value', 'Phone Unavailable');
        const ownerText = get(carDetails, 'owner.name', 'Owner Unknown');

        const speechText = `
            I found a ${description} with ${miles} miles for a sales price of $${price}.
            To add this car to your like or dislike history you can say 'save response'.
            Otherwise you can continue searching or exit the app.
        `;

        const showText = `
            ${imageText}

            ${miles} miles | $${price}

            ${ownerText}

            Phone: ${ownerPhone}
        `;

        await dynamoDB.lastShownCar(handlerInput.requestEnvelope, carDetails);

        return handlerInput.responseBuilder
            .speak(speechText)
            .withStandardCard(APP_NAME, showText, imageSrc, imageSrc)
            .getResponse();
    },
};

const SaveResponseIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'SaveResponseIntent'
        && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    handle(handlerInput) {
      return handlerInput.responseBuilder
        .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
        .getResponse();
    },
};

const CompleteSaveResponseIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'SaveResponseIntent';
    },
    async handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const slotValues = getSlotValues(filledSlots);
        const saveResponse = get(slotValues, 'SaveResponse.resolved');
        let speechText;
        if (saveResponse === undefined) {
            speechText = 'Unable to determine your choice, your like and dislike history was not affected. You can continue your search as normal.';
        } else {
            // Fetch the last searched car. This will be the correct context for the response.
            const carDetails = await dynamoDB.lastShownCar(handlerInput.requestEnvelope);
            console.log(carDetails);

            if (saveResponse === 'yes') {
                // Update the user's preferences
                speechText = 'This vehicle has been saved to your liked history. You can continue searching when ready.';
                dynamoDB.updateCarSearchHistory(handlerInput.requestEnvelope, 'likes', carDetails);
            } else if (saveResponse === 'no') {
                speechText = 'Dislike confirmed. I will use that to show you better cars next time. You can continue searching when ready.';
                dynamoDB.updateCarSearchHistory(handlerInput.requestEnvelope, 'dislikes', carDetails);
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
            speechText = `You have requested to search for cars made by ${make}. Your preferences will be updated.`;

            // Update the user's preferences
            dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'add', 'array', 'make', make);
        }

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
            dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'add', 'string', 'condition', carCondition);
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

// Danger zone. Reset app entirely. Require confirmation
const ResetAppDataIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'ResetAppDataIntent';
    },
    async handle(handlerInput) {
        await dynamoDB.resetAppData(handlerInput.requestEnvelope);

        const speechText = 'Your app data has been cleared. You can begin again when ready.';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withStandardCard(APP_NAME, speechText, LOGO_URL, LOGO_URL)
            .getResponse();
    },
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
      const speechText = `
        Example phrases:
        
        At any time, to start the app, say 'Alexa, Start Car Shopper.'

        To perform a car search, say 'Alexa, search now.'

        To update preferences you can say things like, 'Alexa, update city.'
      `;

      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withStandardCard(APP_NAME, speechText, LOGO_URL, LOGO_URL)
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
        const speechText = 'Your preferences are saved. You can resume your search where you left off. Good bye!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withStandardCard(APP_NAME, speechText, LOGO_URL, LOGO_URL)
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
        SaveResponseIntent,
        CompleteSaveResponseIntent,
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
        ResetAppDataIntent,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
