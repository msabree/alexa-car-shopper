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

const APP_NAME = 'Car Shopper';
const LOGO_URL = 'https://s3.amazonaws.com/alexa-car-shopper/logo.png';

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const welcomeOptions = [
            `Hey, let's find you a car to buy! You can start searching when ready.`,
            `Welcome. My job is to help you find a car to buy. I'm ready when you are.`,
            `Hello and welcome to Car Shopper. The quick and easy way to browse cars for sale.`,
            `Welcome to Car Shopper. Let's get started on your car search!`,
        ];
        const speechText = welcomeOptions[Math.floor(Math.random() * welcomeOptions.length)];

      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withStandardCard(APP_NAME, speechText, LOGO_URL, LOGO_URL)
        .getResponse();
    },
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'FallbackIntent';
    },
    handle(handlerInput) {
        const speechText = `Sorry, I don't know how to help you with that. Say 'Alexa, help' for options.`;

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
            response.speak('No results found. Please try again later.');
            return response.getResponse();
        } else if (results.listings.length === 0) {
            const response = handlerInput.responseBuilder;
            response.speak('No results found. Try updating your base preferences.');
            return response.getResponse();
        } else {
            const carDetails = preferenceEngine.findTopResult(results.listings, storedUserPreferences);
            const description = get(carDetails, 'heading', 'car');
            let miles = get(carDetails, 'miles', 'Miles unknown');
            let price = get(carDetails, 'price', 'Call For Price');
            let images = get(carDetails, 'media.photo_links', [LOGO_URL]);
            const dealerPhone = get(carDetails, 'dealer.phone', 'Phone Unavailable');
            let dealerName = get(carDetails, 'dealer.name', 'Owner Unknown');
            dealerName = dealerName.toLowerCase().split(' ').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
            const dealerWebsite = get(carDetails, 'dealer.website', 'Website Unknown');
            const dealerCity = get(carDetails, 'dealer.city', 'City Unknown');
            const dealerState = get(carDetails, 'dealer.state', 'State Unknown');

            let speechText = `I found a ${description}. `;
            if (miles !== 'Miles unknown') {
                speechText += `The car has ${miles} miles on it. `;
            }
            if (price !== 'Call For Price') {
                speechText += `The sales price is $${price}. `;
            }
            speechText += `Take your time and review the photos. When ready you can say 'Alexa, save response' to save it as a like or dislike.`;

            if (price !== 'Call For Price') {
                price = `$${price}`;
            }

            if (miles !== 'Miles unknown') {
                miles = `${miles} miles`;
            }

            const showStuff = [
                `Sales Price: ${price}`,
                miles,
                `Dealer: ${dealerName}`,
                `Phone: ${dealerPhone}`,
                `Location: ${dealerCity} ${dealerState}`,
                `Website: ${dealerWebsite}`,
            ];

            await dynamoDB.lastShownCar(handlerInput.requestEnvelope, carDetails);

            if (images.length === 0) {
                images = [LOGO_URL];
            }

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
        let miles = get(carDetails, 'miles', 'miles unknown');
        let price = get(carDetails, 'price', 'Call For Price');
        const images = get(carDetails, 'media.photo_links', [LOGO_URL]);
        const dealerPhone = get(carDetails, 'dealer.phone', 'Phone Unavailable');
        let dealerName = get(carDetails, 'dealer.name', 'Owner Unknown');
        dealerName = dealerName.toLowerCase().split(' ').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');


        if (price !== 'Call For Price') {
            price = `$${price}`;
        }

        if (miles !== 'miles unknown') {
            miles = `${miles} miles`;
        }

        const showText = `
            ${description}

            ${miles} | ${price}

            Dealer: ${dealerName}

            Phone: ${dealerPhone}
        `;

        return handlerInput.responseBuilder
            .addDelegateDirective(handlerInput.requestEnvelope.request.intent)
            .withStandardCard(APP_NAME, showText, images[0], images[0])
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
        let images = [LOGO_URL];
        let showText = '';
        if (saveResponse === undefined) {
            speechText = 'Unable to determine your choice, your like and dislike history was not affected. You can continue your search as normal.';
        } else {
            // Fetch the last searched car. This will be the correct context for the response.
            const carDetails = await dynamoDB.lastShownCar(handlerInput.requestEnvelope);

            const description = get(carDetails, 'heading', 'car');
            let miles = get(carDetails, 'miles', 'miles unknown');
            let price = get(carDetails, 'price', 'price unknown');
            images = get(carDetails, 'media.photo_links', [LOGO_URL]);
            const dealerPhone = get(carDetails, 'dealer.phone', 'Phone Unavailable');
            let dealerName = get(carDetails, 'dealer.name', 'Owner Unknown');
            dealerName = dealerName.toLowerCase().split(' ').map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');

            if (price !== 'Call For Price') {
                price = `$${price}`;
            }

            if (miles !== 'miles unknown') {
                miles = `${miles} miles`;
            }

            showText = `
                ${description}
    
                ${miles} | ${price}
    
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
            .withStandardCard(APP_NAME, showText, images[0], images[0])
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
        if (make === undefined || get(slotValues, 'Make.isValidated', false) === false) {
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
    async handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const slotValues = getSlotValues(filledSlots);
        let parsedCity = get(slotValues, 'City.resolved');

        // default coords for atlanta
        let latitude = '33.6488';
        let longitude = '-84.3915';

        let speechText;
        console.log(parsedCity);
        if (parsedCity === undefined || parsedCity.split(' ').length < 2) {
            parsedCity = 'Atlanta Georgia';
            speechText = 'Unable to determine city, defaulting to Atlanta Georgia. To try again, say, Alexa update city.';
        } else {
            const states = ['Alabama', 'Alaska', 'American Samoa', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'District of Columbia', 'Federated States of Micronesia', 'Florida', 'Georgia', 'Guam', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Marshall Islands', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Northern Mariana Islands', 'Ohio', 'Oklahoma', 'Oregon', 'Palau', 'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virgin Island', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
            let stateValue = '';
            let cityValue = '';
            for (let i = 0; i < states.length; i++) {
                if (parsedCity.toLowerCase().includes(states[i].toLowerCase())) {
                    stateValue = states[i];
                    cityValue = parsedCity.toLowerCase().split(stateValue.toLowerCase())[0];
                    break;
                }
            }
            console.log(stateValue);
            console.log('trimmed-->', cityValue.trim());
            if (cityValue === '' || stateValue === '') {
                parsedCity = 'Atlanta Georgia';
                speechText = 'Unable to determine city, defaulting to Atlanta Georgia. To try again, say, Alexa update city.';
            } else {
                const location = zipcodes.lookupByName(cityValue.trim(), stateValue.trim())[0];
                latitude = get(location, 'latitude');
                longitude = get(location, 'longitude');

                if (latitude === undefined || longitude === undefined) {
                    latitude = '33.6488';
                    longitude = '-84.3915';
                    parsedCity = 'Atlanta Georgia';
                    speechText = 'Unable to determine city, setting to Atlanta Georgia. To try again, say, Alexa update search city.';
                } else {
                    speechText = `I will search for cars within a 50 mile radius of ${parsedCity}. Your preferences will be updated.`;
                }
            }
        }

        // Update the user's preferences
        console.log(latitude, longitude, parsedCity);
        await dynamoDB.saveUserBasePreferencesV2(handlerInput.requestEnvelope, 'add', [
            {
                attributeValueType: 'string',
                attributeKey: 'latitude',
                attributeValue: latitude,
            },
            {
                attributeValueType: 'string',
                attributeKey: 'longitude',
                attributeValue: longitude,
            },
            {
                attributeValueType: 'string',
                attributeKey: 'cityState',
                attributeValue: parsedCity,
            },
        ]);

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

        if (carCondition === undefined || get(slotValues, 'CarCondition.isValidated', false) === false) {
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

        if (bodyStyle === undefined || get(slotValues, 'BodyStyle.isValidated', false) === false) {
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

      if (maxPrice === undefined || get(slotValues, 'MaxPrice.isValidated', false) === false) {
          speechText = 'Unable to understand max price request. To try again, say, Alexa update max price.';
      } else if (maxPrice < 0 || maxPrice > 500) {
        speechText = 'Max price in thousands must be between 1 and 500.';
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

        if (maxMileage === undefined || get(slotValues, 'MaxMileage.isValidated', false) === false) {
            speechText = 'Unable to understand max mileage request. To try again, say, Alexa update max mileage.';
        } else if (maxMileage < 0 || maxMileage > 300) {
            speechText = 'Max mileage in thousands must be between 1 and 300.';
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

        if (minYear === undefined || get(slotValues, 'MinYear.isValidated', false) === false) {
            speechText = 'Unable to understand minimum year request. To try again, say, Alexa update min year.';
        } else if (minYear < 1981 || minYear > 2020) {
            speechText = 'Min year be between 1981 and 2020.';
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

// Show preferences
const ShowBasePreferencesIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
          && handlerInput.requestEnvelope.request.intent.name === 'ShowBasePreferencesIntent';
      },
      async handle(handlerInput) {
        const savedUserPreferences = await dynamoDB.getStoredUserPreferences(handlerInput.requestEnvelope);
        const basePreferences = get(savedUserPreferences, 'basePreferences', {});
        const cityState = get(basePreferences, 'cityState');
        const bodyStyles = get(basePreferences, 'bodyStyles');
        const minYear = get(basePreferences, 'minYear');
        const condition = get(basePreferences, 'condition');
        const maxPrice = get(basePreferences, 'maxPrice');
        const maxMileage = get(basePreferences, 'maxMileage');
        const makes = get(basePreferences, 'make');

        let speechText = '';
        if (cityState !== undefined) {
            speechText += `You are searching for cars in ${cityState}. `;
        }
        if (bodyStyles !== undefined) {
            speechText += `You are searching for body styles of types ${bodyStyles.join(', ')}. `;
        }
        if (minYear !== undefined) {
            speechText += `You are searching for cars with a min year of ${minYear}. `;
        }
        if (condition !== undefined) {
            speechText += `You are searching for ${condition} cars. `;
        }
        if (maxPrice !== undefined) {
            speechText += `You are searching for cars with a max price of $${maxPrice}. `;
        }
        if (maxMileage !== undefined) {
            speechText += `You are searching for cars with a max mileage of ${maxMileage}. `;
        }
        if (makes !== undefined) {
            speechText += `You are searching for cars of types ${makes.join(', ')}. `;
        }

        if (speechText === '') {
            speechText = 'You do not have any stored preferences';
        }

        return handlerInput.responseBuilder
            .speak(speechText)
            .withStandardCard(APP_NAME, speechText, LOGO_URL, LOGO_URL)
            .getResponse();
      },
};

// Clear preferences
// ...


const ClearBodyStylesIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
          && handlerInput.requestEnvelope.request.intent.name === 'ClearBodyStylesIntent';
      },
      async handle(handlerInput) {
          await dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'clearAll', 'string', 'bodyStyles');
          const speechText = 'Body styles have been cleared. You can begin again when ready.';

          return handlerInput.responseBuilder
              .speak(speechText)
              .withStandardCard(APP_NAME, speechText, LOGO_URL, LOGO_URL)
              .getResponse();
      },
};

const ClearMinYearIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
          && handlerInput.requestEnvelope.request.intent.name === 'ClearMinYearIntent';
      },
      async handle(handlerInput) {
          await dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'clearAll', 'string', 'minYear');
          const speechText = 'Min year has been cleared. You can begin again when ready.';

          return handlerInput.responseBuilder
              .speak(speechText)
              .withStandardCard(APP_NAME, speechText, LOGO_URL, LOGO_URL)
              .getResponse();
      },
};

const ClearConditionsIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
          && handlerInput.requestEnvelope.request.intent.name === 'ClearConditionsIntent';
      },
      async handle(handlerInput) {
          await dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'clearAll', 'string', 'condition');
          const speechText = 'Car conditions have been cleared. You can begin again when ready.';

          return handlerInput.responseBuilder
              .speak(speechText)
              .withStandardCard(APP_NAME, speechText, LOGO_URL, LOGO_URL)
              .getResponse();
      },
};

const ClearMaxPriceIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
          && handlerInput.requestEnvelope.request.intent.name === 'ClearMaxPriceIntent';
      },
      async handle(handlerInput) {
          await dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'clearAll', 'string', 'maxPrice');
          const speechText = 'Max price has been cleared. You can begin again when ready.';

          return handlerInput.responseBuilder
              .speak(speechText)
              .withStandardCard(APP_NAME, speechText, LOGO_URL, LOGO_URL)
              .getResponse();
      },
};

const ClearMaxMileageIntent = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
          && handlerInput.requestEnvelope.request.intent.name === 'ClearMaxMileageIntent';
      },
      async handle(handlerInput) {
          await dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'clearAll', 'string', 'maxMileage');
          const speechText = 'Max mileage has been cleared. You can begin again when ready.';

          return handlerInput.responseBuilder
              .speak(speechText)
              .withStandardCard(APP_NAME, speechText, LOGO_URL, LOGO_URL)
              .getResponse();
      },
};

const ClearMakesIntent = {
    canHandle(handlerInput) {
      return handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'ClearMakesIntent';
    },
    async handle(handlerInput) {
        await dynamoDB.saveUserBasePreferences(handlerInput.requestEnvelope, 'clearAll', 'array', 'make');
        const speechText = 'Makes have been cleared. You can begin again when ready.';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withStandardCard(APP_NAME, speechText, LOGO_URL, LOGO_URL)
            .getResponse();
    },
};


// Danger zone. Reset app entirely. No confirmation
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
        const speechText = 'Your preferences are saved. You can resume when ready.';

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
        console.log(error);
        console.log(`Error handled: ${error.message}`);

        return handlerInput.responseBuilder
            .speak(`I'm not sure what you said. Please try again.`)
            .reprompt(`I didn't quite catch that last request. Please try again.`)
            .getResponse();
    },
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        FallbackIntentHandler,
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
        ClearBodyStylesIntent,
        ClearMinYearIntent,
        ClearMinYearIntent,
        ClearConditionsIntent,
        ClearMaxPriceIntent,
        ClearMaxMileageIntent,
        ClearMakesIntent,
        ShowBasePreferencesIntent,
        ResetAppDataIntent,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .lambda();
