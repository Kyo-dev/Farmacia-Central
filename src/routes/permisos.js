const express = require('express')
const router = express.Router()
const pool = require('../database')
const {isLoggedIn} = require ('../lib/auth')

router.get('/nuevo', isLoggedIn, (req, res)=>{
    res.render('permisos/nuevo')
})

router.post('/permisos/nuevo', isLoggedIn, async (req, res) => {
    const {_titulo, _descripcion} = req.body
    const query =`
        SET @_empleado_id = ?;
        SET @_titulo = ?;
        SET @_descripcion = ?;
        CALL nuevoPermiso(@_empleado_id,@_titulo, @_descripcion);
    `
    // PASARA AL FINAL DEL [ _TITULO] req.user.id PARA INSERTAR UN PERMISO AL ID DE LA PERSONA (TAMBIEN FUNCIONA CON CEDULA) req.user.cedula
    await pool.query(query, [req.user.id, _titulo, _descripcion]);
    req.flash('success', 'Permiso registrado y pendiente de revision')
    res.redirect('/permisos')
})
    // PARA OBTENER LOS DATOS DEL USUARIO SOLO SE NECESITA PASAR EN EL WHERE = req.user.id O req.user.cedula
router.get('/', isLoggedIn, async (req, res)=>{
    const data = await pool.query('SELECT * FROM permisos where empleado_id = ?', [req.user.id])
    console.log(data)
    res.render('permisos/lista', {data})
})

router.get('/borrar/:id', isLoggedIn, async (req, res)=>{
    const{id} = req.params
    await pool.query('update permisos set activo = false where id = ?', [id])
    req.flash('success', 'Permiso removido satisfactoriamente')
    res.redirect('/permisos')
})

router.get('/editar/:id', isLoggedIn, async(req, res)=>{
    const {id} = req.params
    const data = await pool.query('SELECT * FROM permisos WHERE id = ?', [id])
    res.render('permisos/editar', {data:data[0]})
})

router.post('/editar/:id', isLoggedIn, async (req, res)=>{
    const {id} = req.params
    const {titulo, descripcion} = req.body
    const data ={
        titulo,
        descripcion
    }
    await pool.query('UPDATE permisos SET ? WHERE id = ?', [data, id])
    req.flash('success', 'Permiso actualizado satisfactoriamente')
    res.redirect('/permisos')
})

module.exports = router