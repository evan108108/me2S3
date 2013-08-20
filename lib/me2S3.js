/**/
var fs = require('fs');
var nxmx = require('noxmox');

exports.createService = function(options) {
    if (!options.key) throw new Error('aws "key" required');
    if (!options.secret) throw new Error('aws "secret" required');
    if (!options.bucket) throw new Error('aws "bucket" required');
    if (!options.watchDir) throw new Error('watchDir is required');
    if (!options.failDir) throw new Error('failDir is required');
    if (!options.checkInterval) throw new Error('checkInterval is required');
    if (!options.s3Path) options.s3Path = '';
    if (!options.afterPush) throw new Error('afterPush is required');

    var Me2S3 = function(){};
    

    Me2S3.start = function start() {
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
                        fs.renameSync(filepath, filename);
                    }
                    else
                    {
                        if(options.afterPush === 'DELETE') fs.unlinkSync(filepath);
                        else fs.renameSync(filepath, options.afterPush + '/' + filename);
                    }

                    setTimeout(function() { Me2S3.start(); }, 1000);
                }
            );
        } else setTimeout(function() { Me2S3.start(); }, options.checkInterval);
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

        // var req = client.put(options.s3Path + '/' + filename, {'Content-Length': data.length});
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