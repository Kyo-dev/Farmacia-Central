const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const pool = require('../database')
const helpers = require('../lib/helpers')

passport.use('local.signup', new LocalStrategy({
    usernameField: 'correo',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, correo, clave, done) => {
    console.log(req.body)
    const { cedula, nombre, p_apellido, s_apellido } = req.body
    const newUser = {
        correo,
        clave,
        cedula,
        nombre,
        p_apellido,
        s_apellido,
    };
    newUser.clave = await helpers.encryptingPass(clave)
    const result = await pool.query('INSERT INTO empleados SET ?', [newUser])
    newUser.id = result.insertId
    const days = {
        empleado_id: newUser.id,
        cantidad_dias_disponibles: 0
    }
    await pool.query('INSERT INTO dias_disponibles SET ?;', [days])
    req.flash('success', 'Gracias por registrarte ' + newUser.nombre + '. Por favor completa el resto de la información de tu perfil')
    return done(null, newUser)
}))

passport.use('local.signin', new LocalStrategy({
    usernameField: 'correo',
    passwordField: 'clave',
    passReqToCallback: true
}, async (req, correo, clave, done) => {
    // INFORMACION CON LA QUE SE CARGA EL USUARIO
    const data = await pool.query(`Select a.activo, a.nombre, a.p_apellido, a.s_apellido, a.correo, a.fecha_contrato, a.cedula, a.id, b.nombre_cargo, a.clave
                            From empleados a
                            INNER JOIN tipo_empleados b
                            ON a.tipo_empleado = b.id 
                            where a.correo = ?`, [correo])
    if (data.length > 0) {
        const user = data[0]
        console.log(user)
        const pass = await helpers.decryptingPass(clave, user.clave)
        if (pass) {
            done(null, user, req.flash('success', 'Bienvenido ' + user.nombre))
        } else {
            done(null, false, req.flash('message', 'Datos incorrectos'))
        }
    } else {
        return done(null, false, req.flash('message', 'Usuario o clave incorrectos'))
    }
}))

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
    const row = await pool.query('SELECT * FROM empleados WHERE id = ?', [id])
    done(null, row[0])
})