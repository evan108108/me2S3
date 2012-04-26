var fs = require('fs');
var nxmx = require('noxmox');

exports.createService = function(options) {
  if (!options.key) throw new Error('aws "key" required');
  if (!options.secret) throw new Error('aws "secret" required');
  if (!options.bucket) throw new Error('aws "bucket" required');
  if (!options.watchDir) throw new Error('watchDir is required');
  if (!options.failDir) throw new Error('failDir is required');
  if (!options.checkInterval) throw new Error('checkInterval is required');
  if (!options.s3Path) options.s3Path = "";
  if (!options.afterPush) throw new Error('afterPush is required');

  var client = new function() {};

  client.start = function start() {
    if(filename=fs.readdirSync(options.watchDir)[0])
    {
      if(!fs.lstatSync(options.watchDir+'/'+filename).isFile())
        throw new Error("Sub-Directories are not supported. Only supported type is File");

      new s3Push(options, filename, options.watchDir+'/'+filename, 
        function (options, filepath, filename, status)
        {
          console.log('filepath: '+filepath);
          console.log('status: ' + status);
          if(status !== 200)
          {
            console.log('Could not upload file ' + filepath);
            fs.renameSync(filepath, filename);
          }
          else
          {
            if(options.afterPush == 'DELETE')
              fs.unlinkSync(filepath);
            else
              fs.renameSync(filepath, options.afterPush + "/" + filename);
          }

          setTimeout(function() { client.start(); }, 1000);
        });
    }
    else
      setTimeout(function() { client.start(); }, options.checkInterval);
  } 

  function s3Push(options, filename, filepath, callback)
  {
    this.status = 0;

    var client = require('noxmox').nox.createClient({
      key: options.key,
      secret: options.secret,
      bucket: options.bucket
    });

    var data = fs.readFileSync(filepath);
    var req = client.put(options.s3Path + "/" + filename, {'Content-Length': data.length});

    req.on('continue', function() {
      req.end(data);
    });

    req.on('response', function(res) {
      res.on('data', function(chunk) {
        console.log(chunk);
      });
      res.on('end', function() {
        if (res.statusCode === 200) {
          console.log('File is now stored on S3');
        }
        else
          console.log(res.statusCode);

        this.status = res.statusCode;
        
        callback(options, filepath, filename, this.status);
      });
    });
  }
  return client;
}


