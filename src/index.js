const express = require ('express')
const morgan = require('morgan')
const exphbs = require('express-handlebars')
const path = require('path')
const flash = require('connect-flash')
const session = require('express-session')
const mySQLStore = require('express-mysql-session')
const {database} = require('./keys')
const passport = require('passport')
//inicialzaciones
const app = express()
require('./lib/passport')

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
//Variables globales

app.use((req, res, next)=>{
  app.locals.success = req.flash('success')
  next()
})

//rutas del servidor
app.use(require('./routes/'))
app.use(require('./routes/auth'))
app.use('/permisos', require('./routes/permisos'))

//navegador
app.use(express.static(path.join(__dirname, 'public')))

//Arrancar el server
app.listen(app.get('PORT'),()=>{
    console.log(`Server on port ${app.get('PORT')}`)
})
