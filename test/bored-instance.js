/**
 * Test suite
 *
 * @package transformit
 * @author drk <drk@diy.org>
 */

/**
 * Dependencies
 */
var test    = require('tape').test;

var fetchBoredInstance = require('../lib/bored-instance.js');

test('bored instance', function (t) {
    t.plan(1);

    fetchBoredInstance('http://api2.transloadit.com', function (err, instance) {
        t.ok(instance, 'Returned a string');
    });
});
