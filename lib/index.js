/**
 * Module for async transloadit jobs.
 *
 * @package transformit
 * @author drk <drk@diy.org>
 */

var Emitter            = require('events').EventEmitter;
var inherits           = require('util').inherits;
var xhr                = require('xhr');
var asyncf             = require('async-form');

var fetchBoredInstance = require('./bored-instance');
var createAssemblyId   = require('./create-assembly-id');

var PROTOCOL = (document.location.protocol == 'https:') ? 'https://' : 'http://';

function fnStub () {}

/**
 * Constructor
 */
function Transformit ($form, options) {
    this.$form   = $form; // can be either FormData or form element?

    // set options
    this.service     = options.service || PROTOCOL + 'api2.transloadit.com';
    this.fields      = options.fields  || true;
    this.params      = options.params  || {};
    this.signature   = options.signature || null;
    this.templateId  = options.templateId || '';
    this.trigger     = options.trigger || 'submit'; // false, 'submit' || 'change'

    this.interval = parseInt(options.interval, 10) || 2500;
    this.timeout  = parseInt(options.timeout, 10)  || 8000;
    this.notFoundAttempts = 15;
    this.connectionAttempts = 15;

    this.seq = 0;

    this.bindDomListeners();
    this.appendFields();
};

inherits(Transformit, Emitter);

Transformit.prototype.bindDomListeners = function () {
    var me = this;

    if (!this.trigger) return;

    if (this.trigger === 'submit') {
        this.$form.onsubmit = function submitHandler (e) {
            e.preventDefault();
            e.stopPropagation();
            me.upload();
            return false;
        };
    }
    
    if (this.trigger === 'change') {
        var $inputs = this.$form.querySelectorAll('input[type=file]');
        if ($inputs.length > 0) {
            for (i = 0; i <= $inputs.length; i++) {
                $inputs[0].addEventListener(changeHandler);
            }
        }

        function changeHandler () {
            me.upload();
        }
    }
};

Transformit.prototype.checkStatus = function (assemblyUrl) {
    var me = this;

    xhr({
        'method': 'GET',
        'uri': assemblyUrl + '?seq=' + this.seq
    }, function (err, res, body) {
        if (err) return me.emit('error', err);

        var assembly = JSON.parse(body);
        
        if (assembly.ok && assembly.ok == 'ASSEMBLY_COMPLETED') {
            me.emit('success', assembly);
            return;
        }

        if (assembly.ok && assembly.ok == 'REQUEST_ABORTED') {
            me.emit('error', assembly.message);
            return;
        }

        if (assembly.error || (assembly.ok != 'ASSEMBLY_EXECUTING' && assembly.ok != 'ASSEMBLY_UPLOADING')) {
            me.emit('error', 'Failed to check assembly (' + assembly.message + ')');
        }

        // Progress checking
        me.seq = assembly.last_seq;
        me.emit('progress', assembly.bytes_received, assembly.bytes_expected, assembly);
        setTimeout(function () {
            me.checkStatus(assemblyUrl);
        }, this.interval);
    });
};

Transformit.prototype.upload = function () {
    var me = this;

    function handleBoredInstance (err, instance) {
        me.sendForm(PROTOCOL + instance);
    }

    fetchBoredInstance(this.service, handleBoredInstance);
};

Transformit.prototype.sendForm = function (instance) {
    var me = this;
    var id = createAssemblyId();
    var assemblyUrl = instance + '/assemblies/' + id;

    asyncf(this.$form, {
        'action': assemblyUrl + '?redirect=false',
        'body': {
            'params': JSON.stringify(this.getParams())
        },
        'success': function asyncSuccess (err, res, body) {
            if (err) return me.emit('error', err);
        },
        'error': function asyncError (err) {
        }
    });

    me.checkStatus(assemblyUrl);
}

Transformit.prototype.getParams = function (file) {
    this.params.auth = { key: this.key };
    this.params.template_id = this.getTemplateId(file);

    return this.params;
};

Transformit.prototype.getTemplateId = function (file) {
    var id = '';

    if (typeof this.templateId === 'function') id = this.templateId.apply(this, [file]);

    if (typeof this.templateId === 'string') id = this.templateId;

    if (typeof id !== 'string') this.emit('error', 'templateId must yield a string. Got: ', typeof id, id);

    return id;
};

Transformit.prototype.appendField = function (fieldName, val) {
    if (this.$form.tagName === 'FORM') {
        $field = document.createElement('input');
        $field.value = val;
        this.$form.appendChild($field);
    } 
    
    if (this.$form instanceof FormData) this.$form.append(fieldName, val);
}

Transformit.prototype.appendFields = function () {
    for (name in this.fields) {
        this.appendField(name, this.fields[name]);
    }
}

/**
 * Export
 */
module.exports = function createTransformit (key) {
    Transformit.prototype.key = key || '';

    return function createTransformitInstance ($form, options) {
        return new Transformit($form, options);
    };
};
