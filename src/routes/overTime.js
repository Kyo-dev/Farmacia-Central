const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')
const PDF = require('pdfkit')
const fs = require('fs')
const path = require('path');

router.get('/', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const date = await pool.query('select substr(now(), 6, 2) as fecha;')
        const data = await pool.query(`
        Select a.cedula, a.nombre, a.p_apellido, a.s_apellido, b.motivo, substr(b.fecha, 1, 10) as fecha, b.cantidad_horas, b.id , b.estado, c.nombre_cargo
        From empleados a 
        INNER JOIN horas_extra b
        ON a.id = b.empleado_id
        INNER JOIN tipo_empleados c
        ON a.tipo_empleado = c.id
        WHERE estado = 1 
        AND b.activo = false
        AND a.activo = true;`)
        const dataGeneral = await pool.query(`
        Select a.cedula, a.nombre, a.p_apellido, a.s_apellido, b.motivo, substr(b.fecha, 1, 10) as fecha, b.cantidad_horas, b.id , b.estado, c.nombre_cargo, b.informacion_estado
        From empleados a 
        INNER JOIN horas_extra b
        ON a.id = b.empleado_id
        INNER JOIN tipo_empleados c
        ON a.tipo_empleado = c.id
        WHERE b.activo = true
        AND month(b.fecha) = ?
        order by b.id desc;`, [date])
        console.log(date)
        res.render('overTime/admHome', { data, dataGeneral })
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const data = await pool.query(`
        SELECT substr(fecha, 1, 10) as fecha, motivo, estado, id, activo, informacion_estado
        FROM horas_extra
        WHERE empleado_id = ? 
        order by id desc;`, [req.user.id])
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
        return res.redirect('/overTime')
    }
    // if (cantidad_horas >= 16) {
    //     req.flash('message', `La cantidad de horas ${cantidad_horas} no pueden ser correctas.`)
    //     res.redirect('/overTime')
    // }
    if (motivo.length <= 0) {
        req.flash('message', `Por favor especifíque su trabajo durante las horas extra`)
        return res.redirect('/overTime')
    }
    if (motivo.length >= 150) {
        req.flash('message', `Por favor disminuya la explicación, solo explique la labores que realizó.`)
        return res.redirect('/overTime')
    }
    const query = pool.query('INSERT INTO horas_extra SET ?', [data])
    req.flash('success', `Registro realizado y pendiente de revision`)
    return res.redirect('/overTime')
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
        const { informacion_estado, estado } = req.body
        console.log(estado)
        if(estado == 2){
            const data = {
                estado,
                informacion_estado,
                activo: true
            }
            if(data.estado.length <= 0){
                req.flash('message', 'Por favor especifique el estado del mensaje')
                return res.redirect('/overTime')
            }
            if(data.informacion_estado.length <=0){
                req.flash('message', 'Por favor agrege una anotación')
                return res.redirect('/overTime')
            }
            await pool.query('UPDATE horas_extra SET ? WHERE id = ?', [data, id])
            req.flash('success', 'Registro realizado satisfactoriamente')
            return res.redirect('/overTime')
        }else if(estado == 3){
            const data = {
                estado,
                informacion_estado,
                activo: false
            }
            if(data.estado.length <= 0){
                req.flash('message', 'Por favor especifique el estado del mensaje')
                return res.redirect('/overTime')
            }
            if(data.informacion_estado.length <=0){
                req.flash('message', 'Por favor agrege una anotación')
                return res.redirect('/overTime')
            }
            await pool.query('UPDATE horas_extra SET ? WHERE id = ?', [data, id])
            req.flash('success', 'Has rechazado las horas extra')
            return res.redirect('/overTime')
        }
    } else {
        req.flash('message', 'Solo los administradores pueden estar aquí')
        res.redirect('/overTime')
    }
})


