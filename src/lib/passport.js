const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const pool = require('../database')
const helpers = require('../lib/helpers')

// passport.use('local.signin', new LocalStrategy({ }))

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
    newUser.id = result.insertId
    return done(null, newUser)
}))

passport.serializeUser((user, done)=>{
    done(null, user.id)

})

passport.deserializeUser( async (id, done)=>{
    const row = await pool.query('SELECT * FROM empleados WHERE id = ?', [id])
    done(null, row[0])
    
})