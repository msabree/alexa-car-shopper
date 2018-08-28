/* eslint max-len: 0 */
const get = require('lodash/get');

module.exports = (requestEnvelope) => {
    return get(requestEnvelope, 'context.System.device.deviceId', 'this_is_not_a_real_id');
};
