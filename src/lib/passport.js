const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const pool = require('../database')
const helpers = require('../lib/helpers')
passport.use('local.signup', new LocalStrategy({
    usernameField: 'correo',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, correo, clave, done) =>{
    const {cedula} = req.body
    const newUser = {
        correo, 
        clave,
        cedula        
    };
    newUser.clave = await helpers.encryptingPass(clave)
    const result = await pool.query('INSERT INTO empleados SET ?', [newUser])
    console.log(result)
}))

// passport.serializeUser((user, done)=>{

// })

