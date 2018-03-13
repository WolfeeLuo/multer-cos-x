let fs = require('fs');
let os = require('os');
let path = require('path');
let crypto = require('crypto');
let mkdirp = require('mkdirp');
let COS = require('cos-nodejs-sdk-v5');


function getFilename (req, file, cb) {
    let ext =(file.originalname).split('.').pop();

    crypto.pseudoRandomBytes(16, function (err, raw) {
        cb(err, err ? undefined : raw.toString('hex')+'.'+ext);
    });
}

function getDestination (req, file, cb) {
    cb(null, os.tmpdir());
}


function COSStorage (opts={}) {

    if (!(this instanceof COSStorage)){
        return new COSStorage(opts);
    }


    if(opts.filename==='auto'||!opts.filename){
        this.getFilename=getFilename;
    }else{
        this.getFilename=opts.filename;
    }


    if (typeof opts.destination === 'string') {
        mkdirp.sync(opts.destination);
        this.getDestination = function ($0, $1, cb) { cb(null, opts.destination); };
    } else {
        this.getDestination = (opts.destination || getDestination);
    }

    //如果有cos选项将使用cos服务
    if(opts.cos){

        opts.cos.SecretId  =  opts.cos.SecretId || process.env.SecretId || null ;
        opts.cos.SecretKey = opts.cos.SecretKey || process.env.SecretKey || null;
        opts.cos.Bucket=opts.cos.Bucket || process.env.Bucket || null;
        opts.cos.Region=opts.cos.Region || process.env.Region || null;
        opts.cos.domain = opts.cos.domain || process.env.domain || null;
        opts.cos.dir= opts.cos.dir+'/' || process.env.dir+'/' || '/';

        //验证cos服务
        if ( ! opts.cos.SecretId ) {
            throw new Error( 'You have to specify  qcloud api SecretId !' );
        }
        if ( ! opts.cos.SecretKey ) {
            throw new Error( 'You have to specify qcloud api  SecretKey .' );
        }
        //cos运行实例
        this.cos=new COS({
            // 必选参数
            SecretId: opts.cos.SecretId,
            SecretKey: opts.cos.SecretKey,
            // 可选参数
            FileParallelLimit: 3,    // 控制文件上传并发数
            ChunkParallelLimit: 3,   // 控制单个文件下分片上传并发数
            ChunkSize: 1024 * 1024,  // 控制分片大小，单位 B
        });

        //cos运行时候的配置
        this.cosRun={
            domain: opts.cos.domain, //   //域名
            Bucket: opts.cos.Bucket,   // Bucket 格式：test-1250000000
            Region: opts.cos.Region,   //区域
            dir:opts.cos.dir,
            taskId:null,
            onProgress:opts.cos.onProgress||function(){}
        };

    }


}

COSStorage.prototype.test=function(){

    this.cos.getService(function (err, data) {
        if(err){
            console.log('\x1B[31m%s\x1B[39m', 'qcloud test failed');
            console.error(err);
        }else{
            console.log('\x1B[32m%s\x1B[39m', 'qcloud test success');
            console.log(data);
        }

    });
};

//取消任务
COSStorage.prototype.cancelTask=function(TaskId){
    var TaskId=TaskId||this.cosRun.taskId;
    this.cos.cancelTask(TaskId);
    console.log('canceled');
};

//暂停任务
COSStorage.prototype.pauseTask=function(TaskId) {
    var TaskId=TaskId||this.cosRun.taskId;
    this.cos.pauseTask(TaskId);
    console.log('paused');
};

//从新开始任务
COSStorage.prototype.restartTask=function(TaskId) {
    var TaskId=TaskId||this.cosRun.taskId;
    this.cos.restartTask(TaskId);
    console.log('restart');
};

//分片上传
//COSStorage.prototype.sliceUploadFile= function(){
// cos.sliceUploadFile({
//     Bucket: xxxx,
//     Region: xxx,
//     Key: xxxxx',
//     FilePath: path.resolve(__dirname , xxxx)
// }, function (err, data) {
//     console.log(err, data);
// });
//}


COSStorage.prototype._handleFile = function _handleFile (req, file, cb) {
    let that = this;

    that.getDestination(req, file, function (err, destination) {

        if (err) {return cb(err);}
        file.destination=destination;

        that.getFilename(req, file, function (err, filename) {
            if (err) {return cb(err);}
            file.filename=that.cosRun.dir+filename;

            file.tmpPath = path.join(destination, filename);

            //制造1个temp文件
            let tmp = fs.createWriteStream(file.tmpPath);

            file.stream.pipe(tmp);


            tmp.on('finish', function () {

                //注意：，Key（文件名）不能以 / 结尾，否则会被识别为文件夹 。
                that.cos.putObject({
                    Bucket: that.cosRun.Bucket, /* 必须 */ // Bucket 格式：test-1250000000
                    Region: that.cosRun.Region,
                    Key: file.filename, /* 必须 */
                    TaskReady: function (tid) {
                        that.cosRun.taskId = tid;
                    },
                    onProgress: function (progressData) {
                        that.cosRun.onProgress(progressData);
                    },
                    // ContentType:'text/plain',cos 已经帮我们定义好了
                    Body: fs.createReadStream(file.tmpPath),
                    ContentLength:tmp.bytesWritten,
                }, function (err, data) {
                    if(err){
                        that._removeFile(req,file,cb(err.error));
                    }
                    else {
                        if (that.cosRun.domain) {
                            data.Location = `http://${that.cosRun.domain}/${file.filename}`;
                        }
                        file.url=data.Location;
                        that._removeFile(req,file,cb);
                    }
                });
            });

            tmp.on('error', function(err){
                that._removeFile(req,file,cb(err.error));
            });


        });
    });
};


COSStorage.prototype._removeFile = function _removeFile (req, file, cb) {

    let path = file.tmpPath;
    this.cosRun.taskId=null;
    delete file.destination;
    delete file.filename;
    delete file.tmpPath;

    fs.unlink(path,cb);

};


module.exports = function( opts ) {
    return new COSStorage( opts );
};