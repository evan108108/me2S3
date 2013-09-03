# me2S3

Simple local to S3 sync tool.

## Getting Started
Install the module with: `npm install me2S3`

## Documentation
_(Coming soon)_

## Examples
```javascript
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
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_

## License
Licensed under the MIT license.
