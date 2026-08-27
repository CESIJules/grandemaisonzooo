const PRESENCE_COLORS = [
    '#FFDE59', // Gold
    '#00F0FF', // Cyan
    '#FF5376', // Coral
    '#A78BFA', // Purple
    '#34D399', // Emerald
    '#FBBF24', // Amber
];
export class ProjectRoom {
    projectId;
    connections = new Set();
    presenceMap = new Map();
    constructor(projectId) {
        this.projectId = projectId;
    }
    addClient(ws, userId, userName) {
        const conn = { ws, userId, userName };
        this.connections.add(conn);
        if (!this.presenceMap.has(userId)) {
            const colorIndex = Math.abs(this.hashString(userId)) % PRESENCE_COLORS.length;
            this.presenceMap.set(userId, {
                userId,
                userName,
                color: PRESENCE_COLORS[colorIndex],
                cursor: { x: 0, y: 0 },
                lastActive: Date.now(),
            });
        }
        else {
            // Update last active
            const p = this.presenceMap.get(userId);
            p.userName = userName || p.userName;
            p.lastActive = Date.now();
        }
        // Broadcast presence update to everyone
        this.broadcastPresence();
        // Broadcast user joined notification to peers
        this.broadcast({
            type: 'user_joined',
            projectId: this.projectId,
            user: { userId, userName },
        }, ws);
    }
    removeClient(ws) {
        let removedUserId;
        for (const conn of this.connections) {
            if (conn.ws === ws) {
                removedUserId = conn.userId;
                this.connections.delete(conn);
                break;
            }
        }
        if (removedUserId) {
            const hasOtherSockets = Array.from(this.connections).some((c) => c.userId === removedUserId);
            if (!hasOtherSockets) {
                this.presenceMap.delete(removedUserId);
                this.broadcast({
                    type: 'user_left',
                    projectId: this.projectId,
                    userId: removedUserId,
                });
                this.broadcastPresence();
            }
        }
        return {
            isEmpty: this.connections.size === 0,
            removedUserId,
        };
    }
    updateCursor(userId, x, y, blockId, senderWs) {
        const presence = this.presenceMap.get(userId);
        if (presence) {
            presence.cursor = { x, y, blockId };
            presence.lastActive = Date.now();
        }
        this.broadcast({
            type: 'cursor_move',
            projectId: this.projectId,
            userId,
            userName: presence?.userName || 'Anonymous',
            x,
            y,
            blockId,
        }, senderWs);
    }
    broadcastBlockUpdate(msg, senderWs) {
        const payload = {
            type: msg.type || 'block_update',
            projectId: this.projectId,
            blockId: msg.blockId,
            content: msg.content,
            order: msg.order,
            canvasPosition: msg.canvasPosition,
            version: msg.version,
            userId: msg.userId,
        };
        this.broadcast(payload, senderWs);
    }
    broadcastPresence() {
        const activeUsers = Array.from(this.presenceMap.values());
        const users = activeUsers.map((u) => u.userName);
        this.broadcast({
            type: 'presence_update',
            projectId: this.projectId,
            users,
            activeUsers,
        });
    }
    broadcast(payload, excludeWs) {
        const message = typeof payload === 'string' ? payload : JSON.stringify(payload);
        for (const conn of this.connections) {
            if (conn.ws !== excludeWs && conn.ws.readyState === 1 /* WebSocket.OPEN */) {
                try {
                    conn.ws.send(message);
                }
                catch {
                    // Ignore transient socket send errors
                }
            }
        }
    }
    getClientCount() {
        return this.connections.size;
    }
    getPresence() {
        return Array.from(this.presenceMap.values());
    }
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }
}
