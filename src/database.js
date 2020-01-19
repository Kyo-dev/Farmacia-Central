const mySql = require('mysql')
const {promisify} = require('util')
const {database} = require ('./keys')
const pool = mySql.createPool(database)
pool.getConnection((err, connection)=>{
    if(err){
        if(err.code === 'PROTOCOL_CONNECTION_LOST'){
            console.log('La conexion con la base de datos fue cerrada')
        }
        if(err.code === 'ER_CON_COUNT_ERROR'){
            console.log('Exceso de conexiones en la base de datos')
        }
        if(err.code === 'ECONNREFUSED'){
            console.log('La conexion fue rechazada')
        }
    }
    if(connection) connection.release()
    console.log('Base de datos conectada y funcionando')
    return
})
pool.query = promisify(pool.query)
module.exports = pool