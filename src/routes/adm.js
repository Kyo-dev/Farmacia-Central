const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn, isNotLoggedIn } = require('../lib/auth')

// PERMISOS
// SECTION

router.get('/permisos', isLoggedIn, async (req, res) => {
    const data = await pool.query(`
    select a.id, b.nombre, b.p_apellido, b.cedula, a.estado_permiso, a.titulo, a.descripcion, substr(a.fecha_solicitud, 1, 10) as fecha_solicitud, empleado_id,
    a.activo, a.empleado_id , a.costo_salarial, a.informacion_estado, substr(a.fecha_salida, 1, 10) as fecha_salida
    from permisos a
    inner join empleados b
    on a.empleado_id = b.id
    where a.activo = true;
    `)
    res.render('adm/permisos', { data })
})

router.get('/permiso/editar/:id', isLoggedIn, async (req, res) => {
    const {id} = req.params
    const data = await pool.query(`
    select a.id, b.cedula, a.estado_permiso, a.titulo, a.descripcion, substr(a.fecha_salida, 1, 10) as fecha_salida,  substr(a.fecha_solicitud, 1, 10) as fecha_solicitud, empleado_id,
    a.activo, a.empleado_id , a.costo_salarial, a.informacion_estado
    from permisos a
    inner join empleados b
    on a.empleado_id = b.id
    where a.id = ?;`,[id])
    res.render('adm/revisarPermiso', { data: data[0]})
})

router.post('/permiso/editar/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const { informacion_estado, estado_permiso, costo_salarial } = req.body
    const data = {
        informacion_estado, 
        estado_permiso, 
        costo_salarial
    }
    await pool.query('UPDATE permisos SET ? WHERE id = ?', [data, id])
    req.flash('success', 'Permiso actualizado satisfactoriamente')
    res.redirect('/adm/permisos')
})

router.get('/permiso/borrar/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const data = await pool.query(`
    select a.id, b.cedula, a.estado_permiso, a.titulo, a.descripcion, substr(a.fecha_salida, 1, 10) as fecha_salida,  substr(a.fecha_solicitud, 1, 10) as fecha_solicitud, empleado_id,
    a.activo, a.empleado_id , a.costo_salarial, a.informacion_estado
    from permisos a
    inner join empleados b
    on a.empleado_id = b.id
    where a.id = ?;`,[id])
    res.render('adm/borrarPermiso', { data: data[0]})
})

router.get('/permiso/eliminar/:id', isLoggedIn, async (req, res)=>{
    const{id} = req.params
    await pool.query('update permisos set activo = false where id = ?', [id])
    req.flash('success', 'Permiso eliminado satisfactoriamente')
    res.redirect('/adm/permisos')
})

// !SECTION 

// USUARIOS
// SECTION
router.get('/usuarios', isLoggedIn, async(req, res)=>{
    const data = await pool.query(`SELECT * FROM empleados`)
    console.log(data)
    res.render('adm/usuarios', {data})
})
// !SECTION 

module.exports = router