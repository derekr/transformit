/**
 * Returns a uuid for use in transloadit assemblies.
 */
module.exports = function () {
    var uuid = '', i;
    for (i = 0; i < 32; i++) {
        uuid += Math.floor(Math.random() * 16).toString(16);
    }
    return uuid;
};
