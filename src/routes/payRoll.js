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
        WHERE a.aprobado = 1 and tipo_empleado <> 1 and temporal = 1 and a.activo = 1; 
        `) // tipo_empleado <> 1 para no ver la data del adm
        console.log(data)
        res.render('payRoll/admHome', { data })
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        res.send('USER')
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
        res.send('USER')
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
        console.log('FECHA: '+ payDay)
        let year = data.payDay.substring(0,4)
        console.log('AÑO: '+year)
        let month = data.payDay.substring(5,7)
        console.log('MES: '+month)
        let permits = 0
        let bonus = 0
        let overTime = 0
        let salaryHour = 0
        let workingDay = 0
        let dayWorks = 0

        const dataPermits = await pool.query(`
        select sum(b.horas) as aux, b.empleado_id
        from permisos b
        inner join empleados a
        on a.id = b.empleado_id
        where b.empleado_id = ?
        and year(b.fecha_salida) = ? 
        and month(b.fecha_salida) = ?
        and a.activo = true;`, [id, year, month])
        if(dataPermits[0].aux >= 0) permits = dataPermits[0].aux
        if (typeof permits === "object") permits = 0
        console.log(`SOY PERMITS ${permits}`)
                
        const dataBonus = await pool.query(`
        select sum(b.cantidad) as aux, b.empleado_id
        from bonos b
        inner join empleados a
        on a.id = b.empleado_id
        where b.empleado_id = ?
        and year(b.fecha) = ?
        and month(b.fecha) = ?
        and a.activo = true;`, [id, year, month])
        if (dataBonus[0].aux >= 0) bonus = dataBonus[0].aux
        if (typeof bonus === "object") bonus = 0
        console.log(`SOY BONUS ${bonus}`)
        
        const dataOverTime = await pool.query(`
        select sum(b.cantidad_horas) as aux, b.empleado_id
        from horas_extra b
        inner join empleados a
        on a.id = b.empleado_id
        where b.empleado_id = ?
        and year(b.fecha) = ?
        and month(b.fecha) = ?
        and a.activo = true;`, [id, year, month])
        if(dataOverTime[0].aux >= 0) overTime = dataOverTime[0].aux
        if (typeof overTime === "object")overTime = 0
        console.log(`SOY OVERTIME ${overTime}`)
        const dataSalary = await pool.query(`
        select b.salario_hora, b.jornada , b.empleado_id
        from salarios b
        inner join empleados a
        on a.id = b.empleado_id
        where b.empleado_id = ?
        and a.activo = true;`, [id])
        salaryHour = dataSalary[0].salario_hora
        workingDay = dataSalary[0].jornada
        console.log(`SOY SALARIO POR HORA ${salaryHour}`)
        console.log(`SOY JORNADA ${workingDay}`)
        const dataDayWorks = await pool.query(`
        select sum(b.contador_dias) as aux, b.empleado_id
        from asistencia b
        inner join empleados a
        on a.id = b.empleado_id
        where b.empleado_id = ?
        and year(b.fecha) = ?
        and month(b.fecha) = ?
        and a.activo = true;`, [id, year, month])
        if(dataDayWorks[0].aux >= 0) dayWorks = dataDayWorks[0].aux
        if (typeof dayWorks === "object")dayWorks = 0
        console.log(`SOY LOS DIAS DE TRABAJADOS ${dayWorks}`)
        // TODOS LOS DATOS
        // SALARIO BASE
        //((((dias trabajados * jornada diaria) - permisos)* salario por hora) + bonos ) + (salario por hora + (overtime * 2))
        let salarioBase = ((((dayWorks * workingDay)-permits)*salaryHour) + bonus) + (salaryHour * (overTime * 2))
        console.log(salarioBase)
        // DATOS DE CCSS
        res.send('ADM')
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        res.send('USER')
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