router.get('/listRegisters', isLoggedIn, async (req, res) => {
    if(req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        res.render('overTime/admListRegisters', { date: date[0] })
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
        Select a.cedula, a.nombre, a.p_apellido, a.s_apellido, b.motivo, substr(b.fecha, 1, 10) as fecha, b.cantidad_horas, b.id , b.estado, c.nombre_cargo
        From empleados a 
        INNER JOIN horas_extra b
        ON a.id = b.empleado_id
        INNER JOIN tipo_empleados c
        ON a.tipo_empleado = c.id
        WHERE estado = 1 
        AND b.activo = false
        AND a.activo = true;`)
        const dataGeneral = await pool.query(`
        Select a.cedula, a.nombre, a.p_apellido, a.s_apellido, b.motivo, substr(b.fecha, 1, 10) as fecha, b.cantidad_horas, b.id , b.estado, c.nombre_cargo, b.informacion_estado
        From empleados a 
        INNER JOIN horas_extra b
        ON a.id = b.empleado_id
        INNER JOIN tipo_empleados c
        ON a.tipo_empleado = c.id
        WHERE b.activo = true
        AND year(b.fecha) = ?
        AND month(b.fecha) = ?
        order by b.id desc;`, [year, month])
        res.render('overTime/admListRegisters', { data, dataGeneral, date: date[0], year , month, day})
    }
})

router.get('/employeepdf/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const {id} = req.params
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        const dataGeneral = await pool.query(`
        Select a.cedula, a.nombre, a.p_apellido, a.s_apellido, b.motivo, substr(b.fecha, 1, 10) as fecha, b.cantidad_horas, b.id , b.estado, c.nombre_cargo, b.informacion_estado
        From empleados a 
        INNER JOIN horas_extra b
        ON a.id = b.empleado_id
        INNER JOIN tipo_empleados c
        ON a.tipo_empleado = c.id
        WHERE b.activo = true
        AND b.id = ?
        order by b.id desc;`,[id])
        let table0 = {
            headers: ['Nombre', 'Primer apellido', 'Segundo apellido', 'Fecha del registro', 'Motivo', 'Cantidad de horas'],
            rows: []
        };
        const jsonTime = JSON.parse(JSON.stringify(dataGeneral))
        for (let i = 0; i < jsonTime.length; i++) {
            table0.rows.push([jsonTime[i].nombre, jsonTime[i].p_apellido, jsonTime[i].s_apellido, jsonTime[i].fecha, jsonTime[i].motivo, jsonTime[i].cantidad_horas])
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
            .text(`Farmacia Central Moravia`, 40 , 170)
        doc
            .fontSize(14)
            .font('Times-Roman')
            .text(`${dataGeneral[0].nombre_cargo}`, 40, 190)
        doc
            .fontSize(14)
            .font('Times-Roman')
            .text(`${dataGeneral[0].nombre} ${dataGeneral[0].p_apellido} ${dataGeneral[0].s_apellido}`, 40, 210)
        doc
            .fontSize(14)
            .font('Times-Roman')
            .text(`Saludos cordiales`, 40, 230)
        doc
            .fontSize(20)
            .font('Times-Roman')
            .text(`Información de las horas extra`, 200, 290)
        doc
        const message = `Por este medio se le entrega el comprobante solicitado con respecto a las horas extras laboradas en la fecha ${dataGeneral[0].fecha}' con un total de horas de '${dataGeneral[0].cantidad_horas} por el motivo de '${dataGeneral[0].motivo}.' \n Le adjunto la tabla con la información.`
        doc
        .fontSize(14)
        .font('Times-Roman')
        .text(message ,50, 330, {
            width: 500,
            align: 'justify',
            indent: 30,
            columns: 1,
            height: 300,
            ellipsis: true
        });
        doc
            .text('', 0,450 )
        doc.table(table0, {
            prepareHeader: () => doc.font('Helvetica-Bold'),
            prepareRow: (row, i) => doc.font('Helvetica').fontSize(12)
        });
        doc
              .fontSize(14)
              .font('Times-Roman')
              .text('Atentamente',460 , 620)
        doc
              .fontSize(14)
              .font('Times-Roman')
              .text('Dora González, Administradora.',440 , 680)
        doc.end();
        res.redirect(`http://localhost:4000/downloads/${t}.pdf`)
    }
})


router.get('/pdf/:year/:month', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const { year, month } = req.params
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        const dataBonos = await pool.query(`
        Select  a.nombre, a.p_apellido, a.s_apellido, b.motivo, substr(b.fecha, 1, 10) as fecha, (b.cantidad_horas), b.id , b.estado, c.nombre_cargo, b.informacion_estado
        From empleados a 
        INNER JOIN horas_extra b
        ON a.id = b.empleado_id
        INNER JOIN tipo_empleados c
        ON a.tipo_empleado = c.id
        WHERE b.activo = true
        AND year(b.fecha) = 2020
        AND month(b.fecha) = 03
        order by b.id desc;`, [year, month])
        let table0 = {
            headers: ['Nombre', 'Primer apellido', 'Segundo apellido', 'Fecha del bono', 'Motivo', 'Cantidad'],
            rows: []
        };
        const jsonTime = JSON.parse(JSON.stringify(dataBonos))
        for (let i = 0; i < jsonTime.length; i++) {
            table0.rows.push([jsonTime[i].nombre, jsonTime[i].p_apellido, jsonTime[i].s_apellido, jsonTime[i].fecha, jsonTime[i].motivo, jsonTime[i].cantidad_horas])
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
            .text(`Información de horas extra del mes`, 150, 180)
        doc
            .fontSize(12)
            .font('Times-Roman')
            .text(`Reporte de horas extra para el mes: ${month} y el año ${year}`, 40, 220)
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