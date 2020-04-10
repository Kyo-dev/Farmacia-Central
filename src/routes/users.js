const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')

const multer = require('multer')
const path = require('path')
const uuid = require('uuid/v4')

const storageMulter = multer.diskStorage({
    destination: path.join(__dirname, '../public/uploads'),
    filename: (req, file, cb) => {
      cb(null, uuid() + path.extname(file.originalname).toLocaleLowerCase())
    }
  })
  var upload = multer({ 
    storage: storageMulter,
    fileFilter: function (req, file, cb) {
         let ext = path.extname(file.originalname);
         if (ext !== '.png' && ext !== '.jpg' && ext !== '.pdf' && ext !== '.jpeg' && ext !== '.docx') {
              req.fileValidationError = "Forbidden extension";
              return cb(null, false, req.fileValidationError);
        }
        cb(null, true);
    }
});

//SECTION USER
router.get('/', isLoggedIn, async (req, res) => {
    // SI SE HACE RESET DE LA DB COMENTAR EL IF(EL CONTENIDO NO) JUNTO CON EL ELSE
    if (req.user.tipo_empleado === 1) {
        const data = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato ,c.salario_hora, c.jornada, d.nombre_cargo
        From empleados a
        INNER JOIN salarios c
        ON a.id = c.empleado_id
        INNER JOIN tipo_empleados d
        ON a.tipo_empleado = d.id
        WHERE a.aprobado = 1 and temporal = 1 and a.activo = 1; 
        `) // tipo_empleado <> 1 para no ver la data del adm
        // const dataAssistance = await pool.query(`
        // select aprobado 
        // from asistencia;`)
        const dataNew = await pool.query(`
        select aprobado
        from empleados
        where aprobado = 0`)
        console.log(data)
        res.render('users/admHome', { data, dataNew })
    } else if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const data = await pool.query('select id from direccion where empleado_id = ?', [req.user.id])
        const dataProvincia = await pool.query(`SELECT nombre_provincia, codigo_provincia FROM provincia;`)
        const canton = await pool.query(`SELECT nombre_canton, codigo_canton FROM canton;`)
        const distrito = await pool.query(`SELECT nombre_distrito, codigo_distrito FROM distrito;`)
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        if (data.length === 0) {
            console.log('NO HA REGISTRADO INFORMACION')
            res.render('users/userMoreInfo', { dataProvincia, canton, distrito, date: date[0]})
        } else {
            const dataUser = await pool.query(`
            SELECT id, cedula, correo, nombre, p_apellido, s_apellido, substr(fecha_contrato, 1, 10) as fecha_contrato
            FROM empleados
            WHERE id = ?;`, [req.user.id])
            const dataRole = await pool.query(`
            SELECT a.nombre_cargo
            FROM tipo_empleados a
            INNER JOIN empleados b
            ON a.id = b.tipo_empleado
            WHERE b.id = ?;`, [req.user.id])
            const dataSalary = await pool.query(`
            SELECT salario_hora, jornada
            FROM salarios
            WHERE empleado_id = ?;`, [req.user.id])
            const dataBonos = await pool.query('SELECT count(id) as aux FROM bonos WHERE empleado_id = ? and activo = true', [req.user.id])
            const dataTasks = await pool.query('SELECT count(id) as aux FROM tareas WHERE tipo_empleado = ? and estado = 1 ;', [req.user.tipo_empleado])
            const dataCondutas = await pool.query('SELECT count(id) as aux FROM registro_disciplinario WHERE empleado_id = ? and activo = true;', [req.user.id])
            const dataAsistencia = await pool.query('Select asistencia from asistencia where substr(fecha, 1, 10) = CURDATE() and empleado_id = ?;', [req.user.id])
            res.render('users/userHome', {
                dataCondutas: dataCondutas[0],
                dataSalary: dataSalary[0],
                dataBonos: dataBonos[0],
                dataUser: dataUser[0],
                dataRole: dataRole[0],
                dataAsistencia: dataAsistencia[0],
                dataTasks: dataTasks[0]
            })
        }
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

router.get('/userHome', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const dataPermits = await pool.query(`
        select a.id, b.nombre, b.p_apellido, a.estado, a.fecha_solicitud, empleado_id,
        a.activo, a.informacion_estado, substr(a.fecha_salida, 1, 10) as fecha_salida
        from permisos a
        inner join empleados b
        on a.empleado_id = b.id
        where a.activo = true
        and a.estado = 1;`)
        const dataTasks = await pool.query(`
        SELECT a.id, a.titulo, a.descripcion, a.fecha_solicitud, b.nombre_cargo, c.estado
        FROM tareas a
        INNER JOIN tipo_empleados b
        ON a.tipo_empleado = b.id
        INNER JOIN estados c
        ON a.estado = c.id
        WHERE a.activo = true
        AND a.estado = 1;
        `)
        const dataOverTime = await pool.query(`
        Select a.cedula, a.nombre, a.p_apellido, a.s_apellido, b.motivo, substr(b.fecha, 1, 10) as fecha, b.cantidad_horas, b.id , b.estado, c.nombre_cargo, b.informacion_estado
        From empleados a 
        INNER JOIN horas_extra b
        ON a.id = b.empleado_id
        INNER JOIN tipo_empleados c
        ON a.tipo_empleado = c.id
        AND b.estado = 1;
        `)
        console.log(dataOverTime)
        res.render('users/admDash', {dataPermits, dataTasks, dataOverTime })
    } else {
        res.redirect('/users')
    }
})

