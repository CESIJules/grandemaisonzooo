import { WebSocketServer } from 'ws';
import { ProjectRoom } from './room.js';
export class WebSocketHub {
    wss;
    rooms = new Map();
    socketRoomMap = new Map();
    pingInterval = null;
    constructor(server) {
        this.wss = new WebSocketServer({ server, path: '/ws' });
        this.setupServer();
    }
    setupServer() {
        this.wss.on('connection', (ws) => {
            ws.isAlive = true;
            ws.on('pong', () => {
                ws.isAlive = true;
            });
            ws.on('message', (rawData) => {
                try {
                    const str = rawData.toString();
                    const msg = JSON.parse(str);
                    this.handleMessage(ws, msg);
                }
                catch {
                    // Ignore invalid non-JSON frames
                }
            });
            ws.on('close', () => {
                this.handleDisconnect(ws);
            });
            ws.on('error', () => {
                this.handleDisconnect(ws);
            });
        });
        // 30-second ping heartbeat
        this.pingInterval = setInterval(() => {
            for (const ws of this.wss.clients) {
                if (ws.isAlive === false) {
                    ws.terminate();
                    continue;
                }
                ws.isAlive = false;
                ws.ping();
            }
        }, 30000);
    }
    handleMessage(ws, msg) {
        if (!msg || typeof msg !== 'object')
            return;
        switch (msg.type) {
            case 'join_project': {
                const { projectId, userId, userName } = msg;
                if (!projectId || !userId)
                    return;
                // Leave any existing room for this socket
                this.handleDisconnect(ws);
                let room = this.rooms.get(projectId);
                if (!room) {
                    room = new ProjectRoom(projectId);
                    this.rooms.set(projectId, room);
                }
                this.socketRoomMap.set(ws, projectId);
                room.addClient(ws, userId, userName || 'Anonymous');
                break;
            }
            case 'cursor_move': {
                const { projectId, userId, x, y, blockId } = msg;
                if (!projectId || !userId)
                    return;
                const room = this.rooms.get(projectId);
                if (room) {
                    room.updateCursor(userId, x, y, blockId, ws);
                }
                break;
            }
            case 'block_update': {
                const { projectId } = msg;
                if (!projectId)
                    return;
                const room = this.rooms.get(projectId);
                if (room) {
                    room.broadcastBlockUpdate(msg, ws);
                }
                break;
            }
            case 'leave_project': {
                this.handleDisconnect(ws);
                break;
            }
            default:
                break;
        }
    }
    handleDisconnect(ws) {
        const projectId = this.socketRoomMap.get(ws);
        if (!projectId)
            return;
        this.socketRoomMap.delete(ws);
        const room = this.rooms.get(projectId);
        if (room) {
            const { isEmpty } = room.removeClient(ws);
            if (isEmpty) {
                this.rooms.delete(projectId);
            }
        }
    }
    getRoom(projectId) {
        return this.rooms.get(projectId);
    }
    getRoomsCount() {
        return this.rooms.size;
    }
    close() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        for (const ws of this.wss.clients) {
            try {
                ws.terminate();
            }
            catch {
                // ignore close error
            }
        }
        this.wss.close();
    }
}
