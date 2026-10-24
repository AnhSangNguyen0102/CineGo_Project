import { io, Socket } from 'socket.io-client';

type EventCallback = (data: any) => void;

class CineGoSocketManager {
  private socket: Socket | null = null;
  private isMock = import.meta.env.VITE_USE_MOCK === 'true';
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private currentRoom: string | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('cinego_realtime_seats');
      this.broadcastChannel.onmessage = (event) => {
        const { room, eventName, data } = event.data;
        if (!this.currentRoom || this.currentRoom === room) {
          this.notifyLocalListeners(eventName, data);
        }
      };
    }

    if (!this.isMock) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
      this.socket = io(socketUrl, {
        autoConnect: false,
        transports: ['websocket', 'polling'],
      });
      
      this.socket.on('seat:update', (data) => this.notifyLocalListeners('seat:update', data));
      this.socket.on('lock:expired', (data) => this.notifyLocalListeners('lock:expired', data));
    }
  }

  public joinShowtime(showtimeId: string) {
    this.currentRoom = `showtime:${showtimeId}`;
    if (this.socket && this.socket.connected) {
      this.socket.emit('join', this.currentRoom);
    }
  }

  public leaveShowtime() {
    if (this.currentRoom && this.socket && this.socket.connected) {
      this.socket.emit('leave', this.currentRoom);
    }
    this.currentRoom = null;
  }

  public on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);

    if (this.socket) {
      this.socket.on(event, callback);
    }

    return () => this.off(event, callback);
  }

  public off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  public emitMockEvent(eventName: string, data: any) {
    // Notify same window
    this.notifyLocalListeners(eventName, data);
    
    // Broadcast to other tabs/windows
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        room: this.currentRoom,
        eventName,
        data,
      });
    }
  }

  private notifyLocalListeners(eventName: string, data: any) {
    const callbacks = this.listeners.get(eventName);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in socket listener for ${eventName}:`, err);
        }
      });
    }
  }
}

export const socketManager = new CineGoSocketManager();
