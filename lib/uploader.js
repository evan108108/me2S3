//uploader.js
var fs = require('fs'),
	npath = require('path'),
	walk = require('walkdir'),
	watch = require('watch'),
	mkdirp = require('mkdirp'),
	assert = require('assert'),
	S3Push = require('./s3push'),
	minimatch = require('minimatch'),
	walk = require('walkdir');


var Uploader = function(options){
	//TODO: Do we want to expand options?!
	this.initialize(options);
};

//Make sure we have the required options.
Uploader.required = ['key', 'secret', 'bucket', 'watchDir', 'failDir', 'checkInterval', 'afterPush'];

Uploader.prototype.initialize = function(config){
	
	assert.ok(config, 'Uploader needs configuration object.');

	if (!config.s3Path) config.s3Path = '';
	var self = this;
	Uploader.required.forEach(function(option){
		assert.ok((option in config), 'Option "'+option+'" is required.');
		self[option] = config[option];
	});
	
	//If watchDir is not a valid path real path returns 
	//the pwd.
	this.watchDir = fs.realpathSync(this.watchDir);
	
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
		self.pushTree(files, dirs, this.options);
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


//Export our main class.
module.exports = Uploader;