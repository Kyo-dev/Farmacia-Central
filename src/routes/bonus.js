const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')

router.get('/', isLoggedIn, async (req, res) => {
    if(req.user.cedula === '123') {
        const dataUsuarios = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato, b.nombre_cargo
        From empleados a
        INNER JOIN tipo_empleados b
        ON a.tipo_empleado = b.id;
        `)
        const dataBonos = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato, 
        b.motivo, substr(b.fecha, 1, 10) as fecha_bono, b.cantidad, c.nombre_cargo
        From empleados a
        INNER JOIN bonos b
        ON a.id = b.empleado_id
        INNER JOIN tipo_empleados c
        ON a.tipo_empleado = c.id;          
        `)
        console.log(dataBonos)
        res.render('bonus/admHome', { dataUsuarios, dataBonos})
    } else {
        const data = await pool.query(` 
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato, 
        b.motivo, substr(b.fecha, 1, 10) as fecha_bono, b.cantidad, b.motivo
        From empleados a 
        INNER JOIN bonos b
        ON a.id = b.empleado_id
        where a.id = ? `, [req.user.id])
        res.render('bonus/userHome', { data })
    }
})

router.get('/admRegister/:id', isLoggedIn, async(req, res)=>{
    if(req.user.cedula === '123'){
        const {id} = req.params
        const data = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, substr(a.fecha_contrato, 1, 10) as fecha_contrato, b.nombre_cargo
        From empleados a
        INNER JOIN tipo_empleados b
        ON a.tipo_empleado = b.id
        WHERE a.id = ?;
        `, [id])
        console.log(data)
        res.render('bonus/admRegister', {data: data[0]})
    } else {
        res.send('No deberia estar aqui')
    }
})

router.post('/admRegister/:id', isLoggedIn, async (req, res)=>{
    if(req.user.cedula === '123'){
        const {id} = req.params
        const {motivo, cantidad} = req.body
        const data = {
            motivo, 
            cantidad,
            empleado_id: id
        }
        console.log(data)
        const query = await pool.query(`INSERT INTO bonos SET ?;`, [data])
        res.redirect('/bonus')
    } else{
        res.send('No deberia estar aqui')
    }
})

module.exports = router