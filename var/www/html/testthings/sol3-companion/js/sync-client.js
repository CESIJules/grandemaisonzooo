/**
 * sync-client.js — Client de Synchronisation Temps Réel ARG (PC <-> Mobile)
 * Supporte le polling HTTP avec sync.php, le canal BroadcastChannel local,
 * et le mode autonome 100% hors-ligne
 */
(function (global) {
  'use strict';

  class ARGSyncClient {
    constructor(options) {
      options = options || {};
      this.role = options.role || 'pc'; // 'pc' | 'mobile'
      this.sessionId = options.sessionId || this._extractSessionFromUrl() || '';
      this.apiEndpoint = options.apiEndpoint || '/testthings/sol3-companion/sync.php';
      this.pollIntervalMs = options.pollIntervalMs || 800;
      this.currentVersion = 0;
      this.currentState = 'standby';
      this.lastSessionData = null;
      this.pollingTimer = null;
      this.isStandalone = false;
      this.listeners = [];

      // BroadcastChannel pour synchronisation instantanée entre onglets locaux
      this.bc = null;
      const BC = (typeof window !== 'undefined' && window.BroadcastChannel) || (typeof BroadcastChannel !== 'undefined' ? BroadcastChannel : null);
      if (BC) {
        try {
          this.bc = new BC('arg_room45_channel');
          this.bc.onmessage = (event) => {
            const data = event.data;
            if (data && (!this.sessionId || data.sessionId === this.sessionId)) {
              this._handleRemoteUpdate(data.session);
            }
          };
        } catch (e) {
          console.warn('BroadcastChannel non disponible:', e);
        }
      }
    }

    _extractSessionFromUrl() {
      try {
        if (typeof URLSearchParams !== 'undefined' && typeof window !== 'undefined' && window.location && window.location.search) {
          const params = new URLSearchParams(window.location.search);
          const s = params.get('session');
          if (s) return s;
        }
        if (typeof window !== 'undefined' && window.location && window.location.search) {
          const m = window.location.search.match(/[?&]session=([^&]+)/);
          if (m) return decodeURIComponent(m[1]);
        }
        return '';
      } catch (e) {
        return '';
      }
    }

    onStateChange(fn) {
      if (typeof fn === 'function') {
        this.listeners.push(fn);
      }
    }

    _emitChange(session) {
      this.lastSessionData = session;
      this.currentState = session.state;
      this.currentVersion = session.version;
      for (const listener of this.listeners) {
        try {
          listener(session.state, session);
        } catch (e) {
          console.error('Erreur listener sync:', e);
        }
      }
    }

    _broadcastLocal(session) {
      if (this.bc) {
        try {
          this.bc.postMessage({ sessionId: this.sessionId, session: session });
        } catch (e) {}
      }
    }

    async init() {
      if (this.role === 'pc') {
        if (!this.sessionId) {
          // Génération d'un code de session court
          const randHex = Math.random().toString(16).substring(2, 6).toUpperCase();
          this.sessionId = 'R45-' + randHex;
        }
        await this.createSession();
      } else {
        // Mobile
        if (this.sessionId) {
          await this.joinSession();
        } else {
          // Sans session spécifique : mode autonome
          this.isStandalone = true;
          this._emitChange({
            id: 'STANDALONE',
            state: 'standby',
            mobile_connected: true,
            version: 1,
            secret: 'SUFFOCATION'
          });
        }
      }

      this.startPolling();
      return this.sessionId;
    }

    async createSession() {
      try {
        const res = await fetch(`${this.apiEndpoint}?action=create&session=${encodeURIComponent(this.sessionId)}`, {
          method: 'GET',
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && json.session) {
            this.sessionId = json.session.id;
            this._emitChange(json.session);
            this._broadcastLocal(json.session);
            return json.session;
          }
        }
        throw new Error('Échec HTTP createSession status=' + res.status);
      } catch (err) {
        console.warn('Mode réseau indisponible, bascule en mode autonome local:', err);
        this.isStandalone = true;
        const localSession = {
          id: this.sessionId || 'R45-LOCAL',
          state: 'standby',
          mobile_connected: false,
          version: 1,
          secret: 'SUFFOCATION'
        };
        this._emitChange(localSession);
        return localSession;
      }
    }

    async joinSession() {
      try {
        const res = await fetch(`${this.apiEndpoint}?action=join&session=${encodeURIComponent(this.sessionId)}`, {
          method: 'GET',
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && json.session) {
            this._emitChange(json.session);
            this._broadcastLocal(json.session);
            return json.session;
          }
        }
        throw new Error('Échec HTTP joinSession status=' + res.status);
      } catch (err) {
        this.isStandalone = true;
        const localSession = {
          id: this.sessionId || 'STANDALONE',
          state: 'connected',
          mobile_connected: true,
          version: 1,
          secret: 'SUFFOCATION'
        };
        this._emitChange(localSession);
        this._broadcastLocal(localSession);
        return localSession;
      }
    }

    async notifyScanStart() {
      if (this.isStandalone) {
        const mock = {
          id: this.sessionId,
          state: 'scanning',
          version: this.currentVersion + 1,
          mobile_connected: true
        };
        this._emitChange(mock);
        this._broadcastLocal(mock);
        return;
      }

      try {
        const res = await fetch(`${this.apiEndpoint}?action=scan_start&session=${encodeURIComponent(this.sessionId)}`, {
          method: 'GET',
          cache: 'no-store'
        });
        if (res.ok) {
          const json = await res.json();
          if (json.session) {
            this._emitChange(json.session);
            this._broadcastLocal(json.session);
          }
        }
      } catch (e) {
        // En cas d'échec réseau, broadcast local
        this._broadcastLocal({ id: this.sessionId, state: 'scanning', version: this.currentVersion + 1 });
      }
    }

    async notifyReveal(secret = 'SUFFOCATION') {
      const mock = {
        id: this.sessionId,
        state: 'revealed',
        secret: secret,
        version: this.currentVersion + 1,
        mobile_connected: true
      };

      this._emitChange(mock);
      this._broadcastLocal(mock);

      if (!this.isStandalone) {
        try {
          await fetch(`${this.apiEndpoint}?action=reveal&session=${encodeURIComponent(this.sessionId)}`, {
            method: 'GET',
            cache: 'no-store'
          });
        } catch (e) {}
      }
    }

    async resetSession() {
      const mock = {
        id: this.sessionId,
        state: 'standby',
        mobile_connected: false,
        version: this.currentVersion + 1
      };
      this._emitChange(mock);
      this._broadcastLocal(mock);

      if (!this.isStandalone) {
        try {
          await fetch(`${this.apiEndpoint}?action=reset&session=${encodeURIComponent(this.sessionId)}`, {
            method: 'GET',
            cache: 'no-store'
          });
        } catch (e) {}
      }
    }

    async rescanSession() {
      const mock = {
        id: this.sessionId,
        state: 'connected',
        mobile_connected: true,
        version: this.currentVersion + 1,
        secret: 'SUFFOCATION'
      };
      this._emitChange(mock);
      this._broadcastLocal(mock);

      if (!this.isStandalone && this.sessionId) {
        try {
          await fetch(`${this.apiEndpoint}?action=rescan&session=${encodeURIComponent(this.sessionId)}`, {
            method: 'GET',
            cache: 'no-store'
          });
        } catch (e) {}
      }
    }

    _handleRemoteUpdate(session) {
      if (!session) return;
      if (session.version > this.currentVersion || session.state !== this.currentState) {
        this._emitChange(session);
      }
    }

    startPolling() {
      if (this.pollingTimer) clearInterval(this.pollingTimer);

      this.pollingTimer = setInterval(async () => {
        if (!this.sessionId || this.isStandalone) return;

        try {
          const res = await fetch(`${this.apiEndpoint}?action=poll&session=${encodeURIComponent(this.sessionId)}&v=${this.currentVersion}`, {
            method: 'GET',
            cache: 'no-store'
          });

          if (res.ok) {
            const json = await res.json();
            if (json.status === 'success' && json.session) {
              if (json.changed || json.session.version !== this.currentVersion) {
                this._emitChange(json.session);
                this._broadcastLocal(json.session);
              }
            }
          }
        } catch (err) {
          // Si le serveur est injoignable, on continue silencieusement sans polluer la console
        }
      }, this.pollIntervalMs);
    }

    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer);
        this.pollingTimer = null;
      }
    }
  }

  global.ARGSyncClient = ARGSyncClient;
})(typeof window !== 'undefined' ? window : this);
