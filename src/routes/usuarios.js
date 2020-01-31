// const express = require('express')
// const router = express.Router()
// const pool = require('../database')
// const { isLoggedIn } = require('../lib/auth')

// router.get('/', isLoggedIn, (req, res) => {
//     // PERMISOS DE ADM 
//     if(req.user.cedula !== "1234"){
//         console.log('funciona')
//         // RENDERIZAR DE LA CARPERA ADM Y RUTAS DEL ADM.
//     } else {
//         console.log('no funciona')
//     }
//     res.render('profile/perfil')
// })

// router.get('/editar', async (req, res) => {
//     const usuario = await pool.query('Select id from direccion where cedula = ?',[req.user.cedula])
//     const opcion = usuario.length
//     const provincia = await pool.query(`SELECT nombre_provincia, codigo_provincia FROM provincia;`)
//     const canton = await pool.query(`SELECT nombre_canton, codigo_canton FROM canton;`)
//     const distrito = await pool.query(`SELECT nombre_distrito, codigo_distrito FROM distrito;`)
//     if(opcion === 0){
//         // nueva info
//         res.render('profile/nuevaInformacion',{ provincia, canton, distrito })
//     } else {
//         // actualizar info
//         const dataDireccion = await pool.query('SELECT direccion FROM direccion where cedula = ?',[req.user.cedula])
//         const dataNumero = await pool.query('SELECT numero FROM telefonos where cedula = ?',[req.user.cedula])
//         res.render('profile/editar', { provincia, canton, distrito, dataDireccion: dataDireccion[0], dataNumero:dataNumero[0] })
//     }

// })

// router.post('/nuevaInfromacion', async (req, res)=>{
//     const {tipo_telefono, numero,codigo_provincia, codigo_canton, codigo_distrito, direccion } = req.body
//     console.log('nueva info')
//     const newTelefono = {
//         tipo_telefono, 
//         numero,
//         cedula: req.user.cedula
//     }
//     const newDireccion = {
//         codigo_provincia,
//         codigo_canton,
//         codigo_distrito,
//         direccion,
//         cedula: req.user.cedula
//     }
//     const d1 = await pool.query('INSERT INTO telefonos SET ?;', [newTelefono])
//     const d2 = await pool.query('INSERT INTO direccion SET ?;', [newDireccion])
//     req.flash('success', 'Nueva información ingresada')
//     res.redirect('/profile')
//     // await pool.query('INSERT direccion SET ? WHERE cedula = ?;'[newDireccion, req.user.cedula])
//     // await pool.query('insert into telefonos SET ?; '[newTelefono])
    
// })

// router.post('/editar', async (req, res) => {
//     console.log(req.body)
//     const {tipo_telefono, numero,codigo_provincia, codigo_canton, codigo_distrito, direccion } = req.body
//     const updTelefono = {
//         tipo_telefono, 
//         numero,
//         cedula: req.user.cedula
//     }
//     const updDireccion = {
//         codigo_provincia,
//         codigo_canton,
//         codigo_distrito,
//         direccion,
//         cedula: req.user.cedula
//     }
//     // console.log(req.user.cedula)
//     const d1 = await pool.query('UPDATE telefonos SET ?;', [updTelefono])
//     const d2 = await pool.query('UPDATE direccion SET ?;', [updDireccion])
//     req.flash('success', 'Información actualizada')
//     res.redirect('/profile')

// })

// module.exports = router 