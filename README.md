# Multer-COS
 Multer Storage Engine 腾讯云COS版

COS文档使用
https://cloud.tencent.com/document/product/436/12264#slice-upload-file


## Installation

	npm install multer-cos

## Usage

### myMulter.js
```js
let multer = require('multer');
let multerCOS = require('multer-cos');

const cosConfig={
  //id和key是必须

  //SecretId: AKIXXXXXXXXXXX,
  //SecretKey:XXXXXXXXXXXXXX,
  //Bucket:test-bucket-125XXXXXXXXX
  //Region=ap-shanghai
  // 可选参数
  FileParallelLimit: 3,    // 控制文件上传并发数
  ChunkParallelLimit: 3,   // 控制单个文件下分片上传并发数
  ChunkSize: 1024 * 1024,  // 控制分片大小，单位 B
  domain:'static.dorodoro-lab.com', //cos域名
  dir:'upload',                     //cos文件路径
  onProgress:function(progressData){//进度回调函数，回调是一个对象，包含进度信息
      //console.log(progressData);
  }

};


//定义仓库
const storage = multerCOS({
  cos:cosConfig,
  //Note:如果你传递的是一个函数，你负责创建文件夹，如果你传递的是一个字符串，multer会自动创建 如果什么都不传 系统自己会生成tmp目录
  destination: function (req, file, cb) {
      cb(null, dir);
  },
  //自己会生成个随机16字母的文件名和后缀
  filename:'auto'
});

module.exports=function(opt) {
    return  multer({
        storage: storage,
    }).array(opt);
};
```
### app.js
```js
let express= require('express');
let myMulter = require('./myMulter');

let app = express();

let server = require('http').Server(app);


//文件上传服务
app.post('/upload',  function (req, res, next)  {

    let responseData; //响应的数据

    var upload=myMulter('file',1);

    upload(req, res, function (err) {

           try {
                 if (err) throw err;
                 if(req.files.length==0) throw new  Error("不能上传空文件");

                 responseData={msg:"上传成功",code:2000};
                 responseData.url=req.files[0].url;
                 res.json(responseData);


           }
           catch (err) {
                 responseData={msg:"上传失败",code:4000};;
                 responseData.error=err.message;
                 res.status(500).json(responseData);
           }
     });
});


```
 ### dotenv
 推荐用 [dotenv](https://www.npmjs.com/package/dotenv) 保护隐私信息 如appid key bucket 等


## License

[MIT](LICENSE)
=======
