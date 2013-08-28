var S3Push   = require('./s3push'),
	Uploader = require('./uploader');
	// Queue = require('queue');


/**
 * TODO: Refactor to allow testing.
 * TODO: Handle errors.
 * TODO: Handle recursion.
 * TODO: On tree update, first move to a new tmp folder, then send
 *       but keep the working dir clean.
 * TODO: Make async ops.
 * TODO: Make remote dir string builder, so we can map and aliase.
 * TODO: Make options a property.
 * TODO: Get rid of callbacks. Have Me2S3 inherit from EventEmitter.
 * TODO: Rename Me2S3!!!
 * TODO: Should we have defaults? watch dir be self, faildir be self?
 * TODO: Ignore files pattern.
 * TODO: We could use [ini parser][a] to get key/secret from s3cmd config file.
 * TODO: Condense all extra.fs by using [fs.extra][b]
 * TODO: Review tree structure drilling.
 * 
 * 
 * [a]: https://github.com/shockie/node-iniparser/blob/master/lib/node-iniparser.js
 * [b]: https://npmjs.org/package/fs.extra
 * 
 * http://stackoverflow.com/a/10360485/125083
 * https://npmjs.org/package/node-watch
 *
 * ----
 * https://github.com/soldair/node-walkdir
 * https://github.com/substack/node-findit
 * https://github.com/coolaj86/node-walk
 * ----
 *
 * 
 * Module main build interface.
 * 
 * @param  {Object} options Options object.
 * @return {Me2S3}         Me2S3 instance.
 */
exports.createService = function(options) {
	console.warn('Create service:\n', options);
	var service = new Uploader(options);
	return service;
};

exports.S3Push = S3Push;
exports.Uploader = Uploader;