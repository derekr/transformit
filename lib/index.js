/**
 * Module for async transloadit jobs.
 * It attempts to mimic the transloadit jquery plugin where it makes sense.
 *
 * @notes Currently relies on a global instance of $.jsonp
 *
 * @params {string} key - Creates a factory for Transformit instances
 *
 * @package transformit
 * @author Derek Reynolds <drk@diy.org>
 */

/**
 * Dependencies
 */
var events             = require('events');
var asyncf             = require('async-form');
var util               = require('util');

/**
 * Lib
 */
var fetchBoredInstance = require('./bored-instance');
var createAssemblyId   = require('./create-assembly-id');
var pulser             = require('./pulser');

/**
 * Constants
 */
var PROTOCOL = (document.location.protocol === 'https:') ? 'https://' : 'http://';

/**
 * Constructor
 *
 * @param {object} $form - Can be an instance of FormData or a form element
 * @param {object} options
 *   service: the transloadit service to submit/poll
 *   fields: any additional fields to send along w/ the form submission
 *   params: transloadit request params
 *     auth: { public_key }
 *     encoder_key:
 *   templateId: A string or synchronous function that returns a template id
 *   trigger: String or boolean. False will not autosubmit. ('submit', 'change')
 *   interval: how often in poll assembly url in ms
 *   timeout: how long before submit/poll request times out
 */
function Transformit ($form, options) {
    this.$form   = $form;

    // set options
    this.service     = options.service || PROTOCOL + 'api2.transloadit.com';
    this.fields      = options.fields  || true;
    this.params      = options.params  || {};
    this.signature   = options.signature || null;
    this.templateId  = options.templateId || '';
    this.trigger     = options.trigger || 'submit'; // false, 'submit' || 'change'

    // proxy to transpulser when required
    this.interval = parseInt(options.interval, 10) || 2500;
    this.timeout  = parseInt(options.timeout, 10)  || 8000;
    this.notFoundAttempts = 15;
    this.connectionAttempts = 15;

    this.seq = 0;

    this.bindDomListeners();
    this.appendFields(this.fields);
}

/**
 * Inherits
 */
util.inherits(Transformit, events.EventEmitter);

/**
 * Will bind 'submit' or 'change' handlers on the provided
 * form depending on options.trigger. This is only relevant if $form
 * is an actual form element.
 */
Transformit.prototype.bindDomListeners = function () {
    var me = this;

    // Bow out
    if (!this.trigger || this.$form instanceof FormData) return;

    // Submit
    if (this.trigger === 'submit') {
        this.$form.onsubmit = function submitHandler (e) {
            e.preventDefault();
            e.stopPropagation();
            me.upload();
            return false;
        };
    }
    
    // Change
    function changeHandler () {
        me.upload();
    }

    if (this.trigger === 'change') {
        var $inputs = this.$form.querySelectorAll('input[type=file]');
        if ($inputs.length <= 0) return;

        for (var i = 0; i <= $inputs.length; i++) {
            $inputs[0].addEventListener(changeHandler);
        }
    }
};

/**
 * Asynchronously uploads the files contained in the form.
 * 
 * @param {function} callback
 */
Transformit.prototype.upload = function (callback) {
    var me = this;

    function handleBoredInstance (err, instance) {
        me.sendForm(PROTOCOL + instance, callback);
    }

    fetchBoredInstance(this.service, handleBoredInstance);
};

/**
 * Asynchronously sends $form to transloadit. This is dependent on 
 * having a bored instance url.
 *
 * @notes: https://github.com/transloadit/jquery-sdk/blob/master/js/lib/jquery.transloadit2.js#L126-L164
 *
 * @param {string} instance - Bored instance url
 * @param {function} callback 
 */
Transformit.prototype.sendForm = function (instance, callback) {
    var me = this;
    var id = createAssemblyId();
    var assemblyUrl = instance + '/assemblies/' + id;

    asyncf(this.$form, {
        'action': assemblyUrl + '?redirect=false',
        'body': {
            'params': JSON.stringify(this.getParams())
        },
        'success': function asyncSuccess (err, res, body) {
            if (err) {
                callback(err);
                return me.emit('error', err);
            }
            callback(null, res, body);
        },
        'error': function asyncError (err) {
            me.emit('error', err);
            callback(err);
        }
    });

    me.startPulse(assemblyUrl);
};

/**
 * Creates a new pulse instance for the given assembly url and 
 * proxies all the relevent events.
 *
 * @param {string} assymblyUrl
 */
Transformit.prototype.startPulse = function (assemblyUrl) {
    var me = this;

    this.pulse = pulser(assemblyUrl, { service: this.service });

    this.pulse.on('success', function (assembly) {
        me.emit('success', assembly);
    });
    this.pulse.on('error', function (err) {
        me.emit('error', err);
    });
    this.pulse.on('progress', function (received, expected, assembly) {
        me.emit('progress', received, expected, assembly);
    });

    // Asynchronously kick off the pulse process w/ noop callback
    this.pulse.start(function () {  });
};

/**
 * Getter for params.
 *
 * @param {File} file - File being uploaded (for calculating template id)
 */
Transformit.prototype.getParams = function (file) {
    this.params.auth = { key: this.key };
    this.params.template_id = this.getTemplateId(file);

    return this.params;
};

/**
 * Returns template id based on options.templateId.
 *
 * If `options.templateId` is a function it will be provided the File object as 
 * the first argument w/ the Transformit instance as the context.
 * 
 * @param {File} file - File being uploaded.
 */
Transformit.prototype.getTemplateId = function (file) {
    var id = '';

    if (typeof this.templateId === 'function') id = this.templateId.apply(this, [file]);

    if (typeof this.templateId === 'string') id = this.templateId;

    if (typeof id !== 'string') this.emit('error', 'templateId must yield a string. Got: ', typeof id, id);

    return id;
};

/**
 * Dynamically append a field to the form after Transformit has been 
 * instantiated.
 *
 * @param {string} fieldName
 * @param {string} val
 */
Transformit.prototype.appendField = function (fieldName, val) {
    if (this.$form.tagName === 'FORM') {
        var $field = document.createElement('input');
        $field.value = val;
        this.$form.appendChild($field);
    } 
    
    if (this.$form instanceof FormData) this.$form.append(fieldName, val);
};

/**
 * Convenience wrapper for appending multiple fields.
 */
Transformit.prototype.appendFields = function (fields) {
    for (var name in fields) {
        this.appendField(name, fields[name]);
    }
};

/**
 * Export
 */
var transformit = function (key) {
    Transformit.prototype.key = key || '';

    return function createTransformitInstance ($form, options) {
        return new Transformit($form, options);
    };
};

/**
 * Export pulser to allow use outside of Transformit instance.
 */
transformit.pulser = pulser;

module.exports = transformit;
