# Multer-COS-X

本项目fork自Multer-COS, 做了一些优化, 欢迎提issue或者PR

 Multer Storage Engine 腾讯云COS版

COS文档使用
https://cloud.tencent.com/document/product/436/12264#slice-upload-file

## Installation

    npm i multer-cos-x

## Usage

目前本项目仅实现了COS的简单上传, **未实现分片上传功能**.

```js
    const multer = require("multer");
    const mcx = require("multer-cos-x");
    const upload = multer({
        storage: mcx({
        cos: {
            // 必填参数
            SecretId: process.env.COS_KEY,
            SecretKey: process.env.COS_SECRET,
            Bucket: process.env.COS_BUCKET,
            Region: process.env.COS_REGION,
            // 可选参数
            domainProtocol: process.env.COS_DOMAIN_PROTOCOL, //自定义域名协议, 不定义则会使用http
            domain: process.env.COS_DOMAIN, // 自定义域名, 不定义则会使用cos默认域名
            dir: process.env.COS_DIR, // cos文件路径, 不定义则会上传至bucket的根目录
            onProgress: progressData => {
                //进度回调函数，回调是一个对象，包含进度信息
                console.log(progressData);
            },
        },
        }),
    });
    app.post(
        "/api/upload", 
        upload.single("file"),
        async (req, res) => {
            const file = req.file;
            res.send(file);
        }
    );
```

### dotenv

推荐用 [dotenv](https://www.npmjs.com/package/dotenv) 保护隐私信息 如appid key bucket 等

## License

[MIT](LICENSE)

=======
