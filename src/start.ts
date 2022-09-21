import http from 'http'
import express from "express"
import cors from 'cors'
import logger from './Logger'
import configuration from './configuration'
import { router as connectionRouter } from './controller/ConnectionController'

// process.setuid(Number(process.env.POSTGRES_UID))
// process.setgid(Number(process.env.POSTGRES_GID))

const app = express()

app.use(cors())
app.use(express.json({ strict: false, limit: '12mb' }))
app.use(express.urlencoded({ extended: true, limit: '12mb' }))

app.use('/connection', connectionRouter)

const httpServer = http.createServer(app)


httpServer.listen(configuration.httpOptions().port, configuration.httpOptions().host, () => {

    logger.debug(`Http server started [${configuration.httpOptions().host}, ${configuration.httpOptions().port}]`)
})

export {
    httpServer
}