router.post('/userMoreInfo', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const { tipo_telefono, numero, codigo_provincia, codigo_canton, codigo_distrito, direccion, fecha_nacimiento } = req.body
        console.log('nueva info')
        const newTelefono = {
            tipo_telefono,
            numero,
            empleado_id: req.user.id
        }
        const newDireccion = {
            codigo_provincia,
            codigo_canton,
            codigo_distrito,
            direccion,
            empleado_id: req.user.id
        }
        const newDate = {
            fecha_nacimiento
        }
        console.log(newTelefono.numero)
        if (newTelefono.tipo_telefono <= 0) {
            req.flash('message', 'Por favor, especifique el tipo de teléfono')
            return res.redirect('/users')
        }
        if (newTelefono.numero.length <= 7 || newTelefono.numero.length >= 9) {
            req.flash('message', 'El número debe ser de 8 caracteres numéricos.')
            return res.redirect('/users')
        }
        if (newDireccion.direccion <= 0) {
            req.flash('message', 'Por favor, especifique su dirección')
            return res.redirect('/users')
        }
        if (newDate.fecha_nacimiento.length <= 0) {
            req.flash('message', 'Indique su fecha de nacimiento')
            return res.redirect('/users')
        }
        try {
            const d1 = await pool.query('INSERT INTO telefonos SET ?;', [newTelefono])
            const d2 = await pool.query('INSERT INTO direccion SET ?;', [newDireccion])
            const d3 = await pool.query('UPDATE empleados SET ? WHERE id = ?;', [newDate, req.user.id])
            req.flash('success', 'Nueva información ingresada')
            return res.redirect('/users')
        } catch (error) {
            console.log(error)
            req.flash('message', 'Ha ocurrido un error inesperado, por favor intentelo de nuevo.')
            return res.redirect('/users')
        }
    }
})

router.get('/userEditMoreInfo', isLoggedIn, async (req, res) => {
    const dataDireccion = await pool.query('SELECT direccion FROM direccion where empleado_id = ?', [req.user.id])
    const dataNumero = await pool.query('SELECT numero FROM telefonos where empleado_id = ?', [req.user.id])
    const dataProvincia = await pool.query(`SELECT nombre_provincia, codigo_provincia FROM provincia;`)
    const dataCanton = await pool.query(`SELECT nombre_canton, codigo_canton FROM canton;`)
    const dataDistrito = await pool.query(`SELECT nombre_distrito, codigo_distrito FROM distrito;`)
    const dataUsuario = await pool.query(`SELECT substr(fecha_nacimiento, 1, 10) as fecha FROM empleados where id = ?;`, [req.user.id])
    console.log([dataProvincia[0]])
    res.render('users/userEditMoreInfo', { dataProvincia, dataCanton, dataDistrito, dataDireccion: dataDireccion[0], dataNumero: dataNumero[0], dataUsuario: dataUsuario[0] })
})

