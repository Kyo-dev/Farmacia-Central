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
        let ccss = 0
        let tax = 0
        const dataUser = await pool.query(`
        select cedula, nombre, p_apellido, s_apellido
        from empleados
        where id = ?`, [id])
        const dataPermits = await pool.query(`
        select sum(b.horas) as aux, b.empleado_id
        from permisos b
        inner join empleados a
        on a.id = b.empleado_id
        where b.empleado_id = ?
        and year(b.fecha_salida) = ? 
        and month(b.fecha_salida) = ?
        and a.activo = true
        and estado = 2;`, [id, year, month])
        if(dataPermits[0].aux >= 0) permits = dataPermits[0].aux
        if (typeof permits === "object") permits = 0
        console.log(`PERMISOS ${permits}`)
                
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
        console.log(`BONOS ${bonus}`)
        
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
        console.log(`HORAS EXTRA ${overTime}`)
        const dataSalary = await pool.query(`
        select b.salario_hora, b.jornada , b.empleado_id
        from salarios b
        inner join empleados a
        on a.id = b.empleado_id
        where b.empleado_id = ?
        and a.activo = true;`, [id])
        salaryHour = dataSalary[0].salario_hora
        workingDay = dataSalary[0].jornada
        console.log(`SALARIO POR HORA ${salaryHour}`)
        console.log(`JORNADA ${workingDay}`)
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
        console.log(`DIAS DE TRABAJADOS ${dayWorks}`)

        const dataTax = await pool.query(`
        select sum(b.retencion) as aux, b.empleado_id
        from retencion_salarial b
        inner join empleados a
        on a.id = b.empleado_id
        where b.empleado_id = ?
        and year(b.fecha) = ?
        and month(b.fecha) = ?
        and a.activo = true;`, [id, year, month])
        if(dataTax[0].aux >= 0) tax = dataTax[0].aux
        if (typeof tax === "object")tax = 0
        console.log('RETENCIONES: '+ tax)
        // TODOS LOS DATOS
        // SALARIO BASE
        //(((dias trabajados * jornada diaria) - permisos)* salario por hora) + (salario por hora + (overtime * 2))
        ccss = (((((dayWorks * workingDay)-permits)*salaryHour) + (salaryHour * (overTime * 2))) * 10.5 ) / 100
        let baseSalary = (((((dayWorks * workingDay)-permits)*salaryHour) + (salaryHour * (overTime * 2))) +bonus)
        // el bono se suma al final
        console.log('SALARIO GANADO SIN PRESTACIONES: '+baseSalary)
        console.log('APLICANDO EL PORCENTAJE DE CCSS: '+ccss)
        let salary = baseSalary - ccss
        // DATOS DE CCSS
        res.render('payRoll/admView',{dataUser: dataUser[0],dayWorks, permits, bonus, overTime, salaryHour, workingDay, ccss, baseSalary, salary, year, month, tax} )
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