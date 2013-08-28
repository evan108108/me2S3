var fs = require('fs');
//We are expecting to have a file .passwords with JSON format
//with the key/secret.
//TODO:
var contents = fs.readFileSync(__dirname+'/.passwords', 'utf-8');
var config = JSON.parse(contents);

var client = require('./lib/me2S3').createService({
	key: config.key,
	secret: config.secret,
	bucket: 'me2S3',
	watchDir: './tmp/example',
	failDir: './tmp/exampleF',
	checkInterval: 1000,
	s3Path: 'backups',
	afterPush: './tmp/done'
});

client.start();