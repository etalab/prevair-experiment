const micro = require('micro')
const index = require('.')

const port = process.env.PORT
const server = micro(index)

server.listen(port)
