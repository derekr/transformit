## transformit
#### Async transloadit uploads.

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

The main dependencies are `jsonp` for making cross domain polling requests to transloadit and `async-form` which 
provides an iframe fallback for browsers that don't support sending form data via xhr/jsonp.
