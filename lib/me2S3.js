var fs = require('fs');
var nxmx = require('noxmox');
var minimatch = require('minimatch');
var npath = require('path');
/**
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

    Me2S3.start = function start() {

        fs.watchFile(options.watchDir,{interval:100}, function(current, previous) {
            var watched = fs.readdirSync(options.watchDir);
            //TODO: We should take an array and apply a chain of filters.
            var files = watched.filter(minimatch.filter('!.DS_Store', {matchBase: true}));
            console.log('Watched changed: ', files);
            files.forEach(function(file, index){
                var path = npath.join(options.watchDir, file);
                console.log('File: ', file);
                if(!fs.lstatSync(path).isFile())
                    throw new Error('Sub-Directories are not supported. Only supported type is File');

                new S3Push( options, file, path, function (options, filepath, filename, status)
                    {
                        console.log('filepath: '+filepath);
                        console.log('status: ' + status);
                        // console.log('afterPush: %s', options.afterPush);

                        if(status !== 200)
                        {
                            console.log('Could not upload file ' + filepath);
                            fs.renameSync(filepath, filename);
                        }
                        else
                        {
                            if(options.afterPush === 'DELETE') fs.unlinkSync(filepath);
                            else fs.renameSync(filepath, options.afterPush + '/' + filename);
                        }

                        
                    }
                );
            });
        });
/*
        var filename, path;
        if(filename=fs.readdirSync(options.watchDir)[0])
        {

            path = options.watchDir+'/'+filename;
            if(!fs.lstatSync(path).isFile())
                throw new Error('Sub-Directories are not supported. Only supported type is File');

            new S3Push(options, filename, path,
                function (options, filepath, filename, status)
                {
                    console.log('filepath: '+filepath);
                    console.log('status: ' + status);
                    // console.log('afterPush: %s', options.afterPush);

                    if(status !== 200)
                    {
                        console.log('Could not upload file ' + filepath);
                        //fs.renameSync(filepath, filename);
                    }
                    else
                    {
                        //if(options.afterPush === 'DELETE') fs.unlinkSync(filepath);
                        //else fs.renameSync(filepath, options.afterPush + '/' + filename);
                    }

                    setTimeout(function() { Me2S3.start(); }, 1000);
                }
            );
        } else setTimeout(function() { Me2S3.start(); }, options.checkInterval);*/
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

    return Me2S3;
};