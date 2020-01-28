const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn, isNotLoggedIn } = require('../lib/auth')

//SECTION PERMISOS

router.get('/permisos', isLoggedIn, async (req, res) => {
    const data = await pool.query(`
    select a.id, b.nombre, b.p_apellido, b.cedula, a.estado_permiso, a.titulo, a.descripcion, substr(a.fecha_solicitud, 1, 10) as fecha_solicitud, empleado_id,
    a.activo, a.empleado_id , a.costo_salarial, a.informacion_estado, substr(a.fecha_salida, 1, 10) as fecha_salida
    from permisos a
    inner join empleados b
    on a.empleado_id = b.id
    where a.activo = true;
    `)
    res.render('adm/permisos', { data })
})

router.get('/permiso/editar/:id', isLoggedIn, async (req, res) => {
    const {id} = req.params
    const data = await pool.query(`
    select a.id, b.cedula, a.estado_permiso, a.titulo, a.descripcion, substr(a.fecha_salida, 1, 10) as fecha_salida,  substr(a.fecha_solicitud, 1, 10) as fecha_solicitud, empleado_id,
    a.activo, a.empleado_id , a.costo_salarial, a.informacion_estado
    from permisos a
    inner join empleados b
    on a.empleado_id = b.id
    where a.id = ?;`,[id])
    res.render('adm/revisarPermiso', { data: data[0]})
})

router.post('/permiso/editar/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const { informacion_estado, estado_permiso, costo_salarial } = req.body
    const data = {
        informacion_estado, 
        estado_permiso, 
        costo_salarial
    }
    await pool.query('UPDATE permisos SET ? WHERE id = ?', [data, id])
    req.flash('success', 'Permiso actualizado satisfactoriamente')
    res.redirect('/adm/permisos')
})

router.get('/permiso/borrar/:id', isLoggedIn, async (req, res) => {
    const { id } = req.params
    const data = await pool.query(`
    select a.id, b.cedula, a.estado_permiso, a.titulo, a.descripcion, substr(a.fecha_salida, 1, 10) as fecha_salida,  substr(a.fecha_solicitud, 1, 10) as fecha_solicitud, empleado_id,
    a.activo, a.empleado_id , a.costo_salarial, a.informacion_estado
    from permisos a
    inner join empleados b
    on a.empleado_id = b.id
    where a.id = ?;`,[id])
    res.render('adm/borrarPermiso', { data: data[0]})
})

router.get('/permiso/eliminar/:id', isLoggedIn, async (req, res)=>{
    const{id} = req.params
    await pool.query('update permisos set activo = false where id = ?', [id])
    req.flash('success', 'Permiso eliminado satisfactoriamente')
    res.redirect('/adm/permisos')
})

//!SECTION 

//SECTION USUARIOS
router.get('/usuarios-registrados', isLoggedIn, async(req, res)=>{
    // USUARIOS APROBADOS
    const data = await pool.query(`
    Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato ,c.salario_hora, c.jornada, d.nombre_cargo
    From empleados a
    INNER JOIN salarios c
    ON a.id = c.empleado_id
    INNER JOIN tipo_empleados d
    ON a.tipo_empleado = d.id
    WHERE a.aprobado = 1;
    `)
    console.log(data)
    res.render('adm/usuariosAprobados', {data})
})

router.get('/usuarios', isLoggedIn, async(req, res)=>{
    // USUARIOS NUEVOS
    const data = await pool.query(`
    SELECT a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato
    FROM empleados a
    WHERE a.aprobado = 0;
    `)
    console.log(data)
    res.render('adm/usuarios', {data})
})

router.get('/infoUsuarios/:id', isLoggedIn, async (req, res)=>{
    const {id} = req.params
    const usuario = await pool.query('Select id from salarios where id = ?',[req.user.id])
    const opcion = usuario.length
    if(opcion === 0){
        // USUARIO NUEVO
        const data = await pool.query(`
        SELECT id, nombre, p_apellido, s_apellido, cedula, substr(fecha_contrato, 1, 10) as fecha_contrato, TIMESTAMPDIFF(YEAR, fecha_nacimiento, CURDATE()) AS edad , correo 
        FROM empleados  
        WHERE id = ?;
        `,[id])
        console.log(data[0])
        res.render('adm/usuarioNuevo', {data: data[0]})
        console.log('1')
    } else {
        // ACTUALIZAR USUARIO
        res.render('adm/actualizarUsuario')
        console.log('2')
    }
})

