export default class ConnectionStatus {
    connected: boolean
    configFilePath: string
    configFileWritable: boolean
    osUserName: string
    timelineId: number
    params: ServerParams

    errors: string[]

    constructor() {
        this.errors = []
        this.params = new ServerParams()
    }
}

class ServerParams {
    walLevel: 'replica'
    archiveMode: 'on' | 'off'
    archiveCommand: string
    restoreCommand: string
    dataDirectory: string
    maxWalSenders: number
}
