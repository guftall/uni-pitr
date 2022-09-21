export default class Connection {
    id: string
    name: string
    connectionString?: string
    lastBaseBackup?: {
        path: string
        at: number
    }
    lastRecoveryTargetTime?: number
}