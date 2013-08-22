var fs = require('fs'),
    nxmx = require('noxmox'),
    minimatch = require('minimatch'),
    npath = require('path'),
    walk = require('walkdir'),
    watch = require('watch'),
    mkdirp = require('mkdirp');

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

    var Me2S3 = function(options){
        //TODO: Do we want to expand options?!
        this.options = options;
    };


    Me2S3.prototype.buildFSTree = function(path, options){
        var dirs = [];
        var files = [];
        var self = this;
        console.info('Me2S3 buildFSTree for: %s', path);
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
            self.pushTree(files, options);
        });
    };

    Me2S3.prototype.pushTree = function(files, options){
        var self = this;

        //TODO: Have multiple filters, also take them from options.
        //make this recursive.
        files = files.filter(minimatch.filter('!.DS_Store', {matchBase: true}));
        // console.log('Watched changed: ', files);
        
        // Deepest files first, so we go bottom up.
        files.sort(function(a, b){
            return b.length - a.length; // ASC -> a - b; DESC -> b - a
        });

        var remotepath, watched = options.watchDir;
        files.forEach(function(file, index){
            remotepath = file.replace(watched, '');
            self.push(file, remotepath, self.postPush, options);
        });
    };

    Me2S3.prototype.push = function(file, path, callback, options){
        console.info('Me2S3 push: file %f, path %s', file, path);
        new S3Push(file, path, callback, options);
    };

    Me2S3.prototype.postPush = function(options, filepath, filename, status){

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
            // console.warn('**********************');
            // console.warn('filename: %s', filename);
            // console.warn('filepath: %s', filepath);
            // console.warn('filepath exists: %s', fs.existsSync(filepath));
            // console.warn('filename exists: %s', fs.existsSync(options.afterPush));
            // console.warn('**********************');

            if(options.afterPush === 'DELETE') fs.unlink(filepath);
            else {
                //TODO: Make sure that all dirs in path exists, else make recursive.
                //https://github.com/substack/node-mkdirp
                if( ! fs.existsSync(filepath)) throw new Error('File was gone before handling post push callback');
                
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
    };

    Me2S3.prototype.start = function start() {
        console.info('Me2S3 start.');
        var options = this.options;
        options.watchDir = fs.realpathSync(options.watchDir);
        this.buildFSTree(options.watchDir, options);
        // TODO: Walk down the target dir, build tree, then send each item.
        // https://github.com/soldair/node-walkdir
        // https://github.com/substack/node-findit
        // https://github.com/coolaj86/node-walk
        var self = this;
        
        var watchFileOptions = {filer:minimatch.filter('!.DS_Store', {matchBase: true})};
        fs.watchFile(options.watchDir,{interval:100}, function(current, previous) {
            console.warn('Watch watch tree: ');
            self.buildFSTree(options.watchDir);
        });
    };

    function S3Push(localpath, remotefile, callback, options)
    {
        var remotepath = npath.normalize(options.s3Path + '/' + remotefile);
        console.warn('------------------');
        console.warn('remotepath: %s\nlocalpath: %s', remotepath, localpath);
        console.warn('------------------');
        // return;
        var self = this;
        this.status = 0;
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
            }

            self.status = res.statusCode;
            callback(options, localpath, remotefile, self.status);
        });
    }

    return new Me2S3(options);
};