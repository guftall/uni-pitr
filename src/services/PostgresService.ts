import shelljs from 'shelljs'
import Connection from '../models/core/Connection'
import ConnectionStatus from '../models/core/ConnectionStatus'

const { exec } = shelljs

class PostgresService {

    async makeBackup(path: string, connection: Connection): Promise<void> {

        try {
            const command = `pg_basebackup --format=tar --pgdata=${path} --dbname='${connection.connectionString}' --no-password`

            await new Promise((resolve, reject) => {

                exec(command, { shell: '/bin/bash' }, (code, stdout, stderr) => {

                    if (stderr || code != 0) {
                        reject(stderr ?? code)
                    } else {
                        resolve(stdout)
                    }
                })
            })
        } catch (err) {
            throw new Error(`execute backup command faild: ${err}`)
        }
    }
    async stopDaemon() {

        try {
            const command = `service postgresql stop`

            await new Promise((resolve, reject) => {

                exec(command, { shell: '/bin/bash' }, (code, stdout, stderr) => {

                    if (stderr || code != 0) {
                        reject(stderr ?? code)
                    } else {
                        resolve(stdout)
                    }
                })
            })
        } catch (err) {
            throw new Error(`execute stop command faild: ${err}`)
        }
    }
    async startDaemon() {

        try {
            const command = `service postgresql start`

            await new Promise((resolve, reject) => {

                exec(command, { shell: '/bin/bash' }, (code, stdout, stderr) => {

                    if (stderr || code != 0) {
                        reject(stderr ?? code)
                    } else {
                        resolve(stdout)
                    }
                })
            })
        } catch (err) {
            throw new Error(`execute start command faild: ${err}`)
        }
    }
    async restartDaemon() {

        try {
            const command = `service postgresql restart`

            await new Promise((resolve, reject) => {

                exec(command, { shell: '/bin/bash' }, (code, stdout, stderr) => {

                    if (stderr || code != 0) {
                        reject(stderr ?? code)
                    } else {
                        resolve(stdout)
                    }
                })
            })
        } catch (err) {
            throw new Error(`execute restart command faild: ${err}`)
        }
    }
    async startRecovering(connection: Connection, connectionStatus: ConnectionStatus, targetTime: number): Promise<void> {

        await this.stopDaemon()

        await this.moveOldDataDirectory(connectionStatus.params.dataDirectory)


        await this.restoreBaseBackup(connection.lastBaseBackup.path, connectionStatus.params.dataDirectory)

        await this.startDaemon()
    }
    private async moveOldDataDirectory(path: string) {

        await new Promise((resolve, reject) => {

            const command = `mv ${path} ${path}-${Date.now()}`
            exec(command, (code, stdout, stderr) => {

                if (stderr || code != 0) {
                    reject(stderr ?? code)
                } else {
                    resolve(stdout)
                }
            })
        })
    }
    private async restoreBaseBackup(baseBackupPath: string, newDataDir: string) {

        const command = `mkdir ${newDataDir} && chmod 0700 ${newDataDir} && tar xvf ${baseBackupPath}/base.tar -C ${newDataDir} && rm -rf ${newDataDir}/pg_wal/* && touch ${newDataDir}/recovery.signal`

        await new Promise((resolve, reject) => {

            exec(command, (code, stdout, stderr) => {
                if (stderr || code != 0) {
                    reject(stderr ?? code)
                } else {
                    resolve(stdout)
                }
            })
        })
    }
}

const postgresService = new PostgresService()

export default postgresService
