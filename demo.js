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




server.listen(3000);