router.post('/userEditMoreInfo', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const { tipo_telefono, numero, codigo_provincia, codigo_canton, codigo_distrito, direccion, fecha_nacimiento } = req.body
        const dataTelefono = {
            tipo_telefono,
            numero,
            // empleado_id: req.user.id
        }
        const dataDireccion = {
            codigo_provincia,
            codigo_canton,
            codigo_distrito,
            direccion,
            // empleado_id: req.user.id
        }
        const dataUser = {
            // id: req.user.id,
            fecha_nacimiento
        }
        console.log(dataDireccion)
        if (dataTelefono.tipo_telefono <= 0) {
            req.flash('message', 'Por favor, especifique el tipo de teléfono')
            return res.redirect('/users')
        }
        if (dataTelefono.numero.length <= 7 || dataTelefono.numero.length >= 9) {
            req.flash('message', 'El número telefónico debe ser de 8 caracteres numéricos.')
            return res.redirect('/users')
        }
        if (dataDireccion.direccion <= 0) {
            req.flash('message', 'Por favor, especifique su dirección')
            return res.redirect('/users')
        }
        if (dataUser.fecha_nacimiento.length <= 0) {
            req.flash('message', 'Indique su fecha de nacimiento')
            return res.redirect('/users')
        }
        try {
            const d1 = await pool.query('UPDATE telefonos SET ? WHERE empleado_id = ?;', [dataTelefono, req.user.id])
            const d2 = await pool.query('UPDATE direccion SET ? WHERE empleado_id = ?;', [dataDireccion, req.user.id])
            const d3 = await pool.query('UPDATE empleados SET ? WHERE id = ?;', [dataUser, req.user.id])
        } catch (error) {
            console.log(error)
        }
        req.flash('success', 'Información actualizada')
        res.redirect('../users')
    }
})

router.get('/userAssistance/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado !== 1 && req.user.activo === 1) {
        const { id } = req.params
        const query = await pool.query(`
        select cantidad_dias_disponibles
        from dias_disponibles
        where empleado_id = ?`, id)
        const dayPlus = (query[0].cantidad_dias_disponibles + 1)
        const newDay = {
            cantidad_dias_disponibles: dayPlus
        }
        // let aux = await pool.query('SELECT contador_dias FROM asistencia WHERE empleado_id = ?', [req.user.id])
        // aux += 1
        const data = {
            asistencia: true,
            empleado_id: id,
            contador_dias: 1
        }
        const query1 = await pool.query('INSERT INTO asistencia SET ?', [data])
        const query2 = await pool.query('UPDATE dias_disponibles SET ? WHERE empleado_id = ?;', [newDay, id])
        req.flash('success', 'Se ha registrado la asistencia al trabajo, gracias')
        res.redirect('/users')
    }
})

//!SECTION 
//SECTION ADM

