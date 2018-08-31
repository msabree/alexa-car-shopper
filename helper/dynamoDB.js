/* eslint max-len: 0 */
const get = require('lodash/get');
const set = require('lodash/set');
const cloneDeep = require('lodash/cloneDeep');
const {DynamoDbPersistenceAdapter} = require('ask-sdk-dynamodb-persistence-adapter');
const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({
    tableName: 'Alexa-Car-Shopper',
    partitionKeyName: 'userId',
});

/**
 *
 * @param {*} requestEnvelope
 * @param {String} action - 'add', 'clear', 'clearAll'
 * @param {String} attributeValueType - 'string', 'array'
 * @param {*} attributeKey
 * @param {*} attributeValue
 */
const saveUserBasePreferences = (requestEnvelope, action = 'add', attributeValueType, attributeKey, attributeValue) => {
    getStoredUserPreferences(requestEnvelope)
    .then((storedUserPreferences) => {
        console.log(storedUserPreferences);
        const basePreferencesPath = 'basePreferences';
        let clonedStoredUserPreferences = cloneDeep(storedUserPreferences);
        let storedAttributeValue = get(clonedStoredUserPreferences, [basePreferencesPath, attributeKey]);

        console.log(action, attributeKey, attributeValue);

        if (action === 'add') {
            if (storedAttributeValue === undefined) {
                if (attributeValueType === 'array') {
                    set(clonedStoredUserPreferences, [basePreferencesPath, attributeKey], [attributeValue]);
                } else {
                    set(clonedStoredUserPreferences, [basePreferencesPath, attributeKey], attributeValue);
                }
            } else {
                if (attributeValueType === 'array') {
                    storedAttributeValue.push(attributeValue);
                } else {
                    storedAttributeValue = attributeValue;
                }
                set(clonedStoredUserPreferences, [basePreferencesPath, attributeKey], storedAttributeValue);
            }
        } else if (action === 'clear') {
            if (attributeValueType === 'array') {
                set(clonedStoredUserPreferences, [basePreferencesPath, attributeKey], storedAttributeValue.filter((item) => item !== attributeValue));
            } else {
                delete clonedStoredUserPreferences[basePreferences][attributeKey];
            }
        } else if (action === 'clearAll') {
            delete clonedStoredUserPreferences[basePreferences][attributeKey];
        }

        return dynamoDbPersistenceAdapter.saveAttributes(requestEnvelope, clonedStoredUserPreferences);
    })
    .catch((err) => {
        return Promise.reject(err);
    });
};

// Update likes/dislikes -> this will make our algorithm preference engine smarter
const updateCarSearchHistory = (requestEnvelope, carResponseType, objCarDetails) => {
    getStoredUserPreferences(requestEnvelope)
    .then((storedUserPreferences) => {
        let clonedStoredUserPreferences = cloneDeep(storedUserPreferences);
        let savedCollection = get(clonedStoredUserPreferences, carResponseType, []);
        savedCollection.push(objCarDetails);
        set(clonedStoredUserPreferences, carResponseType, savedCollection);
        return dynamoDbPersistenceAdapter.saveAttributes(requestEnvelope, clonedStoredUserPreferences);
    })
    .catch((err) => {
        return Promise.reject(err);
    });
};

// Get/Set last shown car -> hack for temporary persistence between intents
const lastShownCar = (requestEnvelope, objCarDetails) => {
    getStoredUserPreferences(requestEnvelope)
    .then((storedUserPreferences) => {
        let clonedStoredUserPreferences = cloneDeep(storedUserPreferences);
        if (objCarDetails === undefined) {
            // Getter
            return Promise.resolve(get(clonedStoredUserPreferences, 'lastShownCar'));
        } else {
            // Setter
            set(clonedStoredUserPreferences, 'lastShownCar', objCarDetails);
            return dynamoDbPersistenceAdapter.saveAttributes(requestEnvelope, clonedStoredUserPreferences);
        }
    })
    .catch((err) => {
        return Promise.reject(err);
    });
};

// The userId is embedded in the requestEnvelope by default.
const getStoredUserPreferences = (requestEnvelope) => {
    return new Promise((resolve, reject) => {
        dynamoDbPersistenceAdapter.getAttributes(requestEnvelope).then((storedUserPreferences) => {
            resolve(storedUserPreferences);
        })
        .catch((err) => {
            console.log(err);
            reject(err);
        });
    });
};

module.exports = {
    lastShownCar,
    saveUserBasePreferences,
    updateCarSearchHistory,
    getStoredUserPreferences,
};
