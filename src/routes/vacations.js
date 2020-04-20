const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')
const moment = require('moment')

router.get('/', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const data = await pool.query(`
        select a.nombre, a.cedula, a.p_apellido, a.s_apellido, b.nombre_cargo, TRUNCATE(c.cantidad_dias_disponibles/ 30, 0) as dias, substr(d.fecha_entrada, 1, 10) as fecha_entrada, substr(d.fecha_salida, 1, 10) as fecha_salida,  DATEDIFF( d.fecha_entrada, d.fecha_salida) as diferencia 
        from empleados a
        inner join tipo_empleados b
        on b.id = a.tipo_empleado
        inner join dias_disponibles c
        on c.empleado_id = a.id
        inner join fechas_vacaciones d
        on d.empleado_id = a.id
        where a.activo = true
        order by d.id desc`)
        console.log(data)
        res.render('vacations/admHome', { data })
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        // USER HOME
        const dataUser = await pool.query('SELECT id FROM empleados WHERE id = ?;', [req.user.id])
        const dataDay = await pool.query(`
        select empleado_id, cantidad_dias_disponibles
        from dias_disponibles
        where empleado_id = ?;`, [req.user.id])
        const dataVacations = await pool.query(`
        select empleado_id, id, substr(fecha_salida, 1, 10) as fecha_salida, substr(fecha_entrada, 1, 10) as fecha_entrada
        from fechas_vacaciones
        where empleado_id = ?;`, [req.user.id])
        // console.log({ dataDay, dataVacations })
        res.render('vacations/userHome', { dataDay: dataDay[0], dataUser: dataUser[0], dataVacations })
    } else {
        const data = await pool.query(`
        select a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato, b.descripcion, b.url_documento, substr(b.fecha_despido, 1, 10) as fecha_despido
        from empleados a
        inner join despidos b
        on a.id = b.empleado_id
        where a.id = ? and a.activo = false;`, [req.user.id])
        console.log(data)
        res.render('auth/noUser', { data: data[0] })
    }
})

router.get('/userNewRegister/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado !== 1) {
        const { id } = req.params
        const date = await pool.query(`select substr(now(), 1, 10) as fecha;`)
        const dataDay = await pool.query(`
        select empleado_id, cantidad_dias_disponibles
        from dias_disponibles
        where empleado_id = ?;`, [id])
        const dataVacations = await pool.query(`
        select empleado_id, id, fecha_salida, fecha_entrada
        from fechas_vacaciones
        where empleado_id = ?;`, [id])
        console.log(dataDay)
        const dataUser = await pool.query('SELECT id FROM empleados WHERE id = ?;', [req.user.id])
        console.log(id)
        let days = (dataDay[0].cantidad_dias_disponibles)
        let out = ''
        if (days > 30) {
            out = Math.trunc(days / 30)
        } else {
            out = 'No hay días disponibles'
        }
        // console.log(dataUser)
        res.render('vacations/userNewRegister', { out, dataUser: dataUser[0], date: date[0] })
    }
})

router.post('/userNewRegister/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado !== 1) {
        const { id } = req.params
        const { fecha_salida, fecha_entrada } = req.body
        let fecha1 = moment(fecha_salida);
        let fecha2 = moment(fecha_entrada);
        const valid = fecha2.diff(fecha1, 'days');//DIAS DEL FORMULARIO
        const data = {
            fecha_entrada,
            fecha_salida,
            empleado_id: id,
            cantidad: valid
        }
        // console.log('Dias del formulario ' + valid) //DIAS DEL FORMULARIO
        const aux = valid * 30
        // console.log('AUX: ' + aux)
        const dataDay = await pool.query(`
        select empleado_id, cantidad_dias_disponibles
        from dias_disponibles
        where empleado_id = ?;`, [id])
        const days = (dataDay[0].cantidad_dias_disponibles) //TODOS LOS DIAS DE LA DB
        const out = Math.trunc(days / 30)
        // console.log('DIAS DISPONIBLES ' + out)
        // console.log('TODOS LOS DIAS DE LA DB: ' + days)
        if (aux <= days && data.fecha_salida < data.fecha_entrada) {
            let daysDB = days - aux // LOS DIAS QUE SOBRAN PARA LA DB
            // console.log('SOBRO ' + daysDB)// LOS DIAS QUE SOBRAN PARA LA DB
            // console.log('Dias que sobran para la db ' + daysDB)
            const objInsert = {
                cantidad_dias_disponibles: daysDB
            }
            try {
                await pool.query('INSERT INTO fechas_vacaciones SET ?;', [data, id])
                await pool.query('UPDATE dias_disponibles SET ? WHERE empleado_id = ?;', [objInsert, id])
                req.flash('success', 'Registro realizado satisfactoriamente')
                res.redirect('/vacations')
            } catch (error) {
                req.flash('message', 'Error en los datos')
                res.redirect('/vacations')
                console.log(error)
            }
        } else {
            req.flash('message', `Tienes ${out} días disponibles y has solicitado ${valid} días.`)
            res.redirect('/vacations')
        }
    }
})

router.get('/listRegisters', isLoggedIn, async (req, res) => {
    if(req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        res.render('vacations/admListRegisters', { date: date[0] })
    }
})


router.post('/listRegisters', isLoggedIn, async (req, res) => {
    if(req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const {fecha} = req.body
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        let year = fecha.substring(0,4)
        let month = fecha.substring(5,7)
        let day = fecha.substring(8,11)
        const data = await pool.query(`
        select a.nombre, a.cedula, a.p_apellido, a.s_apellido, b.nombre_cargo, TRUNCATE(c.cantidad_dias_disponibles/ 30, 0) as dias, substr(d.fecha_entrada, 1, 10) as fecha_entrada, substr(d.fecha_salida, 1, 10) as fecha_salida,  DATEDIFF( d.fecha_entrada, d.fecha_salida) as diferencia 
        from empleados a
        inner join tipo_empleados b
        on b.id = a.tipo_empleado
        inner join dias_disponibles c
        on c.empleado_id = a.id
        inner join fechas_vacaciones d
        on d.empleado_id = a.id
        where a.activo = true
        AND year(d.fecha_salida) = ?
        order by d.id desc`, [year])
        console.log(data)
        res.render('vacations/admListRegisters', {data, date: date[0], year})
    }
})
module.exports = router