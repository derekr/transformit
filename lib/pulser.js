/**
 * Poll a given assembly url against transloadit.
 * Most of the code is a port of what's in the transloadit jquery plugin.
 * https://github.com/transloadit/jquery-sdk/blob/master/js/lib/jquery.transloadit2.js
 *
 * @package transformit
 * @author Derek Reynolds <drk@diy.org>
 */

/**
 * Dependencies
 */
var async  = require('async');
var events = require('events');
var util   = require('util');

/**
 * Constructor
 *
 * @param {string} url - Assembly url to poll
 * @param {object} options
 *   service: transloadit service url
 *   interval: how often to pull the assembly url in ms
 *   timeout: how long before a request times out in ms
 */
function Pulser (url, options) {
    options = {} || options;

    this.url = url;
    this.service  = options.service;
    this.interval = parseInt(options.interval, 10) || 2500;
    this.timeout  = parseInt(options.timeout, 10)  || 8000;

    this.notFoundAttempts = 15;
    this.connectionAttempts = 15;

    this.seq = 0;

    this.results = [];
}

/**
 * Inherits
 */
util.inherits(Pulser, events.EventEmitter);

/**
 * Asynchronously kicks off the polling process.
 * 
 * @param {function} callback - Called once polling is complete.
 */
Pulser.prototype.start = function (callback) {
    this.checkStatus(this.url, callback);
};

/**
 * Method that actually initializes polling.
 * 
 * @param {string} assemblyUrl
 * @param {function} callback
 */
Pulser.prototype.checkStatus = function (assemblyUrl, callback) {
    var me = this;
    var uploading = true;

    async.whilst(
        function isUploading () {
            return uploading;
        },

        function poll (callback) {
            setTimeout(function () {
                $.jsonp({
                    url: assemblyUrl + '?seq=' + me.seq, 
                    timeout: me.timeout, 
                    callbackParameter: 'callback',
                    success: function (assembly) {
                        uploading = me.parseAssembly(assembly);
                        callback();
                    },

                    error: function (xhr, status) {
                        callback(status);
                    } 
                });
            }, me.interval);
        },

        callback
    );
};

/**
 * Called on each poll and is passed the assembly object at that 
 * time of polling.
 *
 * This will collect all results as they're created (otherwise) the 
 * final results object seems to be incomplete. https://github.com/transloadit/jquery-sdk/blob/master/js/lib/jquery.transloadit2.js#L428-L434
 *
 * @param {assembly}
 */
Pulser.prototype.parseAssembly = function (assembly) {
    for (var step in assembly.results) {
      this.results[step] = this.results[step] || [];
      for (var i = 0; i < assembly.results[step].length; i++) {
        this.results[step].push(assembly.results[step][i]);
      }
    }

    assembly.results = this.results;

    if (assembly.ok && assembly.ok === 'ASSEMBLY_COMPLETED') {
        this.emit('success', assembly);
        return false; // done
    }

    if (assembly.ok && assembly.ok === 'REQUEST_ABORTED') {
        this.emit('error', assembly.message);
        return false; // done
    }

    if (assembly.error || (assembly.ok !== 'ASSEMBLY_EXECUTING' && assembly.ok !== 'ASSEMBLY_UPLOADING')) {
        if (assembly.error === 'ASSEMBLY_NOT_FOUND') {
            return true; // still uploading
        } else {
            this.emit('error', 'Failed to check assembly (' + assembly.message + ')');
            return false; // done
        }
    }

    // Progress checking
    this.seq = assembly.last_seq;
    this.emit('progress', assembly.bytes_received, assembly.bytes_expected, assembly);

    return true; // still uploading
};

/**
 * Export
 */
module.exports = function(url, options) {
    return new Pulser(url, options);
};
