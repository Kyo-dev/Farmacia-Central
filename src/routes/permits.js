const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')
const PDF = require('pdfkit')
const fs = require('fs')
const path = require('path');

router.get('/', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const data = await pool.query(`
        select a.horas, a.hora_salida, a.id, a.horas, a.hora_salida, b.nombre, b.p_apellido, b.cedula, a.estado, a.titulo, a.descripcion, substr(a.fecha_solicitud, 1, 10) as fecha_solicitud, empleado_id,
        a.activo, a.empleado_id , a.informacion_estado, substr(a.fecha_salida, 1, 10) as fecha_salida
        from permisos a
        inner join empleados b
        on a.empleado_id = b.id
        where a.activo = true
        and a.estado = 1;`)
        res.render('permits/admHome', { data })
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const data = await pool.query(`SELECT 
        id, estado, titulo,descripcion, fecha_solicitud, horas, hora_salida,
        empleado_id , informacion_estado, substr(fecha_salida, 1, 10) as fecha
        FROM permisos where empleado_id = ? and borrar = false and activo = true`, [req.user.id])
        res.render('permits/userHome', { data })
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

router.get('/userNewRegister', isLoggedIn, async (req, res) => {
    const date = await pool.query(`select substr(now(), 1, 10) as fecha;`)
    res.render('permits/userNewRegister', { date: date[0] })
})

router.post('/userNewRegister', isLoggedIn, async (req, res) => {
    const { titulo, descripcion, fecha_salida, horas, hora_salida } = req.body
    const data = {
        titulo,
        descripcion,
        horas,
        hora_salida,
        fecha_salida,
        empleado_id: req.user.id
    }
    if (titulo.length <= 0) {
        req.flash('message', `Por favor ingrese un titulo`)
        res.redirect('/permits')
    }
    if (descripcion.length <= 0) {
        req.flash('message', `Por favor ingrese una descripcion`)
        res.redirect('/permits')
    }
    if (fecha_salida.length <= 0) {
        req.flash('message', `Por favor ingrese una fecha`)
        res.redirect('/permits')
    }
    if (hora_salida.length <= 0) {
        req.flash('message', `Por favor indique la hora de salida`)
        res.redirect('/permits')
    }
    if (horas < 0) {
        req.flash('message', `Por favor ingrese la cantidad de horas que se retira`)
        res.redirect('/permits')
    }
    const query = await pool.query('INSERT INTO permisos SET ?;', [data]);
    req.flash('success', 'Permiso registrado y pendiente de revision')
    res.redirect('/permits')
})

router.get('/userEdit/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const date = await pool.query(`select substr(now(), 1, 10) as fecha;`)
    const data = await pool.query(`SELECT 
    id, estado, titulo,descripcion, fecha_solicitud, horas, hora_salida,
    empleado_id , informacion_estado, substr(fecha_salida, 1, 10) as fecha
    FROM permisos WHERE id = ?`, [id])
    res.render('permits/userEdit', { data: data[0], date: date[0] })
})

router.post('/userEdit/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const { titulo, descripcion, fecha_salida, horas, hora_salida } = req.body
    const data = {
        titulo,
        descripcion,
        fecha_salida,
        horas,
        hora_salida,
        estado: 1,
        informacion_estado: 'El permiso require nuevamente una revisión.'
    }
    if (titulo.length <= 0) {
        req.flash('message', `Por favor ingrese un titulo`)
        return res.redirect('/permits')
    }
    if (descripcion.length <= 0) {
        req.flash('message', `Por favor ingrese una descripcion`)
        return res.redirect('/permits')
    }
    if (fecha_salida.length <= 0) {
        req.flash('message', `Por favor ingrese una fecha`)
        return res.redirect('/permits')
    }
    if (hora_salida.length <= 0) {
        req.flash('message', `Por favor indique la hora de salida`)
        return res.redirect('/permits')
    }
    if (horas < 0) {
        req.flash('message', `Por favor ingrese la cantidad de horas que se retira`)
        return res.redirect('/permits')
    }
    await pool.query('UPDATE permisos SET ? WHERE id = ?;', [data, id])
    req.flash('success', 'Permiso actualizado y pendiente de revisión nuevamente')
    res.redirect('/permits')
})

