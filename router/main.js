const crypto = require('crypto');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser');


const multer = require("multer");
const path = require("path");
const ipfs = require("ipfs");
const fs = require('fs');

const FileReader = require('filereader')
    , fileReader = new FileReader()

let storage = multer.diskStorage({
    destination: function (req, file, callback) {
        callback(null, "upload/")
    },
    filename: function (req, file, callback) {
        let extension = path.extname(file.originalname);
        let basename = path.basename(file.originalname, extension);
        callback(null, basename + "-" + Date.now() + extension);
    }
});

// 1. 미들웨어 등록
let upload = multer({
    storage: storage
});



let uploadimg= ['QmdKrMpKyQavJN6TJJDHa8vE5thR4UfHPFV7MuYmyrjsDm']; 

// var mysql = require('mysql');
// var dbConfig = require('./dbconfig');
// var conn = mysql.createConnection(dbOptions);
// conn.connect();

module.exports = function (app) {
  app.use(session({
    secret: '!@#$%^&*',
    // store: new MySQLStore(dbOptions),
    resave: false,
    saveUninitialized: false
  }));

  app.use(bodyParser.json());       // to support JSON-encoded bodies
  app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
  }));

  app.get('/', function (req, res) {
    res.render('index.html', { name: req.session.name });
  });

  app.get('/archives', function (req, res) {
    
    console.log('https://ipfs.io/ipfs/')

    let length = uploadimg.length;

    res.render('blog-category-archives', { url: uploadimg[length-1] });
  });

  app.get('/archives/:url', function (req, res) {
    let imgUrl = req.params.url;

    if (imgUrl == '' ) 
    imgUrl = 'QmdKrMpKyQavJN6TJJDHa8vE5thR4UfHPFV7MuYmyrjsDm';

    console.log('archives/' + imgUrl)

    res.render('blog-category-archives', { url: imgUrl });
  });

  app.get('/board', function (req, res) {
    res.render('blog-category-post-board.html', { name: req.session.name });
  });

  app.get('/dac', function (req, res) {
    res.render('blog-category-about-dac.html', { name: req.session.name });
  });

  app.get('/information', function (req, res) {
    res.render('blog-category-information.html', { name: req.session.name });
  });

  app.get('/artfair', function (req, res) {
    res.render('blog-category-artfair.html', { name: req.session.name });
  });

  app.get('/uploadimage/:url', function (req, res) {
    let name = req.params.url;

    console.log('https://uploadimage/' + name)

    uploadimg.push(name);

    //res.redirect('/archives/'+ name);

    // res.render('blog-category-archives', { url: name });
  });

  

  app.get('/user', function (req, res) {
    if (!req.session.name)
      res.redirect('/login');
    else
      res.redirect('/welcome');
  });

  app.get('/login', function (req, res) {
    if (!req.session.name)
    res.render('login.html');
    else
      res.redirect('/welcome');
  });

  app.get('/home', function (req, res) {
    if (!req.session.name)
      res.render('index.html', { message: 'input your id and password.' });
    else
      res.redirect('/welcome');
  });

  app.get('/welcome', function (req, res) {
    if (!req.session.name)
      return res.redirect('/home');
    else
      res.render('index.html', { name: req.session.name });
  });

  app.get('/logout', function (req, res) {
      res.redirect('/');
  });

  app.get('/ipfsupload', function (req, res) {
      res.render('ipfsupload.html');
  });

  async function uploadFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsArrayBuffer(file)

        reader.onloadend = () => {
            const buffer = Buffer.from(reader.result)
            ipfs.add(buffer)
                .then(files => {
                    resolve(files)
                })
                .catch(error => reject(error))
        }

    })
}

// 2. 파일 업로드 처리
app.post('/upload/create', upload.single("imgFile"), async function (req, res, next) {
    // 3. 파일 객체
    let file = req.file;
    console.log("file: ", file)

    let hash = ''

    //Reading file from computer
    try {
        let testFile = fs.readFileSync(file.path);

        let node = await ipfs.create({ silent: true })
        let filesAdded = await node.add({
            path: 'hello.txt',
            content: Buffer.from(testFile)
        })
        let fileBuffer = await node.cat(filesAdded[0].hash)

        hash = filesAdded[0].hash;

        console.log('https://ipfs.io/ipfs/' + filesAdded[0].hash)
    }

    catch (exception) {
        console.log(exception);
    }

    // 4. 파일 정보
    let response = {
        originalName: file.originalname,
        size: file.size,
        hash: hash
    }

    console.log("result: ", response)


    res.status(200).json(response);


});



  app.post('/login', function (req, res) {
    let id = req.body.username;
    let password = req.body.password;

    let salt = '';
    let pw = '';

    crypto.randomBytes(64, (err, buf) => {
      if (err) throw err;
      salt = buf.toString('hex');
    });

    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) throw err;
      pw = derivedKey.toString('hex');
    });

    // var user = results[0];
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', function (err, derivedKey) {
      if (err)
        console.log(err);
      if (derivedKey.toString('hex') === pw) {
        req.session.name = id;
        req.session.save(function () {
          return res.redirect('/welcome');
        });
      }
      else {
        return res.render('login', { message: 'please check your password.' });
      }
    });//pbkdf2
  }); // end of app.post

  // app.post('/login', function (req, res) {
  // var id = req.body.username;
  // var pw = req.body.password;
  // var sql = 'SELECT * FROM user WHERE id=?';
  // conn.query(sql, [id], function (err, results) {
  // if (err)
  // console.log(err);

  // if (!results[0])
  // return res.render('login', { message: 'please check your id.' });

  // var user = results[0];
  // crypto.pbkdf2(pw, user.salt, 100000, 64, 'sha512', function (err, derivedKey) {
  // if (err)
  // console.log(err);
  // if (derivedKey.toString('hex') === user.password) {
  // req.session.name = user.name;
  // req.session.save(function () {
  // return res.redirect('/welcome');
  // });
  // }
  // else {
  // return res.render('login', { message: 'please check your password.' });
  // }
  // });//pbkdf2
  // });//query
  // });
}