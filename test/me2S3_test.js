'use strict';

var service, required;
var me2S3 = require('../lib/me2S3.js');
var Uploader = require('../lib/uploader.js');

/*
	======== A Handy Little Nodeunit Reference ========
	https://github.com/caolan/nodeunit

	Test methods:
		test.expect(numAssertions)
		test.done()
	Test assertions:
		test.ok(value, [message])
		test.equal(actual, expected, [message])
		test.notEqual(actual, expected, [message])
		test.deepEqual(actual, expected, [message])
		test.notDeepEqual(actual, expected, [message])
		test.strictEqual(actual, expected, [message])
		test.notStrictEqual(actual, expected, [message])
		test.throws(block, [error], [message])
		test.doesNotThrow(block, [error], [message])
		test.ifError(value)
*/

exports['Uploader'] = {
	setUp: function(done) {
		// setup here
		required = Uploader.required;
		done();
	},
	'Invalid configuration options.': function(test) {
		var noOptions = function(){
			service = new Uploader();
		};
		test.throws(noOptions, Error, 'Uploader needs config object.');

		var falsyOptions = function(){
			service = new Uploader({});
		};

		

		var msg = new RegExp('Option "'+required[0]+'" is required.');
		test.throws(falsyOptions, function(err){
			if((err instanceof Error) &&
				msg.test(err)) return true;
		});

		test.done();
	},
	'Default config values':function(test){

		var options = {};
		required.forEach(function(option){
			options[option] = true;
		});

		service = new Uploader(options);
		required.forEach(function(option){
			test.ok(service[option],'Initialization should create a property out of the key '+option);
		});

		var defaultPath = require('fs').realpathSync('.');
		test.equal(service.watchDir, defaultPath, 'If not watchDir provided, we get pwd');
		
		test.deepEqual(service.options, options,'We should have an options property on the created instance.');
		test.done();
	},
	'getOptions should provide a cloned options object.':function(test){

		test.done();
	},
};