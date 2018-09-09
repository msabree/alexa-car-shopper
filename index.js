/* eslint max-len: 0 */
/* eslint-disable  func-names */
/* eslint-disable  no-console */
/* eslint-disable  no-restricted-syntax */
const Alexa = require('ask-sdk');
const zipcodes = require('zipcodes');
const get = require('lodash/get');
const carApiSearch = require('./helper/carSearchApi');
const getSlotValues = require('./helper/getSlotValues');
const dynamoDB = require('./helper/dynamoDB');
const preferenceEngine = require('./helper/preferenceEngine');
const supportsDisplay = require('./helper/supportsDisplay');

const APP_NAME = 'Alexa - Car Shopper';
const LOGO_URL = 'https://s3.amazonaws.com/alexa-car-shopper/logo.png';

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const welcomeOptions = [
            `Hey, let's find you a car to buy! You can start searching when ready.`,
            `Welcome. My job is to help you find a car to buy. I'm ready when you are.`,
            `Hello and welcome to Alexa Car Shopper. The quick and easy way to browse cars for sale.`,
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
        const results = await carApiSearch(storedUserPreferences, startIndex);

        if (results.error !== undefined) {
            const response = handlerInput.responseBuilder;
            response.speak('An error occurred while tryng to fetch cars. Please try again later.');
            return response.getResponse();
        } else {
            const carDetails = preferenceEngine.findTopResult(results.listings, storedUserPreferences);
            const description = get(carDetails, 'heading', 'car');
            const miles = get(carDetails, 'miles', 'Miles unknown');
            const price = get(carDetails, 'price', 'Price unknown');
            const images = get(carDetails, 'media.photo_links', [LOGO_URL]);
            const dealerPhone = get(carDetails, 'dealer.phone', 'Phone Unavailable');
            let dealerName = get(carDetails, 'dealer.name', 'Owner Unknown');
            dealerName = dealerName.toLowerCase().split(' ').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
            const dealerWebsite = get(carDetails, 'dealer.website', 'Website Unknown');
            const dealerCity = get(carDetails, 'dealer.city', 'City Unknown');
            const dealerState = get(carDetails, 'dealer.state', 'State Unknown');

            const speechText = `
                I found a ${description} with ${miles} miles for a sales price of $${price}.
                To add this car to your like or dislike history you can say 'save response'.
                Otherwise you can continue searching or exit the app.
            `;

            const showStuff = [
                description,
                `${miles} miles`,
                `Sales Price $${price}`,
                `Dealer: ${dealerName}`,
                `Phone: ${dealerPhone}`,
                `Website: ${dealerWebsite}`,
                `Location: ${dealerCity} ${dealerState}`,
            ];

            await dynamoDB.lastShownCar(handlerInput.requestEnvelope, carDetails);

            const response = handlerInput.responseBuilder;
            response.speak(speechText);
            if (supportsDisplay(handlerInput)) {
                response.addRenderTemplateDirective({
                    type: 'ListTemplate2',
                    token: 'string',
                    backButton: 'HIDDEN',
                    title: description,
                    listItems: images.map((image, index) => {
                        return {
                            token: 'string',
                            textContent: new Alexa.RichTextContentHelper()
                                .withPrimaryText(get(showStuff, index, 'Car Photo'))
                                .getTextContent(),
                            image: new Alexa.ImageHelper()
                            .addImageInstance(image)
                            .getImage(),
                        };
                    }),
                });
            }
            return response.getResponse();
        }
    },
};

const SaveResponseIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'SaveResponseIntent'
        && handlerInput.requestEnvelope.request.dialogState !== 'COMPLETED';
    },
    async handle(handlerInput) {
        const carDetails = await dynamoDB.lastShownCar(handlerInput.requestEnvelope);

        const description = get(carDetails, 'heading', 'car');
        const miles = get(carDetails, 'miles', 'miles unknown');
        const price = get(carDetails, 'price', 'price unknown');
        const images = get(carDetails, 'media.photo_links', [LOGO_URL, LOGO_URL]);
        const dealerPhone = get(carDetails, 'dealer.phone', 'Phone Unavailable');
        let dealerName = get(carDetails, 'dealer.name', 'Owner Unknown');
        dealerName = dealerName.toLowerCase().split(' ').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');

        const showText = `
            ${description}

            ${miles} miles | $${price}

            Dealer: ${dealerName}

            Phone: ${dealerPhone}
        `;

        return handlerInput.responseBuilder
            .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
            .withStandardCard(APP_NAME, showText, images[1], images[1])
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
        let images = [LOGO_URL, LOGO_URL, LOGO_URL];
        let showText = '';
        if (saveResponse === undefined) {
            speechText = 'Unable to determine your choice, your like and dislike history was not affected. You can continue your search as normal.';
        } else {
            // Fetch the last searched car. This will be the correct context for the response.
            const carDetails = await dynamoDB.lastShownCar(handlerInput.requestEnvelope);

            const description = get(carDetails, 'heading', 'car');
            const miles = get(carDetails, 'miles', 'miles unknown');
            const price = get(carDetails, 'price', 'price unknown');
            images = get(carDetails, 'media.photo_links', []);
            const dealerPhone = get(carDetails, 'dealer.phone', 'Phone Unavailable');
            let dealerName = get(carDetails, 'dealer.name', 'Owner Unknown');
            dealerName = dealerName.toLowerCase().split(' ').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');

            showText = `
                ${description}
    
                ${miles} miles | $${price}
    
                Dealer: ${dealerName}
    
                Phone: ${dealerPhone}
            `;

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
            .withStandardCard(APP_NAME, showText, images[2], images[2])
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

// Show the user all of the cars that they've liked
const ShowAllLikedCarsIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
          && handlerInput.requestEnvelope.request.intent.name === 'ShowAllLikedCarsIntent';
      },
      async handle(handlerInput) {
          const storedUserPreferences = await dynamoDB.getStoredUserPreferences(handlerInput.requestEnvelope);
          const speechText = 'Here are all the cars you have liked';
          const likedCars = get(storedUserPreferences, 'likes', []);
          console.log(likedCars);
          const response = handlerInput.responseBuilder;

          if (likedCars.length === 0) {
            response.speak('No saved cars found.');
            return response.getResponse();
          } else {
            response.speak(speechText);
            if (supportsDisplay(handlerInput)) {
                response.addRenderTemplateDirective({
                    type: 'ListTemplate2',
                    token: 'string',
                    backButton: 'HIDDEN',
                    title: 'Car Like History',
                    listItems: likedCars.map((car) => {
                        return {
                            token: 'string',
                            textContent: new Alexa.RichTextContentHelper()
                                .withPrimaryText(`${get(car, 'heading', '')} | ${get(car, 'dealer.website')}`)
                                .getTextContent(),
                            image: new Alexa.ImageHelper()
                            .addImageInstance(get(car, 'media.photo_links[0]', ''))
                            .getImage(),
                        };
                    }),
                });
            }
            return response.getResponse();
          }
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
        ShowAllLikedCarsIntent,
        ResetAppDataIntent,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
