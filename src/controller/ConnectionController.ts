import express from 'express'
import { v4 as uuidv4 } from 'uuid'
import connectionService from '../ConnectionService'
import Connection from '../models/core/Connection'
import repository from '../repository'
import postgresService from '../services/PostgresService'

export const router = express.Router()

router.get('/', async (req, res) => {

    let result = await repository.getConnections()
    res.send(result)
})

router.get('/:id/status', async (req, res) => {

    let id = req.params.id

    let connection = await repository.findConnection(id)

    if (!connection) {
        return res.send({ message: 'not found' })
    }

    let result = await connectionService.connectionStatus(connection)

    res.send(result)
})

router.post('/', async (req, res) => {

    let connection = req.body as Connection

    let connections = await repository.getConnections()

    for (let conn of connections) {
        if (conn.name == connection.name) {
            return res.send({ error: 'name exists' })
        }
    }

    connection.id = uuidv4()
    await repository.addConnection(connection)

    res.send({ message: 'success' })
})

router.post('/:id/backup', async (req, res) => {

    let id = req.params.id,
        backupPath = req.body.path

    let connection = await repository.findConnection(id)

    try {

        await postgresService.makeBackup(backupPath, connection)
        connection.lastBaseBackup = {
            path: backupPath,
            at: Date.now(),
        }

        await repository.updateConnection(connection)
    } catch (err) {
        return res.send({ error: err.message })
    }

    res.send({ message: 'success' })
})

router.post('/:id/recover', async (req, res) => {

    let id = req.params.id,
        targetTime = Number(req.body.targetTime)

    let connection = await repository.findConnection(id)

    if (targetTime > connection.lastBaseBackup?.at) {

        if (targetTime <= connection.lastRecoveryTargetTime) {
            return res.send({error: 'last recovery time is greater or equal to targetTime'})
        }

        const status = await connectionService.connectionStatus(connection)

        await connectionService.updateRecoveryAction(connection, 'promote')
        await connectionService.updateRevoveryTargetTime(connection, new Date(targetTime))

        await postgresService.startRecovering(connection, status, targetTime)

        connection.lastRecoveryTargetTime = targetTime

        await repository.updateConnection(connection)
    } else {
        return res.send({ error: 'target time is greater than last baseBackup or no baseBackup found' })
    }

    res.send({ message: 'success' })
})

router.post('/:id/params/archive-command', async (req, res) => {

    let id = req.params.id,
        command = req.body.command

    let connection = await repository.findConnection(id)

    await connectionService.updateArchiveCommand(connection, command)

    res.send({ message: 'success' })
})

router.post('/:id/params/restore-command', async (req, res) => {

    let id = req.params.id,
        command = req.body.command

    let connection = await repository.findConnection(id)

    await connectionService.updateRestoreCommand(connection, command)

    res.send({ message: 'success' })
})

router.post('/:id/params/archive-mode', async (req, res) => {

    let id = req.params.id

    let connection = await repository.findConnection(id)

    await connectionService.toggleArchiveMode(connection)

    res.send({ message: 'success' })
})

router.post('/:id/restart', async (req, res) => {

    let id = req.params.id

    let connection = await repository.findConnection(id)

    try {

        await postgresService.restartDaemon()
    } catch (err) {
        return res.send({ error: err.message })
    }

    res.send({ message: 'success' })
})

router.post('/:id/start', async (req, res) => {

    let id = req.params.id

    let connection = await repository.findConnection(id)

    try {

        await postgresService.startDaemon()
    } catch (err) {
        return res.send({ error: err.message })
    }

    res.send({ message: 'success' })
})

router.post('/:id/stop', async (req, res) => {

    let id = req.params.id

    let connection = await repository.findConnection(id)

    try {

        await postgresService.stopDaemon()
    } catch (err) {
        return res.send({ error: err.message })
    }

    res.send({ message: 'success' })
})

router.get('/:id/wal', async (req, res) => {

    let id = req.params.id

    let connection = await repository.findConnection(id)

    const result = await connectionService.walFiles(connection)

    res.send(result)
})

router.put('/:id', async (req, res) => {

    const id = req.params.id,
        connectionString = req.body?.connectionString

    let connection = await repository.findConnection(id)

    if (!connection) {
        return res.send({ message: 'connection not exists' })
    }

    connection.connectionString = connectionString

    await repository.updateConnection(connection)

    res.send({ message: 'updated' })
})
