const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')

router.get('/', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const data = await pool.query(`
        select a.id, b.nombre, b.p_apellido, b.cedula, a.estado_permiso, a.titulo, a.descripcion, substr(a.fecha_solicitud, 1, 10) as fecha_solicitud, empleado_id,
        a.activo, a.empleado_id , a.costo_salarial, a.informacion_estado, substr(a.fecha_salida, 1, 10) as fecha_salida
        from permisos a
        inner join empleados b
        on a.empleado_id = b.id
        where a.activo = true;`)
        res.render('permits/admHome', { data })
    } else {
        const data = await pool.query(`SELECT 
        id, estado_permiso, titulo,descripcion, fecha_solicitud,
        empleado_id , costo_salarial, informacion_estado, substr(fecha_salida, 1, 10) as fecha
        FROM permisos where empleado_id = ? and borrar = false`, [req.user.id])
        res.render('permits/userHome', { data })
    }
})

router.get('/userNewRegister', isLoggedIn, (req, res) => {
    res.render('permits/userNewRegister')
})

// router.post('/userNewRegister', isLoggedIn, async (req, res) => {
//     const { titulo, descripcion, fecha_salida } = req.body
//     const data = {
//         titulo,
//         descripcion,
//         fecha_salida,
//         empleado_id: req.user.id
//     }
//     if(titulo.length <= 0){
//         req.flash('message', `Por favor ingrese un titulo`)
//         res.redirect('/profile')
//     }
//     if(descripcion.length <= 0){
//         req.flash('message', `Por favor ingrese una descripcion`)
//         res.redirect('/profile')
//     }
//     if(fecha_salida.length <= 0){
//         req.flash('message', `Por favor ingrese una fecha`)
//         res.redirect('/profile')
//     }
    
//     const query = await pool.query('INSERT INTO permisos SET ?;', [data]);
//     req.flash('success', 'Permiso registrado y pendiente de revision')
//     res.redirect('/profile')
// })

router.get('/userEdit/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const data = await pool.query(`SELECT * FROM permisos WHERE id = ?`, [id])
    res.render('permits/userEdit', { data: data[0] })
})

router.post('/userEdit/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const { titulo, descripcion, fecha_salida } = req.body
    const data = {
        titulo,
        descripcion,
        fecha_salida
    }
    await pool.query('UPDATE permisos SET ? WHERE id = ?;', [data, id])
    req.flash('success', 'Permiso actualizado satisfactoriamente')
    res.redirect('/profile')
})

router.get('/userDelete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const data = await pool.query('SELECT * FROM permisos WHERE id = ?', [id])
    res.render('permits/userDelete', { data: data[0] })
})

router.post('/userDelete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    await pool.query('UPDATE permisos SET borrar = true WHERE id = ?', [id])
    req.flash('success', 'Permiso borrado satisfactoriamente')
    res.redirect('/profile')
})

router.get('/admCheck/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const {id} = req.params
        const data = await pool.query(`
        select a.id, b.cedula, a.estado_permiso, a.titulo, a.descripcion, substr(a.fecha_salida, 1, 10) as fecha_salida,  substr(a.fecha_solicitud, 1, 10) as fecha_solicitud, empleado_id,
        a.activo, a.empleado_id , a.costo_salarial, a.informacion_estado
        from permisos a
        inner join empleados b
        on a.empleado_id = b.id
        where a.id = ?;`,[id])
        res.render('permits/admCheck', {data: data[0]})
    }
})

router.post('/admCheck/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const { informacion_estado, estado_permiso, costo_salarial } = req.body
        const data = {
            informacion_estado, 
            estado_permiso, 
            costo_salarial
        }
        const query = await pool.query('UPDATE permisos SET ? WHERE id = ?', [data, id])
        req.flash('success', 'Permiso actualizado satisfactoriamente')
        res.redirect('/profile')
    }
})

router.get('/admDelete/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const data = await pool.query(`
        select a.id, b.cedula, a.estado_permiso, a.titulo, a.descripcion, substr(a.fecha_salida, 1, 10) as fecha_salida,  substr(a.fecha_solicitud, 1, 10) as fecha_solicitud, empleado_id,
        a.activo, a.empleado_id , a.costo_salarial, a.informacion_estado
        from permisos a
        inner join empleados b
        on a.empleado_id = b.id
        where a.id = ?;`,[id])
        res.render('permits/admDelete', { data: data[0]})
    }
})

router.get('/admConfirmDelete/:id', isLoggedIn, async (req, res)=>{
    if (req.user.tipo_empleado === 1) {
        const{id} = req.params
        await pool.query('update permisos set activo = false where id = ?', [id])
        req.flash('success', 'Permiso eliminado satisfactoriamente')
        res.redirect('/profile')
    }
})

module.exports = router