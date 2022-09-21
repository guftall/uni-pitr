class Logger {
    debug(str: string) {
        console.log(str)
    }
    error(str: string, err: Error) {
        console.error(str, err)
    }
}

const logger = new Logger()

export default logger
