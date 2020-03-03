const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')

router.get('/', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const dataExist = await pool.query('select id from registro_disciplinario')
        const dataConducts = await pool.query(`
        select b.cedula, a.empleado_id, a.id, a.descripcion, a.fecha as fechaXL, substr(a.fecha, 1, 10) as fecha, b.nombre, b.p_apellido, b.s_apellido, c.nombre_cargo
        from registro_disciplinario a
        inner join empleados b
        on a.empleado_id =  b.id
        inner join tipo_empleados c
        on c.id = b.tipo_empleado
        where a.activo = true and b.activo = true;`)
        res.render('conducts/admHome', { dataExist: dataExist[0], dataConducts })
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const dataConducts = await pool.query(`
        select b.cedula, a.empleado_id, a.id, a.descripcion, a.fecha as fechaXL, substr(a.fecha, 1, 10) as fecha, b.nombre, b.p_apellido, b.s_apellido, c.nombre_cargo
        from registro_disciplinario a
        inner join empleados b
        on a.empleado_id =  b.id
        inner join tipo_empleados c
        on c.id = b.tipo_empleado
        where a.activo = true and b.id = ?;`, [req.user.id])
        const count = await pool.query(`
        select count(empleado_id) as count
        from registro_disciplinario
        where activo = 1 and empleado_id = ?`, [req.user.id])
        console.log(count)
        res.render('conducts/userHome', {dataConducts, count: count[0]})
    } else {
        const data = await pool.query(`
        select a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato, b.descripcion, b.url_documento, substr(b.fecha_despido, 1, 10) as fecha_despido
        from empleados a
        inner join despidos b
        on a.id = b.empleado_id
        where a.id = ? and a.activo = false;`, [req.user.id]) 
        console.log(data)
        res.render('auth/noUser', {data: data[0]})
    }
})

router.get('/admNewRegister', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const dataUsers = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, b.nombre_cargo
        from empleados a
        inner join tipo_empleados b
        on b.id = a.tipo_empleado
        where a.activo = true;`)
        console.log(dataUsers)
        res.render('conducts/admTable', { dataUsers })
    }
})

router.get('/admCreate/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const { id } = req.params
        const dataUser = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, b.nombre_cargo
        from empleados a
        inner join tipo_empleados b
        on b.id = a.tipo_empleado
        where a.id = ? 
        and a.activo = true;`, [id])
        const date = await pool.query('select substr(now(), 1, 10) as fecha')
        console.log(date[0])
        res.render('conducts/admCreate', { dataUser: dataUser[0], date: date[0] })
    }
})

router.post('/admCreate/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const { id } = req.params
        const { fecha, descripcion } = req.body
        const data = {
            fecha,
            descripcion,
            empleado_id: id
        }
        if(data.descripcion.length <= 0){
            req.flash('message', `Por favor ingrese el motivo`)
            return res.redirect('/conduct')
        }
        if(data.descripcion.length >= 300){
            req.flash('message', `Has excedido el número de caracteres validos.`)
            return res.redirect('/conduct')
        }
        if(data.fecha.length <= 0){
            req.flash('message', `Por favor ingrese una fecha valida`)
            return res.redirect('/conduct')
        }
        const query = await pool.query('INSERT INTO registro_disciplinario SET ?', [data])
        res.redirect('/conduct')
    }
})

router.get('/admEditRegister/:id', isLoggedIn, async(req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const {id} = req.params
        const data = await pool.query(`
        select b.cedula, a.empleado_id, a.id, a.descripcion, a.fecha as fechaXL, substr(a.fecha, 1, 10) as fecha, b.nombre, b.p_apellido, b.s_apellido, c.nombre_cargo
        from registro_disciplinario a
        inner join empleados b
        on a.empleado_id =  b.id
        inner join tipo_empleados c
        on c.id = b.tipo_empleado
        where a.id = ?;`, [id])
        const date = await pool.query('select substr(now(), 1, 10) as fecha')
        console.log(date)
        res.render('conducts/admEdit', {data: data[0], date: date[0]})
    }
})

router.post('/admEditRegister/:id', isLoggedIn, async(req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const {id} = req.params
        const { fecha, descripcion } = req.body
        const data = {
            fecha,
            descripcion
        }
        if(data.descripcion.length <= 0){
            req.flash('message', `Por favor ingrese el motivo`)
            return res.redirect('/conduct')
        }
        if(data.descripcion.length >= 300){
            req.flash('message', `Has excedido el número de caracteres validos.`)
            return res.redirect('/conduct')
        }
        if(data.fecha.length <= 0){
            req.flash('message', `Por favor ingrese una fecha valida`)
            return res.redirect('/conduct')
        }
        const query = await pool.query('UPDATE registro_disciplinario SET ? WHERE id = ?', [data, id])
        res.redirect('/conduct')
    }
})

router.get('/admDeleteRegister/:id', isLoggedIn, async(req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const {id} = req.params
        const data = await pool.query(`
        select b.cedula, a.empleado_id, a.id, a.descripcion, a.fecha as fechaXL, substr(a.fecha, 1, 10) as fecha, b.nombre, b.p_apellido, b.s_apellido, c.nombre_cargo
        from registro_disciplinario a
        inner join empleados b
        on a.empleado_id =  b.id
        inner join tipo_empleados c
        on c.id = b.tipo_empleado
        where a.id = ?;`, [id])
        console.log(data)
        res.render('conducts/admDelete', {data: data[0]})
    }
})

router.get('/admDelete/:id', isLoggedIn, async(req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const {id} = req.params
        const data = {
            activo: false
        }
        const query = await pool.query('UPDATE registro_disciplinario SET ? WHERE id = ?;', [data, id])
        res.redirect('/conduct')
    }
})


router.get('/listRegisters', isLoggedIn, async (req, res) => {
    if(req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        res.render('conducts/admListRegisters', { date: date[0] })
    }
})

router.post('/listRegisters', isLoggedIn, async (req, res) => {
    if(req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const {fecha} = req.body
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        let year = fecha.substring(0,4)
        let month = fecha.substring(5,7)
        let day = fecha.substring(8,11)
        const dataConducts = await pool.query(`
        select b.cedula, a.empleado_id, a.id, a.descripcion, a.fecha as fechaXL, substr(a.fecha, 1, 10) as fecha, b.nombre, b.p_apellido, b.s_apellido, c.nombre_cargo
        from registro_disciplinario a
        inner join empleados b
        on a.empleado_id =  b.id
        inner join tipo_empleados c
        on c.id = b.tipo_empleado
        where a.activo = true 
        and b.activo = true
        and year(a.fecha) = ?
        and month(a.fecha) = ?;`, [year, month])
        res.render('conducts/admListRegisters', {dataConducts, date: date[0], year , month})
    }
})

module.exports = router