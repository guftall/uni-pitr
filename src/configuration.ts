class Configuration {
    httpOptions() {
        return {
            host: process.env.HOST ?? 'localhost',
            port: Number(process.env.PORT ?? '3000')
        }
    }
    fsRepository() {
        return {
            path: process.env.FS_DATABASE_PATH ?? './.config/database.json'
        }
    }
}

const configuration = new Configuration()

export default configuration
