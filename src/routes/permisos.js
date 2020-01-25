const express = require('express')
const router = express.Router()
const pool = require('../database')
const {isLoggedIn} = require ('../lib/auth')

router.get('/nuevo', isLoggedIn, (req, res)=>{
    res.render('permisos/nuevo')
})

router.post('/permisos/nuevo', isLoggedIn, async (req, res) => {
    const {_titulo, _descripcion, _fecha_salida} = req.body
    const query =`
        SET @_empleado_id = ?;
        SET @_titulo = ?;
        SET @_descripcion = ?;
        SET @_fecha_salida = ?;
        CALL nuevoPermiso(@_empleado_id,@_titulo, @_descripcion, @_fecha_salida);
    `
    // PASARA AL FINAL DEL [ _TITULO] req.user.id PARA INSERTAR UN PERMISO AL ID DE LA PERSONA (TAMBIEN FUNCIONA CON CEDULA) req.user.cedula
    await pool.query(query, [req.user.id, _titulo, _descripcion, _fecha_salida]);
    req.flash('success', 'Permiso registrado y pendiente de revision')
    res.redirect('/permisos')
})
    // PARA OBTENER LOS DATOS DEL USUARIO SOLO SE NECESITA PASAR EN EL WHERE = req.user.id O req.user.cedula
router.get('/', isLoggedIn, async (req, res)=>{
    const data = await pool.query(`SELECT 
    id, estado_permiso, titulo,descripcion, fecha_solicitud,
    empleado_id , costo_salarial, informacion_estado, substr(fecha_salida, 1, 10) as fecha
    FROM permisos where empleado_id = ? and borrar = false`, [req.user.id])
    res.render('permisos/lista', {data})
})

router.get('/borrar/:id', isLoggedIn, async (req, res)=>{
    const {id} = req.params
    const data = await pool.query('SELECT * FROM permisos WHERE id = ?', [id])
    res.render('permisos/borrar', {data:data[0]})
})

router.get('/editar/:id', isLoggedIn, async(req, res)=>{
    const {id} = req.params
    const data = await pool.query(`SELECT * FROM permisos WHERE id = ?`, [id])
    res.render('permisos/editar', {data:data[0]})
})

router.post('/borrar/:id', isLoggedIn, async (req, res)=>{
    const {id} = req.params
    await pool.query('UPDATE permisos SET borrar = true WHERE id = ?', [id])
    req.flash('success', 'Permiso borrado satisfactoriamente')
    res.redirect('/permisos')
})

router.post('/editar/:id', isLoggedIn, async (req, res)=>{
    const {id} = req.params
    const {titulo, descripcion, fecha_salida} = req.body
    const data ={
        titulo,
        descripcion, 
        fecha_salida
    }
    await pool.query('UPDATE permisos SET ? WHERE id = ?;', [data, id])
    req.flash('success', 'Permiso actualizado satisfactoriamente')
    res.redirect('/permisos')
})

module.exports = router