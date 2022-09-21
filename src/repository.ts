import fs from 'fs'
import configuration from './configuration'
import Connection from './models/core/Connection'

class Repository {

    private database: Database

    constructor() {
        this.init()
    }

    async getConnections(): Promise<Connection[]> {

        return this.database.connections
    }
    async findConnection(id: string): Promise<Connection> {

        return this.database.connections.find(conn => conn.id == id)
    }
    async addConnection(connection: Connection) {
        this.database.connections.push(connection)
        this.writeDatabase()
    }
    async updateConnection(connection: Connection) {
        let conn = this.database.connections.find(conn => conn.id == connection.id)

        conn.connectionString = connection.connectionString
        conn.lastBaseBackup = connection.lastBaseBackup
        conn.lastRecoveryTargetTime = connection.lastRecoveryTargetTime

        this.writeDatabase()
    }

    private init() {
        this.readDatabase()
    }
    private readDatabase() {

        let content = fs.readFileSync(configuration.fsRepository().path, 'utf-8')

        this.database = JSON.parse(content)
    }
    private writeDatabase() {

        fs.writeFileSync(configuration.fsRepository().path, JSON.stringify(this.database), 'utf-8')
    }
}

type Database = {
    connections: Connection[]
}

const repository = new Repository()

export default repository
