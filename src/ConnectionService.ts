import pg from 'pg'
import fs from 'fs'
import os from 'os'
import path from 'path'
import Connection from './models/core/Connection'
import ConnectionStatus from './models/core/ConnectionStatus'

const { Client } = pg

const CustomConfigFileName = 'pitr-custom.conf'
class ConnectionService {

    async connectionStatus(connection: Connection): Promise<ConnectionStatus> {

        let result = new ConnectionStatus()
        result.osUserName = os.userInfo().username

        try {

            const client = await this.initClient(connection)

            await client.connect()
            result.connected = true

            let { rows: [{ wal_level }] } = await client.query('show wal_level')
            let { rows: [{ archive_mode }] } = await client.query('show archive_mode')
            let { rows: [{ archive_command }] } = await client.query('show archive_command')
            let { rows: [{ restore_command }] } = await client.query('show restore_command')
            let { rows: [{ data_directory }] } = await client.query('show data_directory')
            let { rows: [{ max_wal_senders }] } = await client.query('show max_wal_senders')
            let { rows: [{ timeline_id }] } = await client.query('SELECT timeline_id FROM pg_control_checkpoint();')


            result.configFilePath = await this.configFilePath(client)
            result.params.walLevel = wal_level
            result.params.archiveMode = archive_mode
            result.params.archiveCommand = archive_command
            result.params.restoreCommand = restore_command
            result.params.dataDirectory = data_directory
            result.params.maxWalSenders = max_wal_senders
            result.timelineId = timeline_id

            try {
                fs.accessSync(result.configFilePath, fs.constants.W_OK)
                result.configFileWritable = true
            } catch (err) {
                result.configFileWritable = false
            }

            await client.end()
        } catch (err) {

            result.connected = false
            result.errors.push(err.message)
        }

        return result
    }
    async walFiles(connection: Connection): Promise<string[]> {

        const client = await this.initClient(connection)

        await client.connect()

        let { rows: [{ data_directory }] } = await client.query('show data_directory')

        await client.end()

        return fs.readdirSync(`${data_directory}/pg_wal`)
    }
    async updateArchiveCommand(connection: Connection, command: string): Promise<void> {

        let customConfigFile = await this.readCustomFile(connection)

        await customConfigFile.updateArchiveCommand(command)
    }
    async updateRestoreCommand(connection: Connection, command: string): Promise<void> {

        let customConfigFile = await this.readCustomFile(connection)

        await customConfigFile.updateRestoreCommand(command)
    }
    async toggleArchiveMode(connection: Connection): Promise<void> {

        let status = await this.connectionStatus(connection)
        let customConfigFile = await this.readCustomFile(connection)


        const newMode = status.params.archiveMode == 'off'
            ? 'on'
            : 'off'

        await customConfigFile.updateArchiveMode(newMode)
    }
    async updateRevoveryTargetTime(connection: Connection, time: Date): Promise<void> {
        
        let customConfigFile = await this.readCustomFile(connection)

        await customConfigFile.updateRecoveryTargetTime(time)
    }
    async updateRecoveryAction(connection: Connection, action: 'promote') : Promise<void> {
        
        let customConfigFile = await this.readCustomFile(connection)

        await customConfigFile.updateRecoveryAction(action)
    }
    private async initClient(connection: Connection): Promise<any> {

        const client = new Client({
            connectionString: connection.connectionString
        })

        return client
    }
    private async configFilePath(client): Promise<string> {

        let { rows: [{ config_file }] } = await client.query('show config_file')

        return config_file
    }
    private async readCustomFile(connection: Connection): Promise<CustomConfigFile> {

        let client = await this.initClient(connection)

        await client.connect()

        const configFilePath = await this.configFilePath(client)

        await client.end()

        await this.updateConfigFileIncludeIfNecessary(configFilePath)

        return new CustomConfigFile(configFilePath)
    }
    private async updateConfigFileIncludeIfNecessary(configFilePath: string) {

        let configFileData = fs.readFileSync(configFilePath, { encoding: 'utf8' })

        if (configFileData.indexOf(`include '${CustomConfigFileName}'`) == -1) {
            configFileData = `${configFileData}\n\ninclude '${CustomConfigFileName}'\n`

            fs.writeFileSync(configFilePath, configFileData)
        }
    }
}

class CustomConfigFile {
    constructor(private configFilePath: string) {

    }
    async createOrReadCustomConfigFile(): Promise<string> {

        const customConfigFilePath = this.customConfigFilePath()

        let exists = fs.existsSync(customConfigFilePath)

        if (exists) {
            return fs.readFileSync(customConfigFilePath, { encoding: 'utf8' })
        } else {
            const content = '# pitr service\n'
            await this.writeCustomConfigFile(content)
            return content
        }
    }
    async updateArchiveCommand(command: string) {

        await this.updateParam('archive_command', command)
    }
    async updateRestoreCommand(command: string) {

        await this.updateParam('restore_command', command)
    }
    async updateArchiveMode(mode: 'on' | 'off') {

        await this.updateParam('archive_mode', mode)
    }
    async updateRecoveryTargetTime(time: Date): Promise<void> {

        await this.updateParam('recovery_target_time', time.toUTCString())
    }
    async updateRecoveryAction(action: 'promote'): Promise<void> {

        await this.updateParam('recovery_target_action', action)
    }
    private async updateParam(key: string, value: string | number) {

        let fileData = await this.createOrReadCustomConfigFile()

        let valueString = typeof(value) == 'string'
            ? `'${value}'`
            : `${value}`

        if (fileData.indexOf(key) == -1) {
            fileData = `${fileData}\n${key} = ${valueString}\n`
        } else {
            let r = new RegExp(`${key}.*\n`, 'g')
            fileData = fileData.replace(r, `${key} = ${valueString}\n`)
        }

        await this.writeCustomConfigFile(fileData)
    }
    private customConfigFilePath() {

        const directoryPath = path.dirname(this.configFilePath)
        return `${directoryPath}/${CustomConfigFileName}`
    }
    private async writeCustomConfigFile(data: string): Promise<void> {

        fs.writeFileSync(this.customConfigFilePath(), data)
    }
}

const connectionService = new ConnectionService()

export default connectionService