router.get('/admNewUsers', isLoggedIn, async (req, res) => {
    // PARA UN RESET COMENTAR ESTE IF
    if (req.user.tipo_empleado === 1) {
        const data = await pool.query(`
        SELECT a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato
        FROM empleados a
        WHERE a.aprobado = 0;`)
        res.render('users/admNewUsers', { data })
    }
})
// COMENTAR PARA RESET
router.get('/admEditNewUser/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const { id } = req.params
        const usuario = await pool.query('Select id from salarios where id = ?', [req.user.id])
        const opcion = usuario.length
        const data = await pool.query(`
            SELECT id, nombre, p_apellido, s_apellido, cedula, substr(fecha_contrato, 1, 10) as fecha_contrato, TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) AS edad , correo 
            FROM empleados  
            WHERE id = ?;
            `, [id])
        res.render('users/admCheck', { data: data[0] })
    }
})
// COMENTAR PARA RESET
router.post('/admEditNewUser/:id', isLoggedIn, async (req, res) => {
    // PARA UN RESET COMENTAR ESTE IF
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const { tipo_empleado, salario_hora, jornada, temporal } = req.body
        const dataEmpleado = {
            tipo_empleado,
            temporal,
            aprobado: 1
        }
        const dataSalario = {
            salario_hora,
            jornada,
            empleado_id: id
        }
        const min = dataSalario.salario_hora * dataSalario.jornada
        if (dataSalario.jornada <= 0) {
            req.flash('message', 'Por favor, especifique la jornada laboral')
            return res.redirect('/users')
        }
        if (dataSalario.salario_hora <= 0) {
            req.flash('message', 'Por favor, especifique el salario por hora')
            return res.redirect('/users')
        }
        if (min <= 10358) {
            req.flash('message', 'No cumple con el salario mínimo')
            return res.redirect('/users')
        }
        if (tipo_empleado.length <= 0) {
            req.flash('message', 'Por favor, especifique el cargo del nuevo trabajador')
            return res.redirect('/users')
        }
        try {
            await pool.query('UPDATE empleados SET ? WHERE id = ?', [dataEmpleado, id])
            await pool.query('INSERT INTO salarios SET ?', [dataSalario])
            req.flash('success', 'Datos insertados correctamente')
            return res.redirect('/users')
        } catch (error) {
            req.flash('message', 'Ha ocurrido un error, por favor intentelo de nuevo')
            console.log(error)
            return res.redirect('/users')
        }
    }
})

router.get('/admMoreInfo/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const { id } = req.params
        const dataUser = await pool.query(`
        select id, cedula, fecha_contrato, fecha_nacimiento, nombre, p_apellido, s_apellido, correo, TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) AS edad
        from empleados
        where id = ?;`, [id])
        const dataAdress = await pool.query(`
        select a.direccion, b.nombre_provincia, c.nombre_canton, d.nombre_distrito
        from direccion a
        inner join provincia b
        on a.codigo_provincia = b.codigo_provincia
        inner join canton c
        on a.codigo_canton = c.codigo_canton
        inner join distrito d
        on a.codigo_distrito = d.codigo_distrito
        where a.empleado_id = ?;`, [id])
        const dataRole = await pool.query(`
        select a.nombre_cargo 
        from tipo_empleados a
        inner join empleados b
        on a.id = b.tipo_empleado
        where b.id = ?;`, [id])
        const dataPhone = await pool.query(`
        select a.numero 
        from telefonos a
        inner join empleados b
        on a.empleado_id = b.id
        where b.id = ?;`, [id])
        const dataLayOff = await pool.query(`
        select descripcion, url_documento 
        from despidos
        where empleado_id = ? and activo = 1;`, [id])
        const dataSalary = await pool.query(`
        SELECT salario_hora, jornada
        FROM salarios
        WHERE empleado_id = ?;`, [id])
        const dataPayOff = await pool.query(`
        SELECT DATEDIFF(CURDATE() ,(select fecha_contrato
        from empleados 
        where id = ?)) as dias;`, [id])
        const dataTemp = await pool.query(`
        select descripcion ,substr(fecha, 1, 10) as fecha
        from fechas_empleado_temporal 
        where empleado_id = ? 
        and activo = true
        LIMIT 10`,[id])
        let pay = 0
        let payMessage = ''
        if (dataPayOff[0].dias < 89) {
            payMessage = `El tiempo mínimo para una indemnización corresponde a 90 días laborados, ${dataUser[0].nombre} ${dataUser[0].p_apellido} trabajó ${dataPayOff[0].dias} dias`
        } else if (dataPayOff[0].dias >= 90 && dataPayOff[0].dias < 239) {
            pay = (dataSalary[0].jornada * dataSalary[0].salario_hora) * 7
            payMessage = `${dataUser[0].nombre} ${dataUser[0].p_apellido} trabajó ${dataPayOff[0].dias} por lo que le correspondio un pago final de: ${pay} `
        } else if (dataPayOff[0].dias >= 240 && dataPayOff[0].dias < 364) {
            pay = (dataSalary[0].jornada * dataSalary[0].salario_hora) * 14
            payMessage = `${dataUser[0].nombre} ${dataUser[0].p_apellido} trabajó ${dataPayOff[0].dias} por lo que le correspondio un pago final de: ${pay} `
        } else if (dataPayOff[0].dias >= 365) {
            pay = (dataSalary[0].jornada * dataSalary[0].salario_hora) * 19
            payMessage = `${dataUser[0].nombre} ${dataUser[0].p_apellido} trabajó ${dataPayOff[0].dias} por lo que le correspondio un pago final de: ${pay} `
        }
        res.render('users/admMoreInfo', {
            dataUser: dataUser[0],
            dataAdress: dataAdress[0],
            dataRole: dataRole[0],
            dataPhone: dataPhone[0],
            dataLayOff: dataLayOff[0],
            dataTemp,
            payMessage,
            pay
        })
    }
})

