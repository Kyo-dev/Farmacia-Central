const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')

router.get('/', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const dataSalary = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, 
        substr(a.fecha_contrato, 1, 10) as fecha_contrato,
        c.salario_hora, c.jornada, d.nombre_cargo
        From empleados a
        INNER JOIN salarios c
        ON a.id = c.empleado_id
        INNER JOIN tipo_empleados d
        ON a.tipo_empleado = d.id   
        WHERE a.aprobado = 1 and tipo_empleado <> 1 and temporal = 1 and a.activo = 1
        `)
        res.render('salary/admHome', { dataSalary })
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const dataSalary = await pool.query(`
        SELECT salario_hora, jornada
        FROM salarios
        WHERE empleado_id = ?;`, [req.user.id])
        const dataIncrease = await pool.query(`
        SELECT substr(a.fecha, 1, 10) as fecha, a.fecha as timeAgo, a.cantidad
        FROM aumento_salarial a
        WHERE empleado_id = ?
        order by a.fecha desc
        limit 1;`, [req.user.id])
        const arrayIncrease = await pool.query(`
        SELECT substr(a.fecha, 1, 10) as fecha, a.fecha as timeAgo, a.cantidad
        FROM aumento_salarial a
        WHERE empleado_id = ?
        order by a.fecha desc`, [req.user.id])
        const dataWageWithHolding = await pool.query(`
        SELECT retencion, substr(fecha, 1, 10) as fecha, descripcion, url_documento 
        FROM retencion_salarial
        WHERE empleado_id = ? and activo = true;`, [req.user.id])
        console.log(dataWageWithHolding)
        res.render('salary/userHome', {
            dataSalary: dataSalary[0],
            dataIncrease: dataIncrease[0],
            dataWageWithHolding,
            arrayIncrease
        })
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


//SECTION ADM
router.get('/admIncrease/:id', isLoggedIn, async (req, res) => {
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
        WHERE a.id = ?;
        `, [id])
        const data = await pool.query(`
        SELECT a.id, a.cantidad, substr(a.fecha, 1, 10) as fecha
        FROM aumento_salarial a
        INNER JOIN empleados b
        ON a.empleado_id = b.id 
        WHERE a.empleado_id = ?
        order by id desc`, [id])
        res.render('salary/admIncrease', { dataSalary: dataSalary[0], data })
    } else {
        res.redirect('/salary')
    }
})

router.post('/admIncrease/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const { cantidad } = req.body
        const salarioActual = await pool.query('SELECT salario_hora FROM salarios WHERE empleado_id = ?', [id])
        const data = {
            empleado_id: id,
            cantidad
        }
        if (parseInt(data.cantidad) >= 0) {
            const salario = ((parseFloat(salarioActual[0].salario_hora) + parseFloat(data.cantidad)))
            const query = await pool.query('INSERT INTO aumento_salarial SET ?;', [data])
            const actSalario = await pool.query(`UPDATE salarios SET salario_hora = ? WHERE id = ?`, [salario, id])
            req.flash('success', 'Aumento realizado satisfactoriamente')
            res.redirect('/salary')
        }
    } else {
        req.flash('message', `ERROR, Debe ser un administrador para porder realizar esta acción`)
        res.redirect('/salary')
    }
})

router.get('/admTax/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const dataUser = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, 
        substr(a.fecha_contrato, 1, 10) as fecha_contrato
        From empleados a
        WHERE a.id = ?`, [id])
        const dataRole = await pool.query(`
        select a.nombre_cargo
        from tipo_empleados a
        inner join empleados b
        on b.tipo_empleado = a.id`)
        const dataSalary = await pool.query(`
        SELECT salario_hora, jornada
        FROM salarios
        WHERE empleado_id = ?`, [id])
        const dataTax = await pool.query(`
        select id, retencion, substr(fecha, 1, 10) as fecha, descripcion, url_documento
        from retencion_salarial
        where empleado_id = ? and activo = true;`, [id])
        console.log(dataTax)
        res.render('salary/admTax', { dataUser: dataUser[0], dataRole: dataRole[0], dataSalary: dataSalary[0], dataTax })
    } else {
        res.send('USER')
    }
})

router.post('/admTax/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const { descripcion, retencion } = req.body
        const data = {
            retencion,
            descripcion,
            url_documento: req.file.filename,
            empleado_id: id
        }
        if (parseFloat(data.retencion) <= 0) {
            req.flash('message', `El valor ₡ ${data.retencion} no es valido, debe ser un número positivo`)
            res.redirect('/salary')
        }
        if (data.descripcion.length <= 0) {
            req.flash('message', `Por favor ingrese una descripcion`)
            res.redirect('/salary')
        }
        if (data.url_documento.length >= 0) {
            const query = await pool.query('INSERT INTO retencion_salarial SET ?;', [data])
            req.flash('success', `Registro realizado`)
            res.redirect('/salary')
        } else {
            req.flash('message', `Por favor ingrese el documento que detalla la retencion, en formato .pdf o docx`)
            res.redirect('/salary')
        }
    } else {
        res.redirect('/salary')
    }
})

router.get('/admDeleteTax/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const {id} = req.params
        const data = {
            activo: false
        }
        const query = await pool.query(`UPDATE retencion_salarial SET ? WHERE id = ?;`,[data, id])
        req.flash('success', 'Retención eliminada satisfactoriamente.')
        res.redirect('/salary')
    }
})
// !SECTION 

// SECTION USER



// !SECTION 

module.exports = router