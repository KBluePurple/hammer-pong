import { createServer } from "http";
import {Server, Socket} from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const socketRoom = new Map<Socket, string>();

io.on("connection", (socket) => {
    socket.on("room", (room) => {
        socket.join(room);
        socketRoom.set(socket, room);
        socket.emit("userCount", io.sockets.adapter.rooms.get(room)?.size);
    });

    socket.on("message", (message) => {
        socket.to(socketRoom.get(socket) as string).emit("message", message);
    });

    socket.on("disconnect", () => {
        socketRoom.delete(socket);
    });
});

httpServer.listen(3000);