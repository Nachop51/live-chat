import express from 'express';
import logger from 'morgan';

import { Server } from 'socket.io';
import { createServer } from 'node:http';

const port = process.env.PORT ?? 3000;

const app = express();
const server = createServer(app);
const io = new Server(server, {
  connectionStateRecovery: {
    maxDisconnectionDuration: 3000
  }
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('chat message', (msg) => {
    console.log('message: ' + msg);

    io.emit('chat message', 'Hello there from the server!');
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

app.use(logger('dev'));

app.get('/', (req, res) => {
  res.sendFile(process.cwd() + '/client/index.html');
});

server.listen(port, () => {
  console.log(`Server is listening on http://localhost:${port}`);
});
