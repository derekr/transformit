/**
 * Asynchronously fetches a bored instance for a specific transloadit worker server
 * and passes on the url.
 *
 * @param {string} service - Transloadit service url
 * @param {function} callback
 */
module.exports = function (service, callback) {
    $.jsonp({
        url: service + '/instances/bored',
        timeout: 8000,
        callbackParameter: 'callback',
        success: function (instance) {
            callback(null, instance.api2_host);
        },

        error: function (xhr, status) {
            callback(status);
        }
    });
};
