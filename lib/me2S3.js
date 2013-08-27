var fs = require('fs'),
	nxmx = require('noxmox'),
	minimatch = require('minimatch'),
	npath = require('path'),
	walk = require('walkdir'),
	watch = require('watch'),
	mkdirp = require('mkdirp');
	// Queue = require('queue');

/**
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

	//Make sure we have the required options.
	var required = ['key', 'secret', 'bucket', 'watchDir', 'failDir', 'checkInterval', 'afterPush'];

	var Uploader = function(options){
		//TODO: Do we want to expand options?!
		this.initialize(options);
	};

	Uploader.prototype.initialize = function(config){

		if (!config.s3Path) config.s3Path = '';
		var self = this;
		required.forEach(function(option){
			if(!(option in config)) throw new Error('Option "'+option+'" is required');
			self[option] = config[option];
		});
		
		this.watchDir = fs.realpathSync(this.watchDir);
		console.warn('Self ', self);
		this.options = config;
	};



	Uploader.prototype.buildFSTree = function(path /*, options*/ ){

		var dirs = [];
		var files = [];
		var self = this;

		console.info('Uploader buildFSTree for: %s', path);
		var emitter = walk(path);

		emitter.on('file',function(filename,stat){
			files.push(filename);
		});

		emitter.on('directory', function(dir, stat){
			dirs.push(dir);
		});

		emitter.on('end',function(filename,stat){
			//Push all files to S3.
			//TODO: After all files are moved, we should delete
			//all directories.
			self.pushTree(files, dirs, options);
		});
	};

	Uploader.prototype.getOptions=function(){
		var ret = {};
		var self = this;
		Object.keys(this.options).forEach(function (val) {
			ret[val] = self.options[val];
		});
		return ret;
	};

	Uploader.prototype.pushTree = function(files, dirs/*, options*/){
		var self = this;
		var options = this.getOptions();

		//TODO: Have multiple filters, also take them from options.
		//make this recursive.
		files = files.filter(minimatch.filter('!.DS_Store', {matchBase: true}));
		// console.log('Watched changed: ', files);
		
		var queue = {};
		// Deepest files first, so we go bottom up.
		files.sort(function(a, b){
			queue[a]=a; // We just want to keep an eye on all files.
			return b.length - a.length; // ASC -> a - b; DESC -> b - a
		});

		options.dirs  = dirs;
		options.queue = files;
		options.files = files;
		options.total = files.length;

		//TODO: For some reason, options might be undefined from time to time :(
		var remotepath, watched = this.watchDir;
		files.forEach(function(file, index){
			remotepath = file.replace(watched, '');
			/*q.push(function(next){
				var onDone = function(filepath, filename, status, options){
					self.postPush(filepath, filename, status, options);
					next();
				};
				self.push(file, remotepath, onDone, options);
			});*/
			self.push(file, remotepath, self.postPush, options);
		});
	};

	Uploader.prototype.push = function(file, path, callback, options){
		console.info('Uploader push: file %f, path %s', file, path);
		new S3Push(file, path, callback, options);
	};

	Uploader.prototype.postPush = function(filepath, filename, status, options){

		//TODO: We should have a queue. Push all files, pop one by one, and when we are done, then
		//we clean up. Do not modify the tree halfway through!!
		if(status !== 200)
		{
			console.log('Could not upload file ' + filepath);
			//TODO: How do we handle errors? Should we move it to same dir, and 
			//we do another pass later? TBD!
			// fs.renameSync(filepath, filename);
		}
		else
		{
			filename = options.afterPush+filename;//npath.normalize(options.afterPush+'/'+filename);

			if(options.afterPush === 'DELETE') fs.unlink(filepath);
			else {
				//TODO: Make sure that all dirs in path exists, else make recursive.
				//https://github.com/substack/node-mkdirp
				if( ! fs.existsSync(filepath)) throw new Error('File was gone before handling post push callback for %s', filepath);
				
				var targetDir = npath.dirname(filename);
				//TODO: Make async!
				if( ! fs.existsSync(targetDir)) mkdirp.sync(targetDir);

				fs.renameSync(filepath, filename);
				/*fs.rename(filepath, filename, function(err){
					if (err) console.warn('Error: ', err);
					else console.log('Moved: %s', filename);
				});*/
			}
		}

		//HACKY!! POC, need to figure out how to handle this.
		if(options.total === 0){
			options.dirs.sort(function(a, b){
				return b.length - a.length; // ASC -> a - b; DESC -> b - a
			});

			var exec = require('child_process').exec;

			options.dirs.forEach(function(dir){
				console.warn('Remove dir %s', dir);
				dir = npath.normalize(dir);
				exec('rm -R '+dir, function(){
					console.log(arguments);
				});
				//this both fail...
				// fs.unlinkSync(dir);
				//fs.unlink(dir, function(err){console.log(err);});
			});
		}
	};

	Uploader.prototype.start = function start() {
		console.info('Uploader start: %s', this.watchDir);
		var options = this.options;
		
		this.buildFSTree(this.watchDir);
	   
		var self = this;
		
		fs.watchFile(options.watchDir,{interval:100}, function(current, previous) {
			console.warn('Watch watch tree: ');
			self.buildFSTree(self.watchDir);
		});
	};

	function S3Push(localpath, remotefile, callback, options)
	{
		var remotepath = npath.normalize(options.s3Path + '/' + remotefile);
	   
		var self = this;
		this.status = 0;
		//TODO: Should we do a pool of clients?
		var client = require('knox').createClient({
			key: options.key,
			secret: options.secret,
			bucket: options.bucket
		});

		
		client.putFile(localpath, remotepath, function(err, res){
			//TODO: We should handle errors!!
			if(err) console.log('Error: ', err);

			//TODO: We should handle non 200 status!!
			if(res.statusCode === 200){
				console.warn('Saved to %s', res);
				// console.warn('Queue: %s\n--------',options.total);
			}
			//TODO: Even if we have error, we are couting this one done.
			//      we should prob fix this.
			--options.total;
			self.status = res.statusCode;
			callback(localpath, remotefile, self.status, options);
		});
	}

	var service = new Uploader(options);
	return service;
};