import express from 'express';
import logger from 'morgan';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';

import { Server } from 'socket.io';
import { createServer } from 'node:http';

const port = process.env.PORT ?? 3000;

dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 3000
  }
});

const db = createClient({
  url: 'libsql://accepted-blok-nachop51.turso.io',
  authToken: process.env.DB_TOKEN
});

await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    user TEXT
  );
`);

io.on('connection', async (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  socket.on('chat message', async (msg, username) => {
    let result;
    try {
      result = await db.execute({
        sql: 'INSERT INTO messages (content, username) VALUES (:msg, :username)',
        args: {
          msg,
          username
        }
      });
    } catch (err) {
      console.error(err);
      return;
    }

    io.emit('chat message', msg, result.lastInsertRowid.toString(), username);
  });

  // console.log(socket.handshake.auth);

  if (!socket.recovered) {
    try {
      const results = await db.execute({
        sql: 'SELECT * FROM messages WHERE id > :id',
        args: {
          id: [socket.handshake.auth.serverOffset ?? 0]
        }
      });

      results.rows.forEach(row => {
        socket.emit('chat message', row.content, row.id.toString(), row.username);
      });
    } catch (err) {
      console.error(err);
    }
  }
});

app.use(logger('dev'));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/client/index.html');
});

server.listen(port, () => {
  console.log(`Server is listening on http://localhost:${port}`);
});
