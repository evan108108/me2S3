// s3push.js
var npath = require('path'),
	s3 = require('knox');

var S3Push = function (localpath, remotefile, callback, options)
{
	var remotepath = npath.normalize(options.s3Path + '/' + remotefile);
   
	var self = this;
	this.status = 0;
	//TODO: Should we do a pool of clients?
	var client = s3.createClient({
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
};

//Export our main class.
module.exports = S3Push;