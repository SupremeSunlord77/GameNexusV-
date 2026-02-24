import { Server } from 'socket.io';

let io: Server;

export const setIO = (ioInstance: Server) => {
  io = ioInstance;
};

export const getIO = (): Server => io;
