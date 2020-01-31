const express = require('express')
const pool = require('../database')
const router = express.Router()
const passport = require('passport')
const {isLoggedIn, isNotLoggedIn} = require('../lib/auth')

router.get('/signup', isNotLoggedIn, async (req, res) => {
    const provincia = await pool.query(`
    SELECT a.nombre_provincia, a.codigo_provincia
    FROM provincia a
    `)
    const canton = await pool.query(`
    SELECT a.nombre_canton, a.codigo_canton
    FROM canton a
    `)
    const distrito = await pool.query(`
    SELECT a.nombre_distrito, a.codigo_distrito
    FROM distrito a
    `)
    res.render('auth/signup', {provincia, canton, distrito})
})

router.post('/signup', isNotLoggedIn, passport.authenticate('local.signup', {
    successRedirect: '/profile',
    failureRedirect: '/signup',
    failureFlash: true
}))

router.get('/signin', isNotLoggedIn, (req, res) => {
    res.render('auth/signin')
})

router.post('/signin', isNotLoggedIn, (req, res, next) => {
    passport.authenticate('local.signin', {
        successRedirect: '/users',
        failureRedirect: '/signin',
        failureFlash: true
    })(req, res, next)
})

router.get('/profile', isLoggedIn, (req, res) => {
    // PERMISOS DE ADM 
    if(req.user.cedula !== "1234"){
        console.log('funciona')
        // RENDERIZAR DE LA CARPERA ADM Y RUTAS DEL ADM.
    } else {
        console.log('no funciona')
    }
    res.render('profile/perfil')
})

router.get('/logout', isLoggedIn, (req, res)=> {
    req.logOut()
    res.redirect('/signin')
})

module.exports = router