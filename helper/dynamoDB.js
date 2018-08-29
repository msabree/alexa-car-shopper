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
 * @param {String} attributeValueType - 'number', 'string', 'array'
 * @param {*} attributeKey
 * @param {*} attributeValue
 */
const saveUserBasePreferences = (requestEnvelope, action = 'add', attributeValueType, attributeKey, attributeValue) => {
    getStoredUserPreferences(requestEnvelope)
    .then((storedUserPreferences) => {
        console.log(storedUserPreferences);
        const basePreferencesPath = 'basePreferences';
        let clonedStoredUserPreferences = cloneDeep(storedUserPreferences);
        let storedAttributeValue = get(storedUserPreferences, attributeKey);

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
                set(clonedStoredUserPreferences, [basePreferencesPath, attributeKey], attributeValue);
            }
        } else if (action === 'clear') {
            if (attributeValueType === 'array') {
                set(clonedStoredUserPreferences, [basePreferencesPath, attributeKey], storedAttributeValue.filter((item) => item !== attributeValue));
            } else {
                delete clonedStoredUserPreferences[attributeKey];
            }
        } else if (action === 'clearAll') {
            delete clonedStoredUserPreferences[attributeKey];
        }

        return dynamoDbPersistenceAdapter.saveAttributes(requestEnvelope, clonedStoredUserPreferences);
    })
    .catch((err) => {
        console.log(err.message);
        return Promise.reject(err);
    });
};

// The userId is embedded in the requestEnvelope by default.
const getStoredUserPreferences = (requestEnvelope) => {
    return new Promise((resolve, reject) => {
        const getAttributesPromise = dynamoDbPersistenceAdapter.getAttributes(requestEnvelope);
        getAttributesPromise.then((storedUserPreferences) => {
            resolve(storedUserPreferences);
        })
        .catch((err) => {
            console.log(err);
            reject(err);
        });
    });
};

module.exports = {
    saveUserBasePreferences,
    getStoredUserPreferences,
};
