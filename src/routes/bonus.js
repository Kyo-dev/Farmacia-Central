const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')
const PDF = require('pdfkit')
const fs = require('fs')
const path = require('path');

router.get('/', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const dataUsuarios = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato, b.nombre_cargo
        From empleados a
        INNER JOIN tipo_empleados b
        ON a.tipo_empleado = b.id
        where a.activo = true
        and aprobado = true;`)
        res.render('bonus/admHome', { dataUsuarios })
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const data = await pool.query(` 
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato, 
        b.motivo, substr(b.fecha, 1, 10) as fecha_bono, b.cantidad, b.motivo
        From empleados a 
        INNER JOIN bonos b
        ON a.id = b.empleado_id
        where a.id = ? `, [req.user.id])
        res.render('bonus/userHome', { data })
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

router.get('/admRegister/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const data = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato, b.nombre_cargo
        From empleados a
        INNER JOIN tipo_empleados b
        ON a.tipo_empleado = b.id
        WHERE a.id = ?;
        `, [id])
        console.log(data)
        res.render('bonus/admRegister', { data: data[0] })
    } else {
        res.send('No deberia estar aqui')
    }
})

router.post('/admRegister/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const { motivo, cantidad } = req.body
        const data = {
            motivo,
            cantidad,
            empleado_id: id
        }
        if (data.motivo.length <= 0) {
            req.flash('message', `Especifique el motivo del bono`)
            return res.redirect('/permits')
        }
        if (data.cantidad <= 0) {
            req.flash('message', `Has ingresado un valor invalido, debe ser un número positivo`)
            return res.redirect('/permits')
        }
        req.flash('success', `Bono otorgado satisfactoriamente`)
        const query = await pool.query(`INSERT INTO bonos SET ?;`, [data])
        res.redirect('/bonus')
    } else {
        res.send('No deberia estar aqui')
    }
})

router.get('/listRegisters', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        res.render('bonus/admListRegisters', { date: date[0] })
    }
})

router.post('/listRegisters', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const { fecha } = req.body
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        let year = fecha.substring(0, 4)
        let month = fecha.substring(5, 7)
        let day = fecha.substring(8, 11)
        const dataBonos = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato, 
        b.motivo, substr(b.fecha, 1, 10) as fecha_bono, b.cantidad, c.nombre_cargo
        From empleados a
        INNER JOIN bonos b
        ON a.id = b.empleado_id
        INNER JOIN tipo_empleados c
        ON a.tipo_empleado = c.id
        WHERE a.activo = true
        AND year(b.fecha) = ?
        AND month(b.fecha) = ?;`, [year, month])
        console.log(dataBonos)
        res.render('bonus/admListRegisters', { dataBonos, date: date[0], year, month })
    }
})

router.get('/pdf/:year/:month', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const { year, month } = req.params
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        const dataBonos = await pool.query(`
            Select a.nombre, a.p_apellido, a.s_apellido, b.motivo, substr(b.fecha, 1, 10) as fecha_bono, b.cantidad
            From empleados a
            INNER JOIN bonos b
            ON a.id = b.empleado_id
            INNER JOIN tipo_empleados c
            ON a.tipo_empleado = c.id
            WHERE a.activo = true
            AND year(b.fecha) = ?
            AND month(b.fecha) = ?;`, [year, month])
        let table0 = {
            headers: ['Nombre', 'Primer apellido', 'Segundo apellido', 'Fecha del bono', 'Motivo', 'Cantidad'],
            rows: []
        };
        const jsonBonus = JSON.parse(JSON.stringify(dataBonos))
        for (let i = 0; i < jsonBonus.length; i++) {
            table0.rows.push([jsonBonus[i].nombre, jsonBonus[i].p_apellido, jsonBonus[i].s_apellido, jsonBonus[i].fecha_bono, jsonBonus[i].motivo, jsonBonus[i].cantidad])
        }
        const fs = require('fs');
        const PDFDocument = require('../lib/pdfTable');
        const doc = new PDFDocument();
        let now = new Date();
        const t = now.getTime()
        const pdfName = (path.join(__dirname + `/../public/downloads/${t}.pdf`))
        doc.pipe(fs.createWriteStream(pdfName))
        doc.image(path.join(__dirname + `/../public/img/logo.jpg`), 0, 15, { width: 150 })
        doc
            .fontSize(12)
            .font('Times-Roman')
            .text(`San José, Costa Rica, ${date[0].fecha}`, 375, 50)
        doc
            .fontSize(14)
            .font('Times-Roman')
            .text(``, 40, 100)
        doc
            .fontSize(20)
            .font('Times-Roman')
            .text(`Información de bonos`, 230, 180)
        doc
            .fontSize(12)
            .font('Times-Roman')
            .text(`Reporte de bonos para el mes: ${month} y el año ${year}`, 40, 220)
        doc
            .fontSize(14)
            .font('Times-Roman')
            .text(``, 40, 250)
        doc
        doc.table(table0, {
            prepareHeader: () => doc.font('Helvetica-Bold'),
            prepareRow: (row, i) => doc.font('Helvetica').fontSize(12)
        });
        doc.end();
        res.redirect(`http://localhost:4000/downloads/${t}.pdf`)
    }
})

module.exports = router