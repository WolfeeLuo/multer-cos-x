let path=require('path');
let multer = require('multer');
let multerCOS = require('multer-cos');
require( 'dotenv' ).config();
/**
 * multer
 * https://github.com/expressjs/multer/blob/master/doc/README-zh-cn.md
 * cos
 * https://cloud.tencent.com/document/product/436/12264#options-object
 */


//定义临时文件
let dir=path.resolve(__dirname,'./tmp');

//定义mimes-type
const mimes = {
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.zip':'application/zip',
    '.txt':'text/plain'
};


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

//测试cos
//storage.test();


//定义过滤器
const fileFilter =function  (req, file, cb) {

    // 指示是否应接受该文件
    let test = Object.values(mimes).filter(type=>type===file.mimetype);

    // 接受这个文件，使用`true`，像这样:
    if(test.length>0){
        cb(null, true);
    }else{ // 拒绝这个文件，使用`false`，像这样:
        cb(new Error('file mimes not allow!'), false);
    }
};

//定义限制
const limits={
    fileSize:1024 * 1024 * 30
};


module.exports=function(opt) {
    return  multer({
        storage: storage,
        fileFilter:fileFilter,
        limits: limits,
    }).array(opt);
};
