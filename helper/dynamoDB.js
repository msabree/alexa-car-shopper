/* eslint max-len: 0 */
const extractDeviceId = require('./extractDeviceId');
const {DynamoDbPersistenceAdapter} = require('ask-sdk-dynamodb-persistence-adapter');
const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({
    tableName: 'Alexa-Car-Shopper',
    partitionKeyName: 'user-car-preferences',
});

// async, but do we care?
// it should finish eventually
// do we care about unresolved promises in lamdas?
const saveUserPreferences = (requestEnvelope, attributesObject) => {
    // pull existing and combine/update before saving
    dynamoDbPersistenceAdapter.saveAttributes(requestEnvelope, attributesObject);
};

// match attribute is an object -> {deviceId}
const getStoredUserPreferences = (requestEnvelope) => {
    console.log(JSON.stringify(requestEnvelope));
    return new Promise((resolve) => {
        const deviceId = extractDeviceId(requestEnvelope);
        const getAttributesPromise = dynamoDbPersistenceAdapter.getAttributes(requestEnvelope);
        // Returns the entire database?
        getAttributesPromise.then((attributesArray) => {
            console.log(attributesArray.filter((item) => item.deviceId !== deviceId));
            console.log(attributesArray.filter((item) => item.deviceId === deviceId));
            resolve(attributesArray.filter((item) => item.deviceId === deviceId));
        });
    });
};

module.exports = {
    saveUserPreferences,
    getStoredUserPreferences,
};
