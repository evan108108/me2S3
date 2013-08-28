'use strict';

var service;
var me2S3 = require('../lib/me2S3.js');

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

exports['me2S3'] = {
	setUp: function(done) {
		// setup here
		service = me2S3.createService({});
		done();
	},
	'no args': function(test) {
		test.expect(service);
		// tests here
		// test.equal(me2S3.awesome(), 'awesome', 'should be awesome.');
		test.done();
	},
};