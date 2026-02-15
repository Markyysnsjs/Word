class VirusPortal {
    constructor() {
        this.isAdmin = false;
        this.currentSort = 'date';
        this.init();
    }

    init() {
        this.updateTime();
        this.bindEvents();
        this.loadGames();
        setInterval(() => this.updateTime(), 1000);
    }

    updateTime() {
        document.getElementById('time').textContent = new Date().toLocaleTimeString();
    }

    bindEvents() {
        // Search
        document.getElementById('searchBtn').onclick = () => this.searchGames();
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchGames();
        });

        // Auth
        document.getElementById('loginBtn').onclick = () => this.showAuthModal('login');
        document.getElementById('registerBtn').onclick = () => this.showAuthModal('register');
        document.getElementById('logoutBtn').onclick = () => this.logout();
        document.getElementById('toggleAuth').onclick = () => this.toggleAuthMode();

        // Forms
        document.getElementById('authForm').onsubmit = (e) => {
            e.preventDefault();
            this.handleAuth();
        };
        document.getElementById('uploadForm').onsubmit = (e) => {
            e.preventDefault();
            this.uploadVirus();
        };

        // Admin
        document.getElementById('adminPanelBtn').onclick = () => {
            document.getElementById('adminConsole').style.display = 'block';
        };
        document.getElementById('closeAdmin').onclick = () => {
            document.getElementById('adminConsole').style.display = 'none';
        };

        // Sort
        document.querySelectorAll('.btn-sort').forEach(btn => {
            btn.onclick = () => this.sortGames(btn.dataset.sort);
        });

        // Modal close
        document.getElementById('modalClose').onclick = () => this.hideModal();
        document.getElementById('authModal').onclick = (e) => {
            if (e.target.id === 'authModal') this.hideModal();
        };
    }

    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(endpoint, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            this.showNotification('🌐 Connection lost...', 'error');
            console.error('API Error:', error);
        }
    }

    async loadGames(search = '', sort = 'date') {
        const grid = document.getElementById('gamesGrid');
        grid.innerHTML = `
            <div class="loading-virus">
                <div class="virus-spinner"></div>
                <span>Scanning virus database...</span>
            </div>
        `;

        const params = new URLSearchParams({ q: search });
        if (sort) params.append('sort', sort);
        
        const data = await this.apiCall(`/api/games?${params}`);
        
        if (!data || data.length === 0) {
            grid.innerHTML = `
                <div class="loading-virus" style="text-align: center;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">💀</div>
                    <span>No viruses found</span>
                </div>
            `;
            this.updateStats(0, 0);
            return;
        }

        grid.innerHTML = data.map(virus => `
            <div class="game-card" data-id="${virus.id}">
                ${virus.avatar ? `
                    <img src="/uploads/${virus.avatar}" alt="${this.escapeHtml(virus.title)}" 
                         class="game-avatar" onerror="this.style.display='none'">
                ` : '<div class="game-avatar" style="background: rgba(255,0,64,0.2); display: flex; align-items: center; justify-content: center; font-size: 3rem;">🎮</div>'}
                
                <div class="game-title">${this.escapeHtml(virus.title)}</div>
                <div class="game-desc">${this.escapeHtml(virus.desc).substring(0, 180)}${virus.desc.length > 180 ? '...' : ''}</div>
                
                <div class="download-section">
                    <div class="download-count">
                        📥 ${virus.downloads.toLocaleString()} infections
                    </div>
                    <a href="/download/${virus.id}" class="download-btn" download>
                        <span>DEPLOY VIRUS</span>
                    </a>
                </div>
            </div>
        `).join('');

        this.updateStats(data.length, data.reduce((sum, v) => sum + v.downloads, 0));
    }

    updateStats(count, downloads) {
        document.getElementById('gamesCount').textContent = count.toLocaleString();
        document.getElementById('totalDownloads').textContent = downloads.toLocaleString();
    }

    async handleAuth() {
        const isLogin = document.getElementById('modalTitle').textContent.includes('INFILTRATION');
        const username = document.getElementById('authUsername').value.trim();
        const password = document.getElementById('authPassword').value;

        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const result = await this.apiCall(endpoint, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (result?.success) {
            if (isLogin) {
                this.setSession(result.username, result.is_admin);
                this.hideModal();
                this.showNotification(`✅ Welcome back, ${result.username}!`);
            } else {
                this.showNotification('✅ Registration complete. Login now.');
                this.showAuthModal('login');
            }
        } else {
            this.showNotification(`❌ ${result?.error || 'Auth failed'}`, 'error');
        }
    }

    setSession(username, isAdmin) {
        this.isAdmin = isAdmin;
        document.getElementById('userPanel').style.display = 'none';
        document.getElementById('sessionInfo').style.display = 'flex';
        document.getElementById('userName').textContent = username;
        document.getElementById('userRole').textContent = isAdmin ? 'ADMIN' : 'USER';

        if (isAdmin) {
            document.getElementById('adminPanelBtn').style.display = 'inline-block';
        }
    }

    async logout() {
        await this.apiCall('/api/auth/logout');
        document.getElementById('userPanel').style.display = 'flex';
        document.getElementById('sessionInfo').style.display = 'none';
        document.getElementById('adminConsole').style.display = 'none';
        this.showNotification('💀 Session terminated');
        this.loadGames();
    }

    async uploadVirus() {
        const formData = new FormData();
        formData.append('title', document.getElementById('virusName').value);
        formData.append('description', document.getElementById('virusDesc').value);
        formData.append('avatar', document.getElementById('virusIcon').files[0] || '');
        formData.append('game_file', document.getElementById('virusFile').files[0]);

        const result = await fetch('/api/admin/upload', {
            method: 'POST',
            body: formData
        }).then(r => r.json());

        if (result.success) {
            this.showNotification('✅ Virus deployed successfully!');
            document.getElementById('uploadForm').reset();
            document.getElementById('adminConsole').style.display = 'none';
            this.loadGames();
        } else {
            this.showNotification(`❌ ${result.error}`, 'error');
        }
    }

    searchGames() {
        const query = document.getElementById('searchInput').value.trim();
        document.getElementById('pageTitle').textContent = query ? `🔍 "${query}"` : '🎮 VIRUS ARCHIVE';
        this.loadGames(query, this.currentSort);
    }

    sortGames(sort) {
        this.currentSort = sort;
        document.querySelectorAll('.btn-sort').forEach(b => b.style.background = 'rgba(255,255,255,0.1)');
        event.target.style.background = 'rgba(255,0,64,0.3)';
        this.loadGames(document.getElementById('searchInput').value, sort);
    }

    showAuthModal(mode) {
        const modal = document.getElementById('authModal');
        const title = document.getElementById('modalTitle');
        const submit = document.getElementById('authSubmit');
        const toggle = document.getElementById('toggleAuth');

        title.textContent = mode === 'login' ? '🔐 SYSTEM INFILTRATION' : '🧬 CREATE VIRUS ACCOUNT';
        submit.textContent = mode === 'login' ? 'INFILTRATE' : 'MUTATE';
        toggle.textContent = mode === 'login' ? 'CREATE ACCOUNT' : 'I HAVE ACCESS';

        document.getElementById('authUsername').value = '';
        document.getElementById('authPassword').value = '';
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    toggleAuthMode() {
        const isLogin = document.getElementById('modalTitle').textContent.includes('INFILTRATION');
        this.showAuthModal(isLogin ? 'register' : 'login');
    }

    hideModal() {
        document.getElementById('authModal').style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    showNotification(message, type = 'success') {
        const notifications = document.getElementById('notifications');
        const notif = document.createElement('div');
        notif.className = `notification ${type}`;
        notif.innerHTML = `
            <span>${message}</span>
            <div class="notif-progress"></div>
        `;
        notifications.appendChild(notif);

        setTimeout(() => {
            notif.remove();
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize virus portal
document.addEventListener('DOMContentLoaded', () => {
    new VirusPortal();
});
