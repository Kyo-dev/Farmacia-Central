const express = require ('express')
const morgan = require('morgan')
const exphbs = require('express-handlebars')
const path = require('path')
const flash = require('connect-flash')
const session = require('express-session')
const mySQLStore = require('express-mysql-session')
const {database} = require('./keys')
const passport = require('passport')
const multer = require('multer')
const uuid = require('uuid/v4')
//inicialzaciones
const app = express()
require('./lib/passport')

const storageMulter = multer.diskStorage({
  destination: path.join(__dirname, 'public/uploads'),
  filename: (req, file, cb) => {
    cb(null, uuid() + path.extname(file.originalname).toLocaleLowerCase())
  }
})

//Configuracion
app.set('PORT', process.env.PORT || 4000)
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', exphbs({
  defaultLayout: 'main',
  layoutsDir: path.join(app.get('views'), 'layouts'),
  partialsDir: path.join(app.get('views'), 'partials'),
  extname: '.hbs',
  helpers: require('./lib/handlebars')
}))
app.set('view engine', '.hbs');
//middlewares
app.use(session({
  secret: 'farmaCenMor',
  resave: false,
  saveUninitialized: false,
  store: new mySQLStore(database)
}))
app.use(flash())
app.use(morgan('dev'))
app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(passport.initialize())
app.use(passport.session())
app.use(multer({
  storage: storageMulter,
  limits: {
    fileSize: 1000000
  },
  fileFilter: (req, file, cb) =>{
    const fileTypes = /pdf||docx/;
    const mimetype = fileTypes.test(file.mimetype)
    const extname = fileTypes.test(path.extname(file.originalname))
    if(mimetype && extname){
      return cb(null, true)
    } 
    return cb(new Error("Solo se adminten archivos en formato .pdf y .docx"), false)
  },
  dest: path.join(__dirname, 'public/uploads')
}).single('url_documento'))

//Variables globales
app.use((req, res, next)=>{
  app.locals.success = req.flash('success')
  app.locals.message = req.flash('message')
  app.locals.user = req.user
  next()
})

//rutas del servidor
app.use(require('./routes/'))
app.use(require('./routes/auth'))
app.use('/vacations', require('./routes/vacations'))
app.use('/overTime', require('./routes/overTime'))
app.use('/payroll', require('./routes/payroll'))
app.use('/permits', require('./routes/permits'))
app.use('/conduct', require('./routes/conduct'))
app.use('/salary', require('./routes/salary'))
app.use('/tasks', require('./routes/tasks'))
app.use('/bonus', require('./routes/bonus'))
app.use('/users', require('./routes/users'))

//navegador
app.use(express.static(path.join(__dirname, 'public')))

//Arrancar el server
app.listen(app.get('PORT'),()=>{
    console.log(`Server on port ${app.get('PORT')}`)
})
