me2S3
=====

Node Module that watches a folder and pushes contained files to S3.

```
var client1 = require('./lib/me2S3').me2S3.createService({
    key: 'AKIAI56GLNE6SVAIB7GA', 
    secret: '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',
    bucket: 'labs.controlgroup.com',
    watchDir: './sync', //Name of the directory to watch (items will be pushed to S3)
    failDir: './syncFail',/Name of the directory to put files that fail to upload
    checkInterval: 1000, //Will check the directory for files every [checkInterval] milliseconds
    s3Path: 'my/s3/dir', //path to put files in your S3 Bucket
    afterPush: 'DELETE' //DELETE will delete the local files or provide a path (ie './done') where files will be moved  
});

var client2 = require('./lib/me2S3').me2S3.createService({
    key: 'AKIAI56GLNE6SVAIB7GA',
    secret: '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',
    bucket: 'labs.controlgroup.com',
    watchDir: './sync2',
    failDir: './syncFail',
    checkInterval: 1000,
    s3Path: 'test',
    afterPush: './done'
});

client1.start();
client2.start();
```

