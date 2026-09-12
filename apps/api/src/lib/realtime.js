import { Server } from "socket.io";

let io;

export function attachRealtime(server, authenticate, canJoinProject) {
  io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      socket.user = await authenticate(token);
      next();
    } catch {
      next(new Error("Invalid access token"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.join(`role:${socket.user.userRole}`);
    socket.on("project:join", async ({ projectId }) => {
      if (projectId && await canJoinProject(socket.user, projectId)) socket.join(`project:${projectId}`);
    });
    socket.on("project:leave", ({ projectId }) => {
      if (projectId) socket.leave(`project:${projectId}`);
    });
    socket.emit("presence:update", { online: io.engine.clientsCount });
    io.emit("presence:update", { online: io.engine.clientsCount });
    socket.on("disconnect", () => io.emit("presence:update", { online: io.engine.clientsCount }));
  });

  return io;
}

export function publishActivity(projectId, activity) {
  if (!io) return;
  io.to(`project:${projectId}`).emit("activity:new", activity);
  io.to("role:ADMIN").emit("activity:new", activity);
}

export function publishNotification(userId, notification) {
  if (!io) return;
  io.to(`user:${userId}`).emit("notification:new", notification);
}

export function publishNotificationCount(userId, unreadCount) {
  if (!io) return;
  io.to(`user:${userId}`).emit("notification:count", { unreadCount });
}
