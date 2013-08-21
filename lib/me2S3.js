var fs = require('fs');
var nxmx = require('noxmox');
var minimatch = require('minimatch');
var npath = require('path');
var walk = require('walkdir');
var watch = require('watch');

/**
 * TODO: Make options a property.
 * TODO: Get rid of callbacks. Have Me2S3 inherit from EventEmitter.
 * TODO: Rename Me2S3!!!
 * TODO: Should we have defaults? watch dir be self, faildir be self?
 * TODO: Ignore files pattern.
 * http://stackoverflow.com/a/10360485/125083
 * https://npmjs.org/package/node-watch
 * Module main build interface.
 * @param  {Object} options Options object.
 * @return {Me2S3}         Me2S3 instance.
 */
exports.createService = function(options) {
    
    //Make sure we have the required options.
    var required = ['key', 'secret', 'bucket', 'watchDir', 'failDir', 'checkInterval', 'afterPush'];
    for(var option in required){
        option = required[option];
        if(!(option in options)) throw new Error('Option "'+option+'" is required');
    }
    if (!options.s3Path) options.s3Path = '';

    var Me2S3 = function(){};

    Me2S3.prototype.buildFSTree = function(path){
        console.info('Me2S3 buildFSTree for: %s', path);
        // watch.watchTree(path, function (f, curr, prev) {
        //     if ( ! (typeof f === 'object' && prev === null && curr === null)) return;

        //     var files = [];
        //     for(var file in f) files.push(file);
        //     console.warn('=================');
        //     console.log('watch: ', files);
        //     console.warn('=================');
        // });
    };

    Me2S3.prototype.onTreeUpdate = function(options, file){
        var path = npath.join(options.watchDir, file);
        console.info('Me2S3 onTreeUpdate: file %s, path %s', file, path);
        console.log('File: ', file);
        if(!fs.lstatSync(path).isFile()){
            console.warn('Sub-Directories are not supported. Only supported type is File');
            this.buildFSTree(path);
            // throw new Error('Sub-Directories are not supported. Only supported type is File');
        } else this.push(options, file, path, this.postPush);
    };

    Me2S3.prototype.push = function(options, file, path, callback){
        console.info('Me2S3 push: file %f, path %s', file, path);
        new S3Push(options, file, path, callback);
    };

    Me2S3.prototype.postPush = function(options, filepath, filename, status){
        console.info('Me2S3 postPush: filepath %s, filename %s', filepath, filename);
        console.log('filepath: '+filepath);
        console.log('status: ' + status);
        
        //TODO: We should have a queue. Push all files, pop one by one, and when we are done, then
        //we clean up. Do not modify the tree halfway through!!
        if(status !== 200)
        {
            console.log('Could not upload file ' + filepath);
            // fs.renameSync(filepath, filename);
        }
        else
        {
            // if(options.afterPush === 'DELETE') fs.unlinkSync(filepath);
            // else fs.renameSync(filepath, options.afterPush + '/' + filename);
        }
    };

    Me2S3.prototype.start = function start() {
        console.info('Me2S3 start.');
        // TODO: Walk down the target dir, build tree, then send each item.
        // https://github.com/soldair/node-walkdir
        // https://github.com/substack/node-findit
        // https://github.com/coolaj86/node-walk
        var self = this;
        
        var watchFileOptions = {filer:minimatch.filter('!.DS_Store', {matchBase: true})};
        watch.watchTree(options.watchDir,{interval:100}, function(f, current, previous) {
            console.warn('Watch watch tree: ', f);
            self.buildFSTree(options.watchDir);

            if ( ! (typeof f === 'object' && previous === null && current === null)) return;
            console.log('Watch tree, done?');
            
            var files = [];
            for(var file in f) files.push(file);
            console.warn('=================');
            console.log('watch: ', files);
            console.warn('=================');

            return;

            self.buildFSTree(options.watchDir);

            var watched = fs.readdirSync(options.watchDir);
            //TODO: We should take an array and apply a chain of filters.
            var files = watched.filter(minimatch.filter('!.DS_Store', {matchBase: true}));
            console.log('Watched changed: ', files);
            files.forEach(function(file, index){
                console.info('| file: %s', file);
                self.onTreeUpdate(options, file);
            });
        });
    };

    function S3Push(options, filename, filepath, callback)
    {
        console.warn('We are pushing: ', arguments);

        var self = this;
        this.status = 0;

        var client = require('knox').createClient({
            key: options.key,
            secret: options.secret,
            bucket: options.bucket
        });

        client.putFile(filepath, options.s3Path + '/' + filename, function(err, res){
            if(err) return console.log('Error: ',err);

            if(res.statusCode === 200){
                console.warn('Saved to %s', res);
            }

            self.status = res.statusCode;
            callback(options, filepath, filename, self.status);
        });
    }

    return new Me2S3();
};