router.post('/infoUsuarios/:id', isLoggedIn, async (req, res)=>{
    const {id} = req.params
    const {tipo_empleado, salario_hora, jornada, temporal} = req.body
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
    // console.log(dataSalario)
    const queryEmpleados = await pool.query('UPDATE empleados SET ? WHERE id = ?', [dataEmpleado, id])
    const querySalarios = await pool.query('INSERT INTO salarios SET ?', [dataSalario])
    // UPDATE TABLA EMPLEADO PARA APROBARLO COMO TRABAJADOR
    res.render('adm/inicio')
})
//!SECTION 

//SECTION AUMENTO SALARIAL
router.get('/salarios', isLoggedIn, async(req, res) =>{
    const data = await pool.query(`
    Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato ,c.salario_hora, c.jornada, d.nombre_cargo
    From empleados a
    INNER JOIN salarios c
    ON a.id = c.empleado_id
    INNER JOIN tipo_empleados d
    ON a.tipo_empleado = d.id
    WHERE a.aprobado = 1;
    `)
    res.render('adm/salarios', {data})
})

router.get('/salario-aumento/:id', isLoggedIn, async(req, res) =>{
    const {id} = req.params
    const user = await pool.query(`
    Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato ,c.salario_hora, c.jornada, d.nombre_cargo
    From empleados a
    INNER JOIN salarios c
    ON a.id = c.empleado_id
    INNER JOIN tipo_empleados d
    ON a.tipo_empleado = d.id
    WHERE a.aprobado = 1 AND a.id = ?;`, [id])
    const data = await pool.query(`
    SELECT id, substr(fecha, 1, 10) as fecha, cantidad 
    FROM aumento_salarial
    WHERE activo = true AND id = ?
    `, [id])
    res.render('adm/salarioAumento', {user: user[0], data}, )
})

router.post('/aumento/:id', isLoggedIn, async(req, res) =>{
    const {id} = req.params
    const {cantidad} = req.body
    const salarioActual = await pool.query('SELECT salario_hora FROM salarios WHERE empleado_id = ?', [id])
    const data = {
        empleado_id: id,
        cantidad
    }
    const objectifyRawPacket = salarioActual => ({...salarioActual});
    if(parseInt(data.cantidad) >= 0){
        const salario = ((parseFloat(salarioActual[0].salario_hora) + parseFloat(data.cantidad)))
        const query = await pool.query('INSERT INTO aumento_salarial SET ?;', [data])
        const actSalario = await pool.query(`UPDATE salarios SET salario_hora = ? WHERE id = ?`, [salario, id])
        req.flash('success', 'Aumento realizado satisfactoriamente')
        res.redirect('../../adm/salarios')
    }
    req.flash('message', 'No se puedo realizar el aumento, verifique que ' +data.cantidad+' sea un número positivo')
    res.redirect('../../adm/salarios')
})
//!SECTION 

//SECTION RETENCION SALARIAL
router.get('/salario-retencion/:id', async(req, res) =>{
    const {id} = req.params
    const user = await pool.query(`
    Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, 
    substr(a.fecha_contrato, 1, 10) as fecha_contrato,
    c.salario_hora, c.jornada, d.nombre_cargo
    From empleados a
    INNER JOIN salarios c
    ON a.id = c.empleado_id
    INNER JOIN tipo_empleados d
    ON a.tipo_empleado = d.id
    WHERE a.aprobado = 1 AND a.id = ?;
    `, [id])
    const data = await pool.query(`
    Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, 
    substr(a.fecha_contrato, 1, 10) as fecha_contrato,
    c.salario_hora, c.jornada, d.nombre_cargo, b.retencion, b.fecha, b.descripcion, b.url_documento
    From empleados a
    INNER JOIN salarios c
    ON a.id = c.empleado_id
    INNER JOIN tipo_empleados d
    ON a.tipo_empleado = d.id
    INNER JOIN retencion_salarial b
    ON b.empleado_id = a.id
    WHERE a.aprobado = 1 AND a.id = ?;
    `, [id])
    console.log(data)
    res.render('adm/salarioRetencion', {data, user: user[0]} )
})

router.post('/retencion/:id', async (req, res)=>{
    const {id} = req.params
    const {cantidad, descripcion} = req.body
    const data = {
        descripcion,
        empleado_id: id,
        retencion: cantidad,
        url_documento: req.file.filename
    }
    const query = await pool.query('INSERT INTO retencion_salarial SET ?;', [data])
    console.log('FILE NAME')
    console.log(req.file.filename)
    res.redirect('../../adm/salarios')
})
//!SECTION 

//SECTION BONOS

// router.get('/bonos', isLoggedIn, async(req, res)=>{
//     const data = await pool.query('SELECT * FROM bonos')
//     console.log(data)
//     res.send('funcon')
// })

//!SECTION 


// PANTALLA DE INICO DEL ADM
router.get('/inicio', async(req, res)=>{
    res.send('HOME')
})

module.exports = router