const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')

router.get('/', isLoggedIn, async (req, res) => {
    if(req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const dataToDo = await pool.query(`
        SELECT a.id, a.titulo, a.descripcion, a.fecha_solicitud, b.nombre_cargo, c.estado
        FROM tareas a
        INNER JOIN tipo_empleados b
        ON a.tipo_empleado = b.id
        INNER JOIN estados c
        ON a.estado = c.id
        WHERE a.activo = true
        AND a.estado = 1
        AND year(a.fecha_solicitud) = substr(now(), 1, 4)
        AND month(a.fecha_solicitud) = substr(now(), 6, 2) 
        AND day(a.fecha_solicitud) = substr(now(), 9, 2) ;`)
        const dataDone = await pool.query(`
        SELECT a.id, a.titulo, a.descripcion, a.fecha_solicitud, b.nombre_cargo, c.estado, d.fecha_realizacion, e.nombre, e.p_apellido, e.s_apellido
        FROM tareas a
        INNER JOIN tipo_empleados b
        ON a.tipo_empleado = b.id
        INNER JOIN estados c
        ON a.estado = c.id
        INNER JOIN realizar_tarea d
        ON d.id_tarea = a.id
        INNER JOIN empleados e
        ON d.empleado_id = e.id
        WHERE a.activo = true
        AND year(a.fecha_solicitud) = substr(now(), 1, 4)
        AND month(a.fecha_solicitud) = substr(now(), 6, 2) 
        AND day(a.fecha_solicitud) = substr(now(), 9, 2) ;`)
        res.render('tasks/admHome', {dataToDo, dataDone})
        console.log(dataDone)
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const dataToDo = await pool.query(`
        SELECT a.id, a.titulo, a.descripcion, a.fecha_solicitud, b.nombre_cargo, b.id as rol, c.estado
        FROM tareas a
        INNER JOIN tipo_empleados b
        ON a.tipo_empleado = b.id
        INNER JOIN estados c
        ON a.estado = c.id
        WHERE a.activo = true
        AND a.estado = 1
        AND b.id = ?;`, [req.user.tipo_empleado])
        console.log(dataToDo)
        res.render('tasks/userHome', {dataToDo})
    }
})

router.get('/admNewRegister', isLoggedIn, async (req, res) =>{
    if(req.user.tipo_empleado === 1 && req.user.activo === 1) {
        res.render('tasks/admNewRegister')
    }
})

router.post('/admNewRegister', isLoggedIn, async (req, res) => {
    if(req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const {titulo, descripcion, tipo_empleado} = req.body
        const data = {
            titulo,
            descripcion, 
            tipo_empleado
        }
        if(data.titulo.length <= 0){
            req.flash('message', 'Por favor especifica un titulo para la tarea')
            res.redirect('/tasks')
        }
        if(data.titulo.length >= 50){
            req.flash('message', 'El titulo de la tarea es muy grande.')
            res.redirect('/tasks')
        }
        if(data.descripcion.length <= 0){
            req.flash('message', 'Por favor detalla la tarea')
            res.redirect('/tasks')
        }
        if(data.descripcion.length >= 300){
            req.flash('message', 'La descripción de la tarea es muy grande.')
            res.redirect('/tasks')
        }
        console.log(data)
        try {
            await pool.query('INSERT INTO tareas SET ?;', [data])
            req.flash('success', 'Tarea creada satisfactoriamente')
            res.redirect('/tasks')
        } catch (error) {
            console.log(error)
            req.flash('message', 'Ha ocurrido un error, por favor intentelo de nuevo.')
            res.redirect('/tasks')
        }
    }
})

router.get('/userCheck/:id', isLoggedIn, async (req, res) => {
    if(req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const {id} = req.params
        const dataTask = await pool.query(`
        SELECT a.id, a.titulo, a.descripcion, a.fecha_solicitud,  substr(a.fecha_solicitud, 1, 10) as fecha, b.nombre_cargo, c.estado
        FROM tareas a
        INNER JOIN tipo_empleados b
        ON a.tipo_empleado = b.id
        INNER JOIN estados c
        ON a.estado = c.id
        WHERE a.activo = true
        AND a.estado = 1
        AND a.id = ?;`, [id])
        console.log(dataTask[0])
        res.render('tasks/userCheck', {dataTask: dataTask[0]})
    }
})

router.post('/userCheck/:id' ,isLoggedIn, async(req, res)=>{
    if(req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const {id} = req.params
        const task = {
            estado: 4
        }
        const infoTask = {
            empleado_id: req.user.id,
            id_tarea: id
        }
        try {
            await pool.query('UPDATE tareas SET ? WHERE id = ?;', [task, id])
            await pool.query('INSERT INTO realizar_tarea SET ?;', [infoTask])
            req.flash('success', 'Has marcado la tarea como realizada, gracias.')
            res.redirect('/tasks')
        } catch (error) {
            console.log(error)
            req.flash('message', 'Error, vuelva a intentarlo.')
            res.redirect('/tasks')
        }
    }
})

router.get('/listRegisters', isLoggedIn, async (req, res) => {
    if(req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        res.render('tasks/admListRegister', { date: date[0] })
    }
})

router.post('/listRegisters', isLoggedIn, async (req, res) => {
    if(req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const {fecha} = req.body
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        let year = fecha.substring(0,4)
        let month = fecha.substring(5,7)
        let day = fecha.substring(8,11)
        const dataToDo = await pool.query(`
        SELECT a.id, a.titulo, a.descripcion, a.fecha_solicitud, b.nombre_cargo, c.estado
        FROM tareas a
        INNER JOIN tipo_empleados b
        ON a.tipo_empleado = b.id
        INNER JOIN estados c
        ON a.estado = c.id
        WHERE a.activo = true
        AND a.estado = 1
        AND year(a.fecha_solicitud) = ?
        AND  month(a.fecha_solicitud) = ?
        AND day(a.fecha_solicitud) =?;`, [year, month, day])
        const dataDone = await pool.query(`
        SELECT a.id, substr(a.fecha_solicitud, 1, 10) as fecha, a.titulo, a.descripcion, a.fecha_solicitud, b.nombre_cargo, c.estado, d.fecha_realizacion, e.nombre, e.p_apellido, e.s_apellido
        FROM tareas a
        INNER JOIN tipo_empleados b
        ON a.tipo_empleado = b.id
        INNER JOIN estados c
        ON a.estado = c.id
        INNER JOIN realizar_tarea d
        ON d.id_tarea = a.id
        INNER JOIN empleados e
        ON d.empleado_id = e.id
        WHERE a.activo = true
        AND a.estado = 4
        AND year(a.fecha_solicitud) = ?
        AND  month(a.fecha_solicitud) = ?
        AND day(a.fecha_solicitud) =?;`, [year, month, day])
        console.log(dataDone)
        console.log(year, month, day)
        res.render('tasks/admListRegister', {dataToDo, dataDone, date: date[0]})
    }
})

module.exports = router