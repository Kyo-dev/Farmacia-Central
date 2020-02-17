const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')

router.get('/', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const data = await pool.query(`
        Select a.cedula, a.nombre, a.p_apellido, a.s_apellido, b.motivo, substr(b.fecha, 1, 10) as fecha, b.cantidad_horas, b.id , b.estado, c.nombre_cargo
        From empleados a 
        INNER JOIN horas_extra b
        ON a.id = b.empleado_id
        INNER JOIN tipo_empleados c
        ON a.tipo_empleado = c.id
        WHERE estado = 1 
        AND b.activo = true
        AND a.activo = true;`)
        const dataGeneral = await pool.query(`
        Select a.cedula, a.nombre, a.p_apellido, a.s_apellido, b.motivo, substr(b.fecha, 1, 10) as fecha, b.cantidad_horas, b.id , b.estado, c.nombre_cargo, b.informacion_estado
        From empleados a 
        INNER JOIN horas_extra b
        ON a.id = b.empleado_id
        INNER JOIN tipo_empleados c
        ON a.tipo_empleado = c.id
        order by b.id desc;`)
        res.render('overTime/admHome', { data, dataGeneral })
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const data = await pool.query(`
        SELECT substr(fecha, 1, 10) as fecha, motivo, estado, id, activo, informacion_estado
        FROM horas_extra
        WHERE empleado_id = ? AND activo = true
        order by id desc;;`, [req.user.id])
        console.log(data)
        res.render('overTime/userHome', { data })
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

router.get('/newRegister', isLoggedIn, async (req, res) => {
    res.render('overTime/userNewRegister')
})

router.post('/newRegister', isLoggedIn, async (req, res) => {
    const { cantidad_horas, motivo } = req.body
    const data = {
        cantidad_horas,
        motivo,
        empleado_id: req.user.id
    }
    if (cantidad_horas <= 0) {
        req.flash('message', `El valor ${cantidad_horas} debe ser un numero positivo`)
        res.redirect('/overTime')
    }
    if (cantidad_horas >= 16) {
        req.flash('message', `La cantidad de horas ${cantidad_horas} no pueden ser correctas.`)
        res.redirect('/overTime')
    }
    if (motivo.length <= 0) {
        req.flash('message', `Por favor especifíque su trabajo durante las horas extra`)
        res.redirect('/overTime')
    }
    if (motivo.length >= 150) {
        req.flash('message', `Por favor disminuya la explicación, solo explique la labores que realizó.`)
        res.redirect('/overTime')
    }
    const query = pool.query('INSERT INTO horas_extra SET ?', [data])
    req.flash('success', `Registro realizado y pendiente de revision`)
    res.redirect('/overTime')
})

router.get('/userDelete/:id', isLoggedIn, async (req, res) => {
    const {id} = req.params
    const data = await pool.query(`
    SELECT a.id, a.activo, a.informacion_estado, substr(a.fecha, 1, 10) as fecha, a.cantidad_horas, a.motivo, b.estado
    FROM horas_extra a
    INNER JOIN estados b
    ON b.id = a.estado
    WHERE a.activo = true
    AND a.id = ?
    order by a.id desc;;`, [id])
    console.log(data[0])
    res.render('overTime/userDelete',{data: data[0]})
})

router.post('/userDelete/:id', isLoggedIn, async(req, res) => {
    const {id} = req.params
    const query = await pool.query('UPDATE horas_extra SET activo = false WHERE id = ?', [id])
    req.flash('success', 'Se ha borrado el registro satisfactoriamente')
    res.redirect('/overTime')
})

router.get('/admNewRegister/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const data = await pool.query(`
        Select a.cedula, a.nombre, a.p_apellido, a.s_apellido, b.motivo, substr(b.fecha, 1, 10) as fecha, b.cantidad_horas, b.id, c.nombre_cargo
        From empleados a 
        INNER JOIN horas_extra b
        ON a.id = b.empleado_id
        INNER JOIN tipo_empleados c
        on c.id = a.tipo_empleado
        where b.id = ?
        order by b.id desc;`, [id])
        console.log(data[0])
        res.render('overTime/admCheck', { data: data[0] })
    } else {
        req.flash('message', 'Solo los administradores pueden estar aquí')
        res.redirect('/overTime')
    }
})

router.post('/admNewRegister/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        console.log(id)
        const { informacion_estado, estado } = req.body
        const data = {
            estado,
            informacion_estado
        }
        if(data.estado.length <= 0){
            req.flash('message', 'Por favor especifique el estado del mensaje')
            return res.redirect('/overTime')
        }
        if(data.informacion_estado.length <=0){
            req.flash('message', 'Por favor agrege una anotación')
            return res.redirect('/overTime')
        }
        const query = await pool.query('UPDATE horas_extra SET ? WHERE id = ?', [data, id])
        req.flash('success', 'Registro realizado satisfactoriamente')
        return res.redirect('/overTime')
    } else {
        req.flash('message', 'Solo los administradores pueden estar aquí')
        res.redirect('/overTime')
    }
})

module.exports = router