/**
 * ゲームログを管理するクラス
 */
class GameLogger {
    constructor(logElementId = 'game-log', maxEntries = 50) {
        this.logElement = document.getElementById(logElementId);
        this.maxEntries = maxEntries;
        this.entries = [];
        
        // ローカルストレージからログを復元
        this.loadFromStorage();
        
        // ウィンドウが閉じられる前にログを保存
        window.addEventListener('beforeunload', () => {
            this.saveToStorage();
        });
        
        // 強制終了検知のためのハートビート
        this.lastHeartbeat = Date.now();
        this.heartbeatInterval = setInterval(() => {
            this.lastHeartbeat = Date.now();
            localStorage.setItem('game_heartbeat', this.lastHeartbeat.toString());
        }, 1000);
        
        // 前回の強制終了をチェック
        this.checkForcedClose();
    }
    
    /**
     * 前回の強制終了をチェックする
     */
    checkForcedClose() {
        const lastHeartbeat = localStorage.getItem('game_heartbeat');
        if (lastHeartbeat) {
            const now = Date.now();
            const lastBeat = parseInt(lastHeartbeat, 10);
            
            // 最後のハートビートから5秒以上経過していれば強制終了とみなす
            if (now - lastBeat > 5000) {
                this.error('前回のゲームセッションは正常に終了しませんでした。');
            }
        }
    }
    
    /**
     * 情報ログを記録
     * @param {string} message - ログメッセージ
     */
    info(message) {
        this.log(message, 'info');
    }
    
    /**
     * 警告ログを記録
     * @param {string} message - ログメッセージ
     */
    warning(message) {
        this.log(message, 'warning');
    }
    
    /**
     * エラーログを記録
     * @param {string} message - ログメッセージ
     */
    error(message) {
        this.log(message, 'error');
    }
    
    /**
     * ログを記録
     * @param {string} message - ログメッセージ
     * @param {string} level - ログレベル (info, warning, error)
     */
    log(message, level = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const entry = {
            timestamp,
            message,
            level
        };
        
        this.entries.unshift(entry);
        
        // 最大エントリー数を超えた場合、古いものを削除
        if (this.entries.length > this.maxEntries) {
            this.entries.pop();
        }
        
        this.render();
        
        // エラーログはファイルにも記録
        if (level === 'error') {
            this.writeToErrorLog(entry);
        }
    }
    
    /**
     * エラーログをファイルに記録（実際にはローカルストレージに保存）
     * @param {Object} entry - ログエントリ
     */
    writeToErrorLog(entry) {
        const errorLogs = JSON.parse(localStorage.getItem('game_error_logs') || '[]');
        errorLogs.push({
            ...entry,
            date: new Date().toISOString()
        });
        localStorage.setItem('game_error_logs', JSON.stringify(errorLogs));
    }
    
    /**
     * ログをローカルストレージに保存
     */
    saveToStorage() {
        localStorage.setItem('game_logs', JSON.stringify(this.entries));
    }
    
    /**
     * ログをローカルストレージから読み込み
     */
    loadFromStorage() {
        const savedLogs = localStorage.getItem('game_logs');
        if (savedLogs) {
            try {
                this.entries = JSON.parse(savedLogs);
                this.render();
            } catch (e) {
                console.error('ログの読み込みに失敗しました:', e);
                localStorage.removeItem('game_logs');
            }
        }
    }
    
    /**
     * ログをDOMに描画
     */
    render() {
        if (!this.logElement) return;
        
        this.logElement.innerHTML = '';
        
        this.entries.forEach(entry => {
            const logEntry = document.createElement('div');
            logEntry.className = `log-entry log-${entry.level}`;
            logEntry.textContent = `[${entry.timestamp}] ${entry.message}`;
            this.logElement.appendChild(logEntry);
        });
    }
    
    /**
     * ログをクリア
     */
    clear() {
        this.entries = [];
        this.render();
        localStorage.removeItem('game_logs');
    }
}

// グローバルロガーインスタンスを作成
const gameLogger = new GameLogger(); 