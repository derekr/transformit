## transformit
#### Async transloadit uploads.

[![NPM](https://nodei.co/npm/transformit.png?compact=true)](https://nodei.co/npm/transformit/)
![david-dm.png](https://david-dm.org/derekr/transformit.png)

A convenience wrapper for binding form events and uploading files to transloadit.
Calling the `transformit` function will return a `transpulseit` instance you can use to 
check the progress of your assembly.

## Usage

```js
var transformit = require('transformit')('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'); // Transloadit Key

var transformed = transformit(document.getElementById('test-form'), {
    'trigger': false,
    'fields': {
        'encoder_key': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
    },
    'templateId': 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
});

transformed.on('progress', function (received, expected, assembly) {
    console.log(arguments);
    console.log((received / expected) * 100);
});

transformed.on('success', function (assembly) {
    console.log(assembly);
});

transformed.on('error', function (err) {
    console.log(err);
});

transformed.appendField('beep', 'boop');

transformed.upload(function (err) {
    // called after all uploads are finished
});
```

## Installation

```
npm install transformit --save-dev
```

`require` in your clientside scripts and browserify on medium heat.

## Goals

To provide a simple module for easily sending files to transloadit clientside. Where possible it keeps some 
of the same options and verbs as the transloadit jquery plugin. It does not provide the progress modal or a 
few other bells and whistles from the plugin.

## Dependencies

Currently dependent on a global jquery `$` object for use of the `jsonp` method.
