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

var transformit  = require('../lib/index.js')('key');

test('transformit create', function (t) {
    t.plan(1);

    var $form = document.createElement('form');
    t.equals(transformit($form, {}).constructor.name, 'Transformit', 'create should return Transformit');
});
