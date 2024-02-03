    import  express  from 'express'
    import logger from 'morgan'
    import {Server} from 'socket.io'
    import { createServer } from 'node:http'
    import { Socket } from 'node:dgram'
    import dotenv from 'dotenv'
    import {createClient} from '@libsql/client'

    dotenv.config()
    const port = process.env.PORT || 3000
    const app = express()
    app.use(logger('dev'))
    const server= createServer(app)
    const io = new Server(server,{
        connectionStateRecovery:{},
    })

    const db =createClient({
        url:'libsql://certain-expediter-reginaldodelarosa.turso.io',
        authToken:process.env.DB_TOKEN

    })

    await db.execute(
        `CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT, username TEXT)`
    )


    io.on('connection', async (socket) => {
        console.log('New connection')

        socket.on('disconnect', () => {
            console.log('User disconnected')
    })

        socket.on('chat message', async (msg) => {
            let result 
            const username  = socket.handshake.auth.username ?? 'Anonymous'
            try {
                
                result = await db.execute({
                    sql:`INSERT INTO messages (content, username) VALUES (:msg,:username)`,
                    args:{msg,username}
                    
                    })
            } catch (error) {
                console.error(error)
                return
            }
            io.emit('chat message', msg,result.lastInsertRowid.toString(), username)

    })
        console.log(socket.handshake.auth)
        if(!socket.recovered){
            try {
                const result = await db.execute({
                    sql:`SELECT id, content, username  FROM messages WHERE id > ?`,
                    args:[socket.handshake.auth.serverOffset ?? 0]
                    })
                    result.rows.forEach(row => {
                        socket.emit('chat message', row.content, row.id.toString(),row.username)
                    })
                    
            } catch (error) {
                console.error(error)
        }

    }
})

    app.get('/', (req, res) => {
        res.sendFile(process.cwd() + '/client/index.html')
    })

    server.listen(port, () => {
        console.log(`Server running on port ${port}`)
    })
