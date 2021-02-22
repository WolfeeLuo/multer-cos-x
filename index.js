let crypto = require("crypto");
let COS = require("cos-nodejs-sdk-v5");

function getFilename(req, file, cb) {
    let ext = file.originalname.split(".").pop();

    crypto.pseudoRandomBytes(16, function (err, raw) {
        cb(err, err ? undefined : raw.toString("hex") + "." + ext);
    });
}

function COSStorage(opts = {}) {
    if (!(this instanceof COSStorage)) {
        return new COSStorage(opts);
    }

    if (opts.filename === "auto" || !opts.filename) {
        this.getFilename = getFilename;
    } else {
        this.getFilename = opts.filename;
    }

    if (opts.cos) {
        opts.cos.SecretId = opts.cos.SecretId || process.env.SecretId || null;
        opts.cos.SecretKey =
            opts.cos.SecretKey || process.env.SecretKey || null;
        opts.cos.Bucket = opts.cos.Bucket || process.env.Bucket || null;
        opts.cos.Region = opts.cos.Region || process.env.Region || null;
        opts.cos.domainProtocol =
            opts.cos.domainProtocol || process.env.domainProtocol || null;
        opts.cos.domain = opts.cos.domain || process.env.domain || null;
        opts.cos.dir = opts.cos.dir || process.env.dir || "";
        opts.cos.dir = opts.cos.dir == "" ? opts.cos.dir : opts.cos.dir + "/";
        //验证cos配置参数
        if (!opts.cos.SecretId) {
            throw new Error("You have to specify  qcloud api SecretId!");
        }
        if (!opts.cos.SecretKey) {
            throw new Error("You have to specify qcloud api  SecretKey.");
        }
        //cos运行实例
        this.cos = new COS({
            // 必选参数
            SecretId: opts.cos.SecretId,
            SecretKey: opts.cos.SecretKey,
            // 可选参数
            FileParallelLimit: 3,
        });

        //cos运行时候的配置
        this.cosRun = {
            domainProtocol: opts.cos.domainProtocol,
            domain: opts.cos.domain,
            Bucket: opts.cos.Bucket,
            Region: opts.cos.Region,
            dir: opts.cos.dir,
            taskId: null,
            onProgress: opts.cos.onProgress || function () {},
        };
    } else {
        throw new Error("Please specify cos configuration options!");
    }
}

COSStorage.prototype._handleFile = function _handleFile(req, file, cb) {
    let that = this;
    that.getFilename(req, file, function (err, filename) {
        if (err) {
            return cb(err);
        }
        file.filename = that.cosRun.dir + filename;
        const stream = file.stream;
        // put object after 'end' event emit to ensure multer 'readFinished'
        stream.on("end", () => {
            const buffer = Buffer.concat(chunks)
            that.cos.putObject(
                {
                    Bucket: that.cosRun.Bucket,
                    Region: that.cosRun.Region,
                    Key: file.filename,
                    onProgress: function (progressData) {
                        that.cosRun.onProgress(progressData);
                    },
                    Body: buffer,
                },
                function (err, data) {
                    if (err) {
                        that._removeFile(req, file, function () {
                            return cb(err.error);
                        });
                    } else {
                        let url = data.Location;
                        const protocol = that.cosRun.domainProtocol || "http";
                        url = `${protocol}://${url}`;
                        if (that.cosRun.domain) {
                            url = url.replace(
                                /[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?/,
                                that.cosRun.domain
                            );
                        }
                        file.url = url;
                        cb();
                    }
                }
            );
        });
        const chunks  = [];
        stream.on("readable", () => {
            let chunk;
            while (null !== (chunk = stream.read())) {
                chunks.push(chunk);
            }
        });
    });
};

COSStorage.prototype._removeFile = function _removeFile(req, file, cb) {
    let that = this;
    if (!this.cos) {
        console.error("cos client undefined");
        return cb({ message: "cos client undefined" });
    }
    // 发生错误, 回滚上传的文件
    this.cos.deleteObject(
        {
            Bucket: that.cosRun.Bucket,
            Region: that.cosRun.Region,
            Key: file.filename,
        },
        function (err, data) {
            if (err) {
                console.log(`rollback failed:${err.error}`);
                return cb(err.error);
            } else {
                console.log("rollback success");
                return cb(null, data);
            }
        }
    );
};

module.exports = function (opts) {
    return new COSStorage(opts);
};