router.get('/userDelete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const data = await pool.query(`SELECT 
    id, estado, titulo, descripcion, substr(fecha_solicitud, 1, 10) as fecha_solicitud, horas, hora_salida,
    empleado_id , informacion_estado, substr(fecha_salida, 1, 10) as fecha_salida
    FROM permisos where id = ? and borrar = false`, [id])
    console.log(data[0])
    res.render('permits/userDelete', { data: data[0] })
})

router.post('/userDelete/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    await pool.query('UPDATE permisos SET borrar = true WHERE id = ?', [id])
    req.flash('success', 'Permiso borrado satisfactoriamente')
    res.redirect('/permits')
})

router.get('/admCheck/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const data = await pool.query(`
        select a.id, b.cedula, b.nombre, b.p_apellido, b.s_apellido, a.estado, a.titulo, a.descripcion, substr(a.fecha_salida, 1, 10) as fecha_salida,  substr(a.fecha_solicitud, 1, 10) as fecha_solicitud, empleado_id,
        a.activo, a.empleado_id , a.informacion_estado, a.horas, a.hora_salida
        from permisos a
        inner join empleados b
        on a.empleado_id = b.id
        where a.id = ?;`, [id])
        res.render('permits/admCheck', { data: data[0] })
    }
})

router.post('/admCheck/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const { informacion_estado, estado } = req.body
        const data = {
            informacion_estado,
            estado
        }
        if (data.informacion_estado.length <= 0) {
            req.flash('message', `Especifique su decisión `)
            return res.redirect('/permits')
        }
        if (data.estado.length <= 0) {
            req.flash('message', `Por favor indique el estado del permiso`)
            return res.redirect('/permits')
        }
        const query = await pool.query('UPDATE permisos SET ? WHERE id = ?', [data, id])
        req.flash('success', 'Permiso actualizado satisfactoriamente')
        res.redirect('/permits')
    }
})

router.get('/admDelete/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const data = await pool.query(`
        select a.id, b.cedula, a.estado, a.titulo, a.descripcion, substr(a.fecha_salida, 1, 10) as fecha_salida,  substr(a.fecha_solicitud, 1, 10) as fecha_solicitud, empleado_id,
        a.activo, a.empleado_id, a.informacion_estado, a.horas, a.hora_salida
        from permisos a
        inner join empleados b
        on a.empleado_id = b.id
        where a.id = ?;`, [id])
        res.render('permits/admDelete', { data: data[0] })
    }
})

router.get('/admConfirmDelete/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        await pool.query('update permisos set activo = false where id = ?', [id])
        req.flash('success', 'Permiso eliminado satisfactoriamente')
        res.redirect('/permits')
    }
})

router.get('/listRegisters', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        res.render('permits/admListRegisters', { date: date[0] })
    }
})

router.post('/listRegisters', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const { fecha } = req.body
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        let year = fecha.substring(0, 4)
        let month = fecha.substring(5, 7)
        let day = fecha.substring(8, 11)
        const dataToDo = await pool.query(`
        SELECT a.id, a.titulo, a.descripcion, a.fecha_solicitud, substr(a.fecha_solicitud, 1, 10) as fechaSolicitud, substr(a.fecha_salida, 1, 10) as fechaSalida, a.horas, a.hora_salida, b.nombre_cargo, c.estado, e.nombre, e.p_apellido, e.s_apellido
        FROM permisos a
        INNER JOIN empleados e
        ON a.empleado_id = e.id
        INNER JOIN tipo_empleados b
        ON e.tipo_empleado = b.id
        INNER JOIN estados c
        ON a.estado = c.id
        WHERE a.activo = true
        AND a.estado = 1
        AND year(a.fecha_solicitud) = ?
        AND  month(a.fecha_solicitud) = ?;`, [year, month])
        const dataDone = await pool.query(`
        SELECT a.id, a.titulo, a.descripcion, a.fecha_solicitud, substr(a.fecha_solicitud, 1, 10) as fechaSolicitud, substr(a.fecha_salida, 1, 10) as fecha_salida , a.horas, a.hora_salida, b.nombre_cargo, c.estado, e.nombre, e.p_apellido, e.s_apellido
        FROM permisos a
        INNER JOIN empleados e
        ON a.empleado_id = e.id
        INNER JOIN tipo_empleados b
        ON e.tipo_empleado = b.id
        INNER JOIN estados c
        ON a.estado = c.id
        WHERE a.activo = true
        AND a.estado = 2
        AND year(a.fecha_solicitud) = ?
        AND  month(a.fecha_solicitud) = ?;`, [year, month])
        res.render('permits/admListRegisters', { dataToDo, dataDone, date: date[0], year, month, day })
    }
})

router.get('/admDownload/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const { id } = req.params
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        const dataPdf = await pool.query(`
        SELECT a.id, a.titulo, a.descripcion, a.fecha_solicitud, substr(a.fecha_solicitud, 1, 10) as fechaSolicitud, substr(a.fecha_salida, 1, 10) as fechaSalida, a.horas, a.hora_salida, b.nombre_cargo, c.estado, e.nombre, e.p_apellido, e.s_apellido
        FROM permisos a
        INNER JOIN empleados e
        ON a.empleado_id = e.id
        INNER JOIN tipo_empleados b
        ON e.tipo_empleado = b.id
        INNER JOIN estados c
        ON a.estado = c.id
        WHERE a.activo = true
        AND a.id = ?;`, [id])
        let now = new Date();
        const t = now.getTime()
        let doc = new PDF()
        const pdfName = (path.join(__dirname + `/../public/downloads/${t}.pdf`))
        doc.pipe(fs.createWriteStream(pdfName))
        doc.image(path.join(__dirname + `/../public/img/logo.jpg`), 0, 15, { width: 200 })
        doc
            .fontSize(12)
            .font('Times-Roman')
            .text(`San José, Costa Rica, ${date[0].fecha}`, 375, 50)
        doc
            .fontSize(14)
            .font('Times-Roman')
            .text(`Farmacia Central Moravia`, 40, 220)
        doc
            .fontSize(14)
            .font('Times-Roman')
            .text(`${dataPdf[0].nombre_cargo}`, 40, 250)
        doc
            .fontSize(14)
            .font('Times-Roman')
            .text(`${dataPdf[0].nombre} ${dataPdf[0].p_apellido} ${dataPdf[0].s_apellido}`, 40, 270)
        doc
            .fontSize(14)
            .font('Times-Roman')
            .text(`Saludos cordiales`, 40, 290)
        doc
            .fontSize(20)
            .font('Times-Roman')
            .text('Solicitud del permiso', 200, 340)
        const message = `Por este medio se le entrega un comprobante con respecto a la solicitud de salida con el título de '${dataPdf[0].titulo}' en el cúal detalla que '${dataPdf[0].descripcion}.'
        \n\nEsta solicitud fue registrada en la fecha ${dataPdf[0].fechaSolicitud} para retirarse de la farmacia en la fecha ${dataPdf[0].fechaSalida} a las ${dataPdf[0].hora_salida} durante ${dataPdf[0].horas} horas ha sido aprobada.
        \n\n Sin otro particular me despido, y agradezco su previa comunicación respecto al permiso.`
        doc
            .fontSize(14)
            .font('Times-Roman')
            .text(message, 50, 390, {
                width: 500,
                align: 'justify',
                indent: 30,
                columns: 1,
                height: 300,
                ellipsis: true
            });
        doc
            .fontSize(14)
            .font('Times-Roman')
            .text('Atentamente', 440, 620)
        doc
            .fontSize(14)
            .font('Times-Roman')
            .text(`${req.user.nombre} ${req.user.p_apellido}`, 410, 680)
        doc
            .fontSize(14)
            .font('Times-Roman')
            .text(`Administración`, 430, 700)
        doc.end()
        res.redirect(`http://localhost:4000/downloads/${t}.pdf`)
    }
})

module.exports = router