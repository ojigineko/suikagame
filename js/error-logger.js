/**
 * エラーログをファイルに書き込むためのスクリプト
 * ブラウザ環境ではファイルシステムに直接アクセスできないため、
 * このスクリプトはローカルストレージに保存されたエラーログを
 * 表示し、ダウンロードする機能を提供します。
 */

// DOMが読み込まれた後に実行
document.addEventListener('DOMContentLoaded', () => {
    // エラーログダウンロードボタンを作成
    const logContainer = document.getElementById('log-container');
    if (logContainer) {
        const downloadButton = document.createElement('button');
        downloadButton.textContent = 'エラーログをダウンロード';
        downloadButton.className = 'error-log-download';
        downloadButton.style.marginTop = '10px';
        downloadButton.style.padding = '5px 10px';
        downloadButton.style.backgroundColor = '#ff6b6b';
        downloadButton.style.color = 'white';
        downloadButton.style.border = 'none';
        downloadButton.style.borderRadius = '4px';
        downloadButton.style.cursor = 'pointer';
        
        downloadButton.addEventListener('click', downloadErrorLogs);
        
        logContainer.appendChild(downloadButton);
    }
});

/**
 * エラーログをダウンロードする
 */
function downloadErrorLogs() {
    try {
        // ローカルストレージからエラーログを取得
        const errorLogs = JSON.parse(localStorage.getItem('game_error_logs') || '[]');
        
        if (errorLogs.length === 0) {
            alert('エラーログはありません。');
            return;
        }
        
        // Markdownフォーマットでログを作成
        let mdContent = '# スイカゲーム エラーログ\n\n';
        mdContent += '## エラーログ一覧\n\n';
        
        errorLogs.forEach(log => {
            mdContent += `### ${new Date(log.date).toLocaleString()}\n`;
            mdContent += `- レベル: ${log.level}\n`;
            mdContent += `- メッセージ: ${log.message}\n\n`;
        });
        
        // Blobを作成してダウンロード
        const blob = new Blob([mdContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `suika-game-error-log-${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('エラーログをダウンロードしました。');
    } catch (e) {
        console.error('エラーログのダウンロードに失敗しました:', e);
        alert('エラーログのダウンロードに失敗しました: ' + e.message);
    }
}

/**
 * ウィンドウが閉じられる前にエラーログをローカルストレージから
 * コンソールに出力する（デバッグ用）
 */
window.addEventListener('beforeunload', () => {
    try {
        const errorLogs = JSON.parse(localStorage.getItem('game_error_logs') || '[]');
        if (errorLogs.length > 0) {
            console.log('保存されているエラーログ:', errorLogs);
        }
    } catch (e) {
        console.error('エラーログの読み込みに失敗しました:', e);
    }
}); 