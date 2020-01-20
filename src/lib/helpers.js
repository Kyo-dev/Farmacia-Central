const bcrypt = require('bcryptjs')
const helpers = {}

helpers.encryptingPass = async (clave) => {
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(clave, salt)
    return hash
}

helpers.decryptingPass = async (clave, storedPass) => {
    try {
        await bcrypt.compare(clave, storedPass )
    } catch (err) {
        console.log(err)
    }
}

module.exports = helpers