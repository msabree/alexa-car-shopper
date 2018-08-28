/* eslint max-len: 0 */
/* eslint max-len: 0 */
const { DynamoDbPersistenceAdapter } = require('ask-sdk-dynamodb-persistence-adapter');
const dynamoDbPersistenceAdapter = new DynamoDbPersistenceAdapter({
    tableName: 'Alexa-Car-Shopper',
    partitionKeyName: 'user-car-preferences',
});

// async, but do we care?
// it should finish eventually
// do we care about unresolved promises in lamdas?
const writeItem = (requestEnvelope, attributesObject) => {
    dynamoDbPersistenceAdapter.saveAttributes(requestEnvelope, attributesObject);
};

const readItem = () => {};

module.exports = {
    writeItem,
    readItem,
};
