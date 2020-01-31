const express = require('express')
const router = express.Router()
const pool = require('../database')
const { isLoggedIn } = require('../lib/auth')

router.get('/', isLoggedIn, async (req, res)=>{
    if(req.user.cedula === '123'){
        const data = await pool.query(`
        Select a.id, a.cedula, a.nombre, a.p_apellido, a.s_apellido, b.motivo, substr(b.fecha, 1, 10) as fecha, b.cantidad_horas
        From empleados a 
        INNER JOIN horas_extra b
        ON a.id = b.empleado_id;
        `)
        res.render('overTime/admHome', {data})
    } else {
        const data = await pool.query('SELECT * FROM horas_extra WHERE id = ?', [req.user.id])
        console.log(data)
        res.render('overTime/userHome', {data})
    }
})

router.get('/newRegister', isLoggedIn, async(req, res) =>{
    res.render('overTime/userNewRegister')
})

router.post('/newRegister', isLoggedIn, async(req, res) =>{
    const {cantidad_horas, motivo} = req.body
    const data = {
        cantidad_horas, 
        motivo,
        empleado_id: req.user.id
    }
    if(cantidad_horas <= 0){
        req.flash('message', `El valor ${cantidad_horas} debe ser un numero positivo`)
        res.redirect('/profile')
    }
    if(motivo.length <=0 ){
        req.flash('message', `Por favor especifíque su trabajo durante las horas extra`)
        res.redirect('/profile')
    }
    const query = pool.query('INSERT INTO horas_extra SET ?', [data])
    res.redirect('/profile')
})

module.exports = router