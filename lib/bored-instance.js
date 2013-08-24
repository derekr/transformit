var xhr = require('xhr');

module.exports = function fetchBoredInstance (service, callback) {
    xhr({
        'uri': service + '/instances/bored'
    }, function (err, res, body) {
        var instance = JSON.parse(body);

        if (instance.error) return callback(instance.error);

        callback(null, instance.api2_host);
    });
};
