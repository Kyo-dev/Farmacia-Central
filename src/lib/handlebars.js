const {format} = require('timeago.js')

const helpers = {}

helpers.timesago =  (timestamp) =>{
    return format(timestamp)
}
module.exports = helpers;