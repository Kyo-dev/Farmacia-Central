const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')
const moment = require('moment')
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
         if (ext !== '.pdf' && ext !== '.docx') {
        //  if (ext !== '.png' && ext !== '.jpg' && ext !== '.pdf' && ext !== '.jpeg' && ext !== '.docx') {
              req.fileValidationError = "Forbidden extension";
              return cb(null, false, req.fileValidationError);
        }
        cb(null, true);
    }
});

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
        WHERE a.aprobado = 1 and a.activo = 1
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
        WHERE empleado_id = ? and activo = true
        LIMIT 3;`, [req.user.id])
        const dataInability = await pool.query(`
        select id, substr(fecha_salida, 1,10) as fecha_salida, substr(fecha_entrada,1, 10) as fecha_entrada , motivo 
        from incapacidades
        where empleado_id = ? and activo = true
        order by id desc
        LIMIT 1;`, [req.user.id]) 
        console.log(dataInability)
        res.render('salary/userHome', {
            dataSalary: dataSalary[0],
            dataIncrease: dataIncrease[0],
            dataWageWithHolding,
            arrayIncrease,
            dataInability: dataInability[0]
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
            const salario = ((parseInt(salarioActual[0].salario_hora) + parseInt(data.cantidad)))
            const query = await pool.query('INSERT INTO aumento_salarial SET ?;', [data])
            const actSalario = await pool.query(`UPDATE salarios SET salario_hora = ? WHERE empleado_id = ?`, [salario, id])
            req.flash('success', 'Aumento realizado satisfactoriamente')
            return res.redirect('/salary')
        }
    } else {
        req.flash('message', `ERROR, Debe ser un administrador para porder realizar esta acción`)
        return res.redirect('/salary')
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
        on b.tipo_empleado = a.id
        where b.id = ?`, [id])
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

router.post('/admTax/:id', isLoggedIn, upload.single("url_documento"), async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        if (req.fileValidationError) {
            console.log('1')
            req.flash('message', `El formato ingresado no es válido`)
            return res.redirect('/salary')
        }
        console.log('2')
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
            return res.redirect('/salary')
        }
        if (data.descripcion.length <= 0) {
            req.flash('message', `Por favor ingrese una descripción`)
            return res.redirect('/salary')
        }
        try {
            const query = await pool.query('INSERT INTO retencion_salarial SET ?;', [data])
            req.flash('success', `Proceso realizado satisfactoriamente`)
            return res.redirect('/salary')
        } catch (error) {
            console.log(error)
            req.flash('message', `Error con los datos`)
            return res.redirect('/users')
        }
       
    } else {
        return res.redirect('/salary')
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

router.get('/admInability/:id', isLoggedIn, async(req, res) => {
    if(req.user.tipo_empleado === 1){
        const {id} = req.params
        const dataDate = await pool.query('select substr(now(), 1, 10) as fecha;')
        const dataInability = await pool.query(`
        select id, substr(fecha_salida, 1,10) as fecha_salida, substr(fecha_entrada,1, 10) as fecha_entrada , motivo 
        from incapacidades
        where empleado_id = ? and activo = true`, [id]) 
        const dataUser = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, 
        substr(a.fecha_contrato, 1, 10) as fecha_contrato
        From empleados a
        WHERE a.id = ?`, [id])
        const dataRole = await pool.query(`
        select a.nombre_cargo
        from tipo_empleados a
        inner join empleados b
        on b.tipo_empleado = a.id
        where b.id = ?` ,[id])
        console.log(dataDate[0].fecha)
        res.render('salary/admInability', {dataUser: dataUser[0], dataRole: dataRole[0], dataDate: dataDate[0], dataInability})
    }
})

router.post('/admInability/:id', isLoggedIn, async(req, res)=>{
    if(req.user.tipo_empleado === 1){
        const {id} = req.params
        const {fecha_salida, fecha_entrada, motivo} = req.body
        let fecha1 = moment(fecha_salida);
        let fecha2 = moment(fecha_entrada);
        const cantidad = fecha2.diff(fecha1, 'days'); //DIAS DEL FORMULARIO
        const data = {
            empleado_id: id,
            fecha_salida: fecha_salida,
            fecha_entrada: fecha_entrada,
            motivo: motivo,
            cantidad: cantidad
        }
        if(data.fecha_salida <= 0){
            req.flash('message', 'Ingresa una fecha de reingreso valida')
            return res.redirect('/salary')
        }
        if(data.fecha_entrada <= 0){
            req.flash('message', 'Ingresa una fecha de entrada valida')
            return res.redirect('/salary')
        }
        if(data.motivo.length <= 0){
            req.flash('message', 'Por favor ingrese un motivo')
            return res.redirect('/salary')
        }
        if(data.fecha_entrada == fecha_salida){
            req.flash('message', 'La fechas deben ser distintas')
            return res.redirect('/salary')
        }
        if(data.motivo.length >= 200){
            req.flash('message', 'Simplifique si explicación')
            return res.redirect('/salary')
        }
        if(data.cantidad.length <= 0){
            req.flash('message', 'Error en la fecha')
            return res.redirect('/salary')
        }
        const exist = await pool.query('select substr(fecha_salida,1, 10) as fecha_salida from incapacidades where empleado_id = ? and fecha_salida = ? LIMIT 1;', [id, data.fecha_salida])
        console.log('CONSOLA')
        console.log(exist)
        if(exist.length > 0 ){
            // console.log('exist')
            // console.log(exist)
            // const jsonBonus = JSON.stringify(exist[0].fecha_salida)
            // console.log(jsonBonus)
            // if(JSON.stringify(exist[0].fecha_salida) == null ) {
                req.flash('message', 'Ya has ingresado esa fecha de salida')
                return res.redirect('/salary')
            // }
        }
        try {
            await pool.query('INSERT INTO incapacidades SET ?;', [data])
            req.flash('success', 'Registro realizado de forma satisfactoria')
            return res.redirect('/salary')
        } catch (error) {
            console.log(error)
            req.flash('message', 'Error, por favor intentelo de nuevo')
            return res.redirect('/salary')
        }
    }
})

router.get('/admDeleteInability/:id', isLoggedIn, async (req, res) => {
    if (req.user.tipo_empleado === 1) {
        const {id} = req.params
        const data = {
            activo: false
        }
        const query = await pool.query(`UPDATE incapacidades SET ? WHERE id = ?;`,[data, id])
        req.flash('success', 'Incapacidad eliminada satisfactoriamente.')
        res.redirect('/salary')
    }
})


// !SECTION 

// SECTION USER



// !SECTION 

module.exports = router