const express = require('express')
const router = express.Router()
const pool = require('../database')

router.get('/nuevo', (req, res)=>{
    res.render('permisos/nuevo')
})

router.post('/permisos/nuevo', async (req, res) => {
    const {_titulo, _descripcion} = req.body
    const query =`
        SET @_titulo = ?;
        SET @_descripcion = ?;
        CALL nuevoPermiso(@_titulo, @_descripcion);
    `
    await pool.query(query, [_titulo, _descripcion]);
    req.flash('success', 'Permiso registrado y pendiente de revision')
    res.redirect('/permisos')
})

router.get('/', async (req, res)=>{
    const data = await pool.query('SELECT * FROM permisos where activo = true ')
    console.log(data)
    res.render('permisos/lista', {data})
})

router.get('/borrar/:id', async (req, res)=>{
    const{id} = req.params
    await pool.query('update permisos set activo = false where id = ?', [id])
    req.flash('success', 'Permiso removido satisfactoriamente')
    res.redirect('/permisos')
})

router.get('/editar/:id', async(req, res)=>{
    const {id} = req.params
    const data = await pool.query('SELECT * FROM permisos WHERE id = ?', [id])
    res.render('permisos/editar', {data:data[0]})
})

router.post('/editar/:id', async (req, res)=>{
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