const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')
//SECTION USER
router.get('/', isLoggedIn, async (req, res) => {
    // SI SE HACE RESET DE LA DB COMENTAR EL IF JUNTO CON EL ELSE
    if (req.user.tipo_empleado === 1) {
        const data = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato ,c.salario_hora, c.jornada, d.nombre_cargo
        From empleados a
        INNER JOIN salarios c
        ON a.id = c.empleado_id
        INNER JOIN tipo_empleados d
        ON a.tipo_empleado = d.id
        WHERE a.aprobado = 1;
        `)
        const dataAssistance = await pool.query(`
        select aprobado 
        from asistencia;`)
        const dataNew = await pool.query(`
        select aprobado
        from empleados
        where aprobado = 0`)
        console.log(data)
        res.render('users/admHome', { data, dataAssistance, dataNew })
    } else {
        const data = await pool.query('select id from direccion where empleado_id = ?', [req.user.id])
        const provincia = await pool.query(`SELECT nombre_provincia, codigo_provincia FROM provincia;`)
        const canton = await pool.query(`SELECT nombre_canton, codigo_canton FROM canton;`)
        const distrito = await pool.query(`SELECT nombre_distrito, codigo_distrito FROM distrito;`)
        if (data.length === 0 ) {
            console.log('NO HA REGISTRADO INFORMACION')
            res.render('users/userMoreInfo',  {provincia, canton, distrito })
        }else {
            const dataUser = await pool.query(`
            SELECT id, cedula, correo, nombre, p_apellido, s_apellido, substr(fecha_contrato, 1, 10) as fecha_contrato
            FROM empleados
            WHERE id = ?;`,[req.user.id])
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
            const dataBonos = await pool.query('SELECT count(motivo) as motivo FROM bonos WHERE empleado_id = ?',[req.user.id])
            const dataCondutas = await pool.query('SELECT count(descripcion) as descripcion FROM registro_disciplinario WHERE empleado_id = ?',[req.user.id])
            const dataAsistencia = await pool.query('Select asistencia from asistencia where substr(fecha, 1, 10) = CURDATE() and empleado_id = ?;',[req.user.id])
            res.render('users/userHome', {
                dataCondutas: dataCondutas[0],
                dataSalary: dataSalary[0],
                dataBonos: dataBonos[0], 
                dataUser: dataUser[0],
                dataRole: dataRole[0],
                dataAsistencia: dataAsistencia[0]
            })
        }
    }
})

router.post('/userMoreInfo', isLoggedIn, async (req, res) => {
    const { tipo_telefono, numero, codigo_provincia, codigo_canton, codigo_distrito, direccion } = req.body
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
    const d1 = await pool.query('INSERT INTO telefonos SET ?;', [newTelefono])
    const d2 = await pool.query('INSERT INTO direccion SET ?;', [newDireccion])
    req.flash('success', 'Nueva información ingresada')
    res.redirect('../users')    
})

router.get('/userEditMoreInfo', isLoggedIn, async(req, res)=>{
    const dataDireccion = await pool.query('SELECT direccion FROM direccion where empleado_id = ?', [req.user.id])
    const dataNumero = await pool.query('SELECT numero FROM telefonos where empleado_id = ?', [req.user.id])
    const dataProvincia = await pool.query(`SELECT nombre_provincia, codigo_provincia FROM provincia;`)
    const dataCanton = await pool.query(`SELECT nombre_canton, codigo_canton FROM canton;`)
    const dataDistrito = await pool.query(`SELECT nombre_distrito, codigo_distrito FROM distrito;`)
    res.render('users/userEditMoreInfo',{dataProvincia, dataCanton, dataDistrito, dataDireccion: dataDireccion[0], dataNumero: dataNumero[0] })
})

router.post('/userEditMoreInfo', isLoggedIn, async (req, res) => {
    console.log(req.body)
    const { tipo_telefono, numero, codigo_provincia, codigo_canton, codigo_distrito, direccion } = req.body
    const dataTelefono = {
        tipo_telefono,
        numero,
        empleado_id: req.user.id
    }
    const dataDireccion = {
        codigo_provincia,
        codigo_canton,
        codigo_distrito,
        direccion,
        empleado_id: req.user.id
    }
    const d1 = await pool.query('UPDATE telefonos SET ?;', [dataTelefono])
    const d2 = await pool.query('UPDATE direccion SET ?;', [dataDireccion])
    req.flash('success', 'Información actualizada')
    res.redirect('../users') 
})

router.get('/userAssistance/:id', isLoggedIn, async (req, res) =>{
    const {id} = req.params
    // let aux = await pool.query('SELECT contador_dias FROM asistencia WHERE empleado_id = ?', [req.user.id])
    // aux += 1
    const data = {
        asistencia: true,
        empleado_id: id
    }
    const query = await pool.query('INSERT INTO asistencia SET ?', [data])
    req.flash('success', 'Se ha registrado la asistencia al trabajo, gracias')
    res.redirect('/users')  
})

//!SECTION 
//SECTION ADM

router.get('/admNewUsers', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const data = await pool.query(`
        SELECT a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato
        FROM empleados a
        WHERE a.aprobado = 0;
        `)
        res.render('users/admNewUsers', { data })
    }
})

router.get('/admEditNewUser/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const usuario = await pool.query('Select id from salarios where id = ?', [req.user.id])
    const opcion = usuario.length
        const data = await pool.query(`
        SELECT id, nombre, p_apellido, s_apellido, cedula, substr(fecha_contrato, 1, 10) as fecha_contrato, TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) AS edad , correo 
        FROM empleados  
        WHERE id = ?;
        `, [id])
        res.render('users/admCheck', { data: data[0] })
})

router.post('/admEditNewUser/:id', isLoggedIn, async (req, res) => {
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
        const queryEmpleados = await pool.query('UPDATE empleados SET ? WHERE id = ?', [dataEmpleado, id])
        const querySalarios = await pool.query('INSERT INTO salarios SET ?', [dataSalario])
        res.redirect('../') 
    }
})

router.get('/admMoreInfo/:id', isLoggedIn, async(req, res) =>{
    if (req.user.tipo_empleado === 1) {
        const {id} = req.params
        const dataUser = await pool.query(`
        select cedula, fecha_contrato, fecha_nacimiento, nombre, p_apellido, s_apellido, correo, TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) AS edad
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
        where a.id = ?;`, [id])
        const dataPhone = await pool.query(`
        select a.numero 
        from telefonos a
        inner join empleados b
        on a.empleado_id = b.id
        where b.id = ?;`, [id])
        res.render('users/admMoreInfo', {
            dataUser: dataUser[0],
            dataAdress: dataAdress[0],
            dataRole: dataRole[0],
            dataPhone: dataPhone[0]
        })
    }
})

router.get('/admAssistance/:id', isLoggedIn, async(req, res) => {
    const {id} = req.params
    const data = {
        aprobado: true,
        contador_dias: 1
    }
    const query = await pool.query('UPDATE asistencia SET ? WHERE empleado_id = ?;', [data, id])
    req.flash('success', 'El trabajador esta presente')
    res.redirect('/users')  
})
//!SECTION 

module.exports = router 