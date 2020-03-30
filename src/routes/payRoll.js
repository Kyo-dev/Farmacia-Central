const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')

router.get('/', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const data = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato ,c.salario_hora, c.jornada, d.nombre_cargo
        From empleados a
        INNER JOIN salarios c
        ON a.id = c.empleado_id
        INNER JOIN tipo_empleados d
        ON a.tipo_empleado = d.id
        WHERE a.aprobado = 1
        and a.activo = 1; 
        `) // tipo_empleado <> 1 para no ver la data del adm
        console.log(data)
        res.render('payRoll/admHome', { data })
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        const dataSalary = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, 
        substr(a.fecha_contrato, 1, 10) as fecha_contrato,
        c.salario_hora, c.jornada, d.nombre_cargo
        From empleados a
        INNER JOIN salarios c
        ON a.id = c.empleado_id
        INNER JOIN tipo_empleados d
        ON a.tipo_empleado = d.id
        WHERE a.id = ?;`, [req.user.id])
        res.render('payRoll/userHome', {dataSalary: dataSalary[0],  date: date[0]})
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

router.get('/admCheck/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const dataSalary = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, 
        substr(a.fecha_contrato, 1, 10) as fecha_contrato,
        c.salario_hora, c.jornada, d.nombre_cargo
        From empleados a
        INNER JOIN salarios c
        ON a.id = c.empleado_id
        INNER JOIN tipo_empleados d
        ON a.tipo_empleado = d.id
        WHERE a.id = ?;`, [id])
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        console.log(date)
        res.render('payRoll/admCheck', { dataSalary: dataSalary[0], date: date[0] })
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        res.redirect('/salary')
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

router.post('/admCheck/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const { payDay } = req.body
        const data = {
            payDay
        }
        let year = data.payDay.substring(0,4)
        let month = data.payDay.substring(5,7)
        const bonus = await pool.query(`Select sum(cantidad) as aux from bonos 
            where activo = true 
            and empleado_id = ? 
            and year(fecha) = ? 
            and month(fecha) = ?;`, [id, year, month])
        const overTime = await pool.query(`Select sum(cantidad_horas) as aux from horas_extra 
            where activo = true
            and empleado_id = ?
            and year(fecha) = ?
            and month(fecha) = ?
            and estado = 2`, [id, year, month])
        const permits = await pool.query(`Select sum(horas) as aux
            from permisos 
            where activo = true 
            and empleado_id = ? 
            and year(fecha_salida) = ?
            and month(fecha_salida) = ?
            and estado = 2;`,[id, year, month])
        const salary = await pool.query(`Select c.salario_hora, c.jornada
            From empleados a
            INNER JOIN salarios c
            ON a.id = c.empleado_id
            WHERE a.id = ?`, [id])
        const tax = await pool.query(`Select sum(retencion) as aux from retencion_salarial where empleado_id = ?;`, [id])
        const employee = await pool.query(`Select nombre, cedula, p_apellido, s_apellido from empleados where id = ?;`, [id])
        const salaryB = await pool.query (`select salarioBrutoEmpleado(${id}, ${month}, ${year}) as bruto;`)
        const salaryN = await pool.query (`select salarioNetoEmpleado(${id}, ${month}, ${year}) as neto;`)
        const salaryA = await pool.query (`select salarioAguinaldo(${id}, ${month}, ${year}) as aguinaldo;`)
        const salaryP = await pool.query (`select salarioEmpleado(${id}, ${month}, ${year}) as pago;`)
            console.log(tax)
            res.render('payRoll/admView', {month,year,salary: salary[0],salaryB: salaryB[0], salaryN: salaryN[0], salaryA: salaryA[0], salaryP: salaryP[0], employee: employee[0], tax: tax[0], bonus: bonus[0], permits: permits[0], overTime: overTime[0]})
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const { payDay } = req.body
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        const data = {
            payDay
        }
        const id = req.user.id
        let year = data.payDay.substring(0,4)
        let month = data.payDay.substring(5,7)
        const bonus = await pool.query(`Select sum(cantidad) as aux from bonos 
            where activo = true 
            and empleado_id = ? 
            and year(fecha) = ? 
            and month(fecha) = ?;`, [id, year, month])
        const overTime = await pool.query(`Select sum(cantidad_horas) as aux from horas_extra 
            where activo = true
            and empleado_id = ?
            and year(fecha) = ?
            and month(fecha) = ?
            and estado = 2`, [id, year, month])
        const permits = await pool.query(`Select sum(horas) as aux
            from permisos 
            where activo = true 
            and empleado_id = ? 
            and year(fecha_salida) = ?
            and month(fecha_salida) = ?
            and estado = 2;`,[id, year, month])
        const salary = await pool.query(`Select c.salario_hora, c.jornada
            From empleados a
            INNER JOIN salarios c
            ON a.id = c.empleado_id
            WHERE a.id = ?`, [id])
        const tax = await pool.query(`Select sum(retencion) as aux from retencion_salarial where empleado_id = ?;`, [id])
        const employee = await pool.query(`Select nombre, cedula, p_apellido, s_apellido from empleados where id = ?;`, [id])
        const salaryB = await pool.query (`select salarioBrutoEmpleado(${id}, ${month}, ${year}) as bruto;`)
        const salaryN = await pool.query (`select salarioNetoEmpleado(${id}, ${month}, ${year}) as neto;`)
        const salaryA = await pool.query (`select salarioAguinaldo(${id}, ${month}, ${year}) as aguinaldo;`)
        const salaryP = await pool.query (`select salarioEmpleado(${id}, ${month}, ${year}) as pago;`)
            console.log(tax)
            res.render('payRoll/admView', {date: date[0], month,year,salary: salary[0],salaryB: salaryB[0], salaryN: salaryN[0], salaryA: salaryA[0], salaryP: salaryP[0], employee: employee[0], tax: tax[0], bonus: bonus[0], permits: permits[0], overTime: overTime[0]})
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


module.exports = router 