router.get('/admUsersTemp', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const data = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato ,c.salario_hora, c.jornada, d.nombre_cargo
        From empleados a
        INNER JOIN salarios c
        ON a.id = c.empleado_id
        INNER JOIN tipo_empleados d
        ON a.tipo_empleado = d.id
        WHERE a.aprobado = 1 and tipo_empleado <> 1 and temporal = 0 and a.activo = 1;`)
        res.render('users/admUsersTemp', { data })
    }
})

router.get('/admLayOffs', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const data = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato ,c.salario_hora, c.jornada, d.nombre_cargo
        From empleados a
        INNER JOIN salarios c
        ON a.id = c.empleado_id
        INNER JOIN tipo_empleados d
        ON a.tipo_empleado = d.id
        WHERE a.aprobado = 1 and a.tipo_empleado <> 1 and a.activo = 1;`)
        console.log(data)
        res.render('users/admLayOff', { data })
    }
})

router.get('/admLayOffsList', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const data = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato ,c.salario_hora, c.jornada, d.nombre_cargo
        From empleados a
        INNER JOIN salarios c
        ON a.id = c.empleado_id
        INNER JOIN tipo_empleados d
        ON a.tipo_empleado = d.id
        WHERE a.aprobado = 1 and a.tipo_empleado <> 1 and a.activo = 0; 
        `) // tipo_empleado <> 1 para no ver la data del adm
        res.render('users/admListLayOff', { data })
    }
})

router.get('/admPermanentDelete/:id', isLoggedIn, async (req, res) => {
    if(req.user.tipo_empleado === 1 && req.user.activo === 1){
        const { id } = req.params
        try {
            await pool.query(`delete from dias_disponibles where empleado_id = ?;`, [id])
            await pool.query(`delete from telefonos where empleado_id = ?;`, [id])
            await pool.query(`delete from direccion where empleado_id = ?;`, [id])
            await pool.query(`delete from empleados where id = ?;`, [id])
            req.flash('success', `La solicitud ha sido eliminada`)
            return res.redirect('/users')
        } catch (error) {
            req.flash('message', `Ah ocurrido un error`)
            return res.redirect('/users')
        }
    }
})

router.get('/admDeleteUser/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const { id } = req.params
        const dataUser = await pool.query(`
        select id, cedula, fecha_contrato, fecha_nacimiento, nombre, p_apellido, s_apellido, correo, TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) AS edad
        from empleados
        where id = ?
        and tipo_empleado <> 1;`, [id])
        const dataRole = await pool.query(`
        select a.nombre_cargo 
        from tipo_empleados a
        inner join empleados b
        on a.id = b.tipo_empleado
        where b.id = ?;`, [id])
        const dataSalary = await pool.query(`
        SELECT salario_hora, jornada
        FROM salarios
        WHERE empleado_id = ?;`, [id])
        const dataPayOff = await pool.query(`
        SELECT DATEDIFF(CURDATE() ,(select fecha_contrato
            from empleados 
            where id = ?)) as dias;`, [id])
        let pay = 0
        let payMessage = ''
        if(dataUser.tipo_empleado == 1){
            req.flash('message', `No puedes eliminar este usuario`)
            return res.redirect('/users')
        }
        if (dataPayOff[0].dias < 89) {
            payMessage = `El tiempo mínimo para una indemnización corresponde a 90 días laborados, ${dataUser[0].nombre} ${dataUser[0].p_apellido} trabajó ${dataPayOff[0].dias} dias`
            console.log(dataPayOff)
        } else if (dataPayOff[0].dias >= 90 && dataPayOff[0].dias < 239) {
            pay = (dataSalary[0].jornada * dataSalary[0].salario_hora) * 7
            payMessage = `${dataUser[0].nombre} ${dataUser[0].p_apellido} ha trabajado ${dataPayOff[0].dias} por lo que le corresponde un pago final de: ${pay} `
            console.log(dataPayOff)
        } else if (dataPayOff[0].dias >= 240 && dataPayOff[0].dias < 364) {
            pay = (dataSalary[0].jornada * dataSalary[0].salario_hora) * 14
            payMessage = `${dataUser[0].nombre} ${dataUser[0].p_apellido} ha trabajado ${dataPayOff[0].dias} por lo que le corresponde un pago final de: ${pay} `
            console.log(dataPayOff)
        } else if (dataPayOff[0].dias >= 365) {
            pay = (dataSalary[0].jornada * dataSalary[0].salario_hora) * 19
            payMessage = `${dataUser[0].nombre} ${dataUser[0].p_apellido} ha trabajado ${dataPayOff[0].dias} por lo que le corresponde un pago final de: ${pay} `
            console.log(dataPayOff)
        }
        res.render('users/admDeleteUser', {
            dataUser: dataUser[0],
            dataRole: dataRole[0],
            dataSalary: dataSalary[0],
            dataPayOff: dataPayOff[0],
            payMessage,
            pay
        })
    }
})

router.post('/admDeleteUser/:id', isLoggedIn, upload.single("url_documento"), async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        if (req.fileValidationError) {
            console.log('1')
            req.flash('message', `El formato ingresado no es válido`)
            return res.redirect('/users')
        }
        console.log('2')
        const { id } = req.params
        const { descripcion } = req.body
        const data = {
            empleado_id: id,
            descripcion,
            url_documento: req.file.filename,
        }
        const update = {
            activo: false
        }
        if (data.descripcion.length <= 0) {
            req.flash('message', `Por favor ingrese una descripción`)
            return res.redirect('/users')
        }
        if (data.url_documento.length <= 0) {
            // const query = await pool.query('INSERT INTO retencion_salarial SET ?;', [data])
            req.flash('message', `Por favor ingrese un documento`)
            return res.redirect('/users')
        }
        if (req.fileValidationError) {
            req.flash('message', `Archivo no valido`)
            return res.end(req.fileValidationError);
        }
        console.log(data)
        try {
            const query1 = await pool.query('INSERT INTO despidos SET ?;', [data])
            const query2 = await pool.query('UPDATE empleados SET ? WHERE id = ?;', [update, id])
            req.flash('success', 'Proceso realizado satisfactoriamente')
            return res.redirect('/users')
        } catch (error) {
            console.log(error)
            return res.redirect('/users')
        }
    }
})

router.get('/admReHire/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const { id } = req.params
        const dataUser = await pool.query(`
        select id, cedula, substr(fecha_contrato, 1, 10) as fecha_contrato, fecha_nacimiento, nombre, p_apellido, s_apellido, correo, TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) AS edad
        from empleados
        where id = ?
        and activo = false;`, [id])
        const dataRol = await pool.query(`
        SELECT a.nombre_cargo
        FROM tipo_empleados a
        inner join empleados b
        on a.id = b.tipo_empleado
        WHERE b.id = ?
        AND b.activo = false;`, [id])
        const dataSalary = await pool.query(`
        select salario_hora, jornada
        from salarios
        where empleado_id = ?;`, [id])
        console.log({ dataUser: dataUser[0] })
        console.log({ dataSalary: dataSalary[0] })
        console.log({ dataRol: dataRol[0] })
        res.render('users/admReHire', { dataUser: dataUser[0], dataSalary: dataSalary[0], dataRol: dataRol[0] })
    }
})

router.post('/admRehire/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const { tipo_empleado, salario_hora, jornada, temporal } = req.body
    const date = await pool.query(`select substr(now(), 1, 10) as fecha;`)
    const dataEmpleado = {
        tipo_empleado,
        temporal,
        aprobado: 1,
        activo: true,
        fecha_contrato: date[0].fecha
    }
    const dataSalario = {
        salario_hora,
        jornada,
        empleado_id: id
    }
    const dataRehire = {
        activo: 0
    }
    const min = dataSalario.salario_hora * dataSalario.jornada
    if (dataSalario.jornada <= 0) {
        req.flash('message', 'Por favor, especifique la jornada laboral')
        return res.redirect('/users')
    }
    if (dataSalario.salario_hora <= 0) {
        req.flash('message', 'Por favor, especifique el salario por hora')
        return res.redirect('/users')
    }
    if (min <= 10358) {
        req.flash('message', 'No cumple con el salario mínimo')
        return res.redirect('/users')
    }
    if (dataEmpleado.tipo_empleado.length <= 0) {
        req.flash('message', 'Por favor, especifique el cargo del nuevo trabajador')
        return res.redirect('/users')
    }
    try {
        await pool.query('UPDATE empleados SET ? WHERE id = ?', [dataEmpleado, id])
        await pool.query('UPDATE salarios SET ? WHERE empleado_id = ?', [dataSalario, id])
        await pool.query('UPDATE despidos SET ? WHERE empleado_id = ?', [dataRehire, id])
        req.flash('success', 'Se ha realizado el proceso de forma satisfactoria')
        return res.redirect('/users')
    } catch (error) {
        console.log(error)
        req.flash('message', 'Ha ocurrido un error')
        return res.redirect('/users')
    }
})

router.get('/direction-canton/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const dataCanton = await pool.query(`SELECT nombre_canton, codigo_canton FROM canton where codigo_provincia = ?`, [id])
    res.json(dataCanton)
})

router.get('/direction-distrito/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const dataCanton = await pool.query(`SELECT nombre_distrito, codigo_distrito FROM distrito where codigo_canton = ?`, [id])
    res.json(dataCanton)
})

router.get('/admEditUserTemp/:id', isLoggedIn, async(req, res)=>{
    if (req.user.tipo_empleado === 1 && req.user.activo === 1) {
        const date = await pool.query('select substr(now(), 1, 10) as fecha;')
        const {id} = req.params
        const data = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato ,c.salario_hora, c.jornada, d.nombre_cargo, a.correo
        From empleados a
        INNER JOIN salarios c
        ON a.id = c.empleado_id
        INNER JOIN tipo_empleados d
        ON a.tipo_empleado = d.id
        WHERE a.aprobado = 1 and tipo_empleado <> 1 and temporal = 0 and a.activo = 1 and empleado_id = ?;`, [id])
        console.log(data)
        res.render('users/admCreateTempUser', { data: data[0], date: date[0]})
    }
})

router.post('/admEditUserTemp/:id', isLoggedIn, async(req, res)=>{
    const {id} = req.params
    const {fecha, descripcion} = req.body
    const data = {
        fecha,
        descripcion,
        dias: 1,
        empleado_id: id
    }
    const valid = await pool.query(`
    select activo 
    from fechas_empleado_temporal
    where fecha = ? 
    and empleado_id = ?;`,[data.fecha, id])
    // if(valid[0].activo){
    //     req.flash('message', 'Error, ya has realizado este contrato en la fecha ingresada')
    //     return res.redirect('/users')
    // }
    if(data.descripcion.length <= 0){
        req.flash('message', 'Ingrese un motivo')
        return res.redirect('/users')
    }
    if(valid[0]){
        req.flash('message', 'Error, ya has realizado este contrato en la fecha ingresada')
        return res.redirect('/users')
    } else {
        try {
            await pool.query('INSERT INTO fechas_empleado_temporal SET ?', [data])
            req.flash('success', 'Proceso realizado satisfactoriamente')
            return res.redirect('/users')
        } catch (error) {
            console.log(error)
            req.flash('message', 'Error, por favor intentelo de nuevo')
            return res.redirect('/users')
        }
    }
})

//!SECTION 

module.exports = router 