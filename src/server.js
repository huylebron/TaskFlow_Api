/* eslint-disable no-console */
/**
 * Updated by trungquandev.com's author on August 17 2023
 * YouTube: https://youtube.com/@trungquandev
 * "A bit of fragrance clings to the hand that gives flowers!"
 */

import express from 'express'
import cors from 'cors'
import { corsOptions } from '~/config/cors'
import exitHook from 'async-exit-hook'
import { CONNECT_DB, CLOSE_DB } from '~/config/mongodb'
import { env } from '~/config/environment'
import { APIs_V1 } from '~/routes/v1'
import { errorHandlingMiddleware } from '~/middlewares/errorHandlingMiddleware'
import cookieParser from 'cookie-parser'
// Xử lý socket real-time với gói socket.io
// https://socket.io/get-started/chat/#integrating-socketio
import http from 'http'
import socketIo from 'socket.io'
import { inviteUserToBoardSocket } from '~/sockets/inviteUserToBoardSocket'
import { boardSocket } from '~/sockets/boardSocket'
import { cardSocket } from '~/sockets/cardSocket'
// Import card model for creating indexes
import { cardModel } from '~/models/cardModel'
import { changeStatusConfirmedCard } from './sockets/changeStatusConfirmedCard'

let io

const START_SERVER = () => {
  const app = express()

  // Fix cái vụ Cache from disk của ExpressJS
  // https://stackoverflow.com/a/53240717/8324172
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store')
    next()
  })

  // Cấu hình Cookie Parser
  app.use(cookieParser())

  // Xử lý CORS
  app.use(cors(corsOptions))

  // Enable req.body json data
  app.use(express.json())

  // Use APIs V1
  app.use('/v1', APIs_V1)

  // Middleware xử lý lỗi tập trung
  app.use(errorHandlingMiddleware)

  // Tạo một cái server mới bọc thằng app của express để làm real-time với socket.io
  const server = http.createServer(app)
  // Khởi tạo biến io với server và cors

  const io = socketIo(server, { cors: corsOptions })
  global._io = io;

  io.on('connection', (socket) => {
    inviteUserToBoardSocket(socket)

    changeStatusConfirmedCard(socket)

    boardSocket(io, socket)
    cardSocket(io, socket)

    // ...vv
  })

  // Môi trường Production (cụ thể hiện tại là đang support Render.com)
  if (env.BUILD_MODE === 'production') {
    // ✅ FIX: Bind to 0.0.0.0 for Render deployment
    const port = process.env.PORT || 8017
    const host = '0.0.0.0'
    
    server.listen(port, host, () => {
      console.log(`3. Production: Hi ${env.AUTHOR}, Back-end Server is running successfully at Host: ${host} and Port: ${port}`)
    })
  } else {
    // Môi trường Local Dev
    server.listen(env.LOCAL_DEV_APP_PORT, env.LOCAL_DEV_APP_HOST, () => {
      console.log(`3. Local DEV: Hi ${env.AUTHOR}, Back-end Server is running successfully at Host: ${env.LOCAL_DEV_APP_HOST} and Port: ${env.LOCAL_DEV_APP_PORT}`)
    })
  }

  // Thực hiện các tác vụ cleanup trước khi dừng server
  // Đọc thêm ở đây: https://stackoverflow.com/q/14031763/8324172
  exitHook(() => {
    console.log('4. Server is shutting down...')
    CLOSE_DB()
    console.log('5. Disconnected from MongoDB Cloud Atlas')
  })
}

// Chỉ khi Kết nối tới Database thành công thì mới Start Server Back-end lên.
// Immediately-invoked / Anonymous Async Functions (IIFE)
(async () => {
  try {
    console.log('1. Connecting to MongoDB Cloud Atlas...')
    await CONNECT_DB()
    console.log('2. Connected to MongoDB Cloud Atlas!')

    // Create database indexes for optimized queries
    console.log('2.1. Creating database indexes for optimized queries...')
    await cardModel.createIndexes()
    
    // Khởi động Server Back-end sau khi đã Connect Database thành công
    START_SERVER()
  } catch (error) {
    console.error(error)
    process.exit(0)
  }
})()

// // Chỉ khi Kết nối tới Database thành công thì mới Start Server Back-end lên.
// console.log('1. Connecting to MongoDB Cloud Atlas...')
// CONNECT_DB()
//   .then(() => console.log('2. Connected to MongoDB Cloud Atlas!'))
//   .then(() => START_SERVER())
//   .catch(error => {
//     console.error(error)
//     process.exit(0)
//   })

export { io }
