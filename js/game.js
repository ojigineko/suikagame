/**
 * スイカゲーム - メインゲームロジック
 */
class SuikaGame {
    constructor(canvasId = 'gameCanvas') {
        // キャンバスの設定
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // 画像の読み込み
        this.fruitImages = [];
        this.imagesLoaded = false;
        
        // フルーツの種類定義
        this.fruitTypes = [
            { name: "子犬", radius: 20, color: "#FF0000", points: 1, image: "cool-dog.png" },
            { name: "小型犬", radius: 30, color: "#FF3366", points: 2, image: "cool-dog.png" },
            { name: "中型犬", radius: 40, color: "#9400D3", points: 3, image: "cool-dog.png" },
            { name: "大型犬", radius: 50, color: "#FFA500", points: 4, image: "cool-dog.png" },
            { name: "特大犬", radius: 60, color: "#FF8C00", points: 5, image: "cool-dog.png" },
            { name: "超大型犬", radius: 70, color: "#00AA00", points: 6, image: "cool-dog.png" },
            { name: "巨大犬", radius: 80, color: "#ADFF2F", points: 7, image: "cool-dog.png" },
            { name: "超巨大犬", radius: 90, color: "#FFC0CB", points: 8, image: "cool-dog.png" },
            { name: "伝説の犬", radius: 100, color: "#FFD700", points: 9, image: "cool-dog.png" },
            { name: "神話の犬", radius: 110, color: "#32CD32", points: 10, image: "cool-dog.png" },
            { name: "犬の王", radius: 120, color: "#008000", points: 11, image: "cool-dog.png" }
        ];
        
        // ゲーム変数
        this.fruits = [];
        this.nextFruit = null;
        this.nextFruitX = this.canvas.width / 2;
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('suika_high_score') || '0', 10);
        this.gameOver = false;
        this.mergeEffects = [];
        this.lastFrameTime = 0;
        this.isPaused = false;
        
        // 物理変数
        this.gravity = 0.2;
        this.friction = 0.5;
        this.containerWidth = this.canvas.width;
        this.containerHeight = this.canvas.height;
        this.containerLeft = 0;
        this.containerRight = this.containerWidth;
        this.containerBottom = this.containerHeight;
        this.dropZoneHeight = 100;
        
        // 画像の読み込み
        this.loadImages();
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // ゲーム状態の復元を試みる
        this.tryRestoreGameState();
        
        // ゲームの初期化
        this.init();
        
        // ゲームループの開始
        this.lastFrameTime = performance.now();
        requestAnimationFrame(this.gameLoop.bind(this));
        
        // ログ記録
        gameLogger.info('ゲームが開始されました');
    }
    
    /**
     * フルーツ画像を読み込む
     */
    loadImages() {
        const dogImage = new Image();
        dogImage.onload = () => {
            this.imagesLoaded = true;
            gameLogger.info('犬の画像が読み込まれました');
            
            // すべてのフルーツタイプに同じ画像を使用
            for (let i = 0; i < this.fruitTypes.length; i++) {
                this.fruitImages[i] = dogImage;
            }
        };
        dogImage.onerror = () => {
            gameLogger.error('犬の画像の読み込みに失敗しました');
            this.imagesLoaded = false;
        };
        // 画像のパスを修正 - 相対パスを使用
        dogImage.src = './images/cool-dog.png';
        
        // バックアップとして、画像が読み込めない場合のフォールバック処理
        setTimeout(() => {
            if (!this.imagesLoaded) {
                gameLogger.warning('画像の読み込みがタイムアウトしました。デフォルトの円を使用します。');
            }
        }, 3000);
    }
    
    /**
     * イベントリスナーの設定
     */
    setupEventListeners() {
        // マウス移動
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.gameOver || !this.nextFruit || this.isPaused) return;
            
            const rect = this.canvas.getBoundingClientRect();
            this.nextFruitX = e.clientX - rect.left;
            
            // 範囲内に収める
            this.nextFruitX = Math.max(
                this.nextFruit.radius, 
                Math.min(this.containerWidth - this.nextFruit.radius, this.nextFruitX)
            );
            
            // 次のフルーツの位置を更新
            this.nextFruit.x = this.nextFruitX;
        });
        
        // クリック
        this.canvas.addEventListener('click', (e) => {
            if (this.gameOver) {
                this.init(); // ゲームの再開始
                gameLogger.info('ゲームがリスタートされました');
            } else if (!this.isPaused) {
                this.dropFruit(); // 現在のフルーツを落とす
            }
        });
        
        // キーボード
        window.addEventListener('keydown', (e) => {
            if (e.key === 'p' || e.key === 'P') {
                this.togglePause();
            }
        });
        
        // ウィンドウがフォーカスを失ったときに一時停止
        window.addEventListener('blur', () => {
            if (!this.gameOver && !this.isPaused) {
                this.togglePause();
                gameLogger.info('ウィンドウがフォーカスを失ったため、ゲームが一時停止されました');
            }
        });
        
        // 定期的にゲーム状態を保存
        setInterval(() => {
            if (!this.gameOver && !this.isPaused) {
                this.saveGameState();
            }
        }, 5000);
    }
    
    /**
     * ゲームの初期化
     */
    init() {
        this.score = 0;
        this.fruits = [];
        this.gameOver = false;
        this.mergeEffects = [];
        this.isPaused = false;
        this.createNextFruit();
    }
    
    /**
     * 次のフルーツを作成
     */
    createNextFruit() {
        // 最初の3種類のフルーツからランダムに選択
        const fruitIndex = Math.floor(Math.random() * 3);
        this.nextFruit = {
            type: fruitIndex,
            x: this.nextFruitX,
            y: 50, // 上部に配置
            vx: 0,
            vy: 0,
            radius: this.fruitTypes[fruitIndex].radius,
            color: this.fruitTypes[fruitIndex].color
        };
        
        gameLogger.info(`次のフルーツ: ${this.fruitTypes[fruitIndex].name}`);
    }
    
    /**
     * 現在のフルーツを落とす
     */
    dropFruit() {
        if (this.gameOver || !this.nextFruit || this.isPaused) return;
        
        this.fruits.push({
            type: this.nextFruit.type,
            x: this.nextFruit.x,
            y: this.nextFruit.y,
            vx: 0,
            vy: 1, // 初期速度
            radius: this.nextFruit.radius,
            color: this.nextFruit.color
        });
        
        gameLogger.info(`${this.fruitTypes[this.nextFruit.type].name}を落としました`);
        this.createNextFruit();
    }
    
    /**
     * ゲームの一時停止/再開
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            gameLogger.info('ゲームが一時停止されました');
        } else {
            gameLogger.info('ゲームが再開されました');
            this.lastFrameTime = performance.now();
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
    
    /**
     * ゲーム状態の更新
     * @param {number} deltaTime - 前回のフレームからの経過時間（ミリ秒）
     */
    update(deltaTime) {
        // マージエフェクトの更新
        this.mergeEffects = this.mergeEffects.filter(effect => {
            effect.radius += 2;
            effect.alpha -= 0.05;
            return effect.alpha > 0;
        });
        
        // フルーツの移動
        for (let i = 0; i < this.fruits.length; i++) {
            const fruit = this.fruits[i];
            
            // 重力の適用
            fruit.vy += this.gravity;
            
            // 速度の適用
            fruit.x += fruit.vx;
            fruit.y += fruit.vy;
            
            // 壁との衝突チェック
            if (fruit.x - fruit.radius < this.containerLeft) {
                fruit.x = fruit.radius;
                fruit.vx *= -this.friction;
            } else if (fruit.x + fruit.radius > this.containerRight) {
                fruit.x = this.containerRight - fruit.radius;
                fruit.vx *= -this.friction;
            }
            
            // 底面との衝突チェック
            if (fruit.y + fruit.radius > this.containerBottom) {
                fruit.y = this.containerBottom - fruit.radius;
                fruit.vy *= -this.friction;
                fruit.vx *= this.friction;
            }
        }
        
        // フルーツ同士の衝突とマージのチェック
        for (let i = 0; i < this.fruits.length; i++) {
            for (let j = i + 1; j < this.fruits.length; j++) {
                const fruitA = this.fruits[i];
                const fruitB = this.fruits[j];
                
                if (fruitA.toRemove || fruitB.toRemove) continue;
                
                const dx = fruitB.x - fruitA.x;
                const dy = fruitB.y - fruitA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = fruitA.radius + fruitB.radius;
                
                if (distance < minDistance) {
                    // 衝突応答の計算
                    const angle = Math.atan2(dy, dx);
                    const overlap = minDistance - distance;
                    
                    // フルーツを離す
                    const moveX = Math.cos(angle) * overlap * 0.5;
                    const moveY = Math.sin(angle) * overlap * 0.5;
                    
                    if (!fruitA.toRemove && !fruitB.toRemove) {
                        fruitA.x -= moveX;
                        fruitA.y -= moveY;
                        fruitB.x += moveX;
                        fruitB.y += moveY;
                        
                        // バウンスの速度調整
                        const totalMass = fruitA.radius + fruitB.radius;
                        const force = 1;
                        
                        fruitA.vx -= (moveX * force * fruitB.radius) / totalMass;
                        fruitA.vy -= (moveY * force * fruitB.radius) / totalMass;
                        fruitB.vx += (moveX * force * fruitA.radius) / totalMass;
                        fruitB.vy += (moveY * force * fruitA.radius) / totalMass;
                    }
                    
                    // 同じ種類のフルーツをマージ
                    if (fruitA.type === fruitB.type && fruitA.type < this.fruitTypes.length - 1) {
                        // 新しい、より大きなフルーツを作成
                        const newType = fruitA.type + 1;
                        const newX = (fruitA.x + fruitB.x) / 2;
                        const newY = (fruitA.y + fruitB.y) / 2;
                        
                        this.fruits.push({
                            type: newType,
                            x: newX,
                            y: newY,
                            vx: (fruitA.vx + fruitB.vx) / 2,
                            vy: (fruitA.vy + fruitB.vy) / 2,
                            radius: this.fruitTypes[newType].radius,
                            color: this.fruitTypes[newType].color
                        });
                        
                        // マージエフェクトの追加
                        this.mergeEffects.push({
                            x: newX,
                            y: newY,
                            radius: this.fruitTypes[newType].radius,
                            color: this.fruitTypes[newType].color,
                            alpha: 1
                        });
                        
                        // スコアにポイントを追加
                        this.score += this.fruitTypes[newType].points;
                        
                        // 削除対象としてマーク
                        fruitA.toRemove = true;
                        fruitB.toRemove = true;
                        
                        gameLogger.info(`${this.fruitTypes[fruitA.type].name}同士がマージして${this.fruitTypes[newType].name}になりました！`);
                        
                        // 最大のフルーツ（スイカ）ができたらログに記録
                        if (newType === this.fruitTypes.length - 1) {
                            gameLogger.info('おめでとうございます！スイカができました！', 'success');
                        }
                    }
                }
            }
        }
        
        // マージされたフルーツを削除
        this.fruits = this.fruits.filter(fruit => !fruit.toRemove);
        
        // ゲームオーバーのチェック（フルーツが高すぎる場合）
        const gameOverThreshold = this.dropZoneHeight;
        for (const fruit of this.fruits) {
            // 安定している（まだ落下中ではない）フルーツのみを考慮
            if (fruit.y - fruit.radius < gameOverThreshold && Math.abs(fruit.vy) < 0.2) {
                if (!this.gameOver) {
                    this.gameOver = true;
                    
                    // ハイスコアの更新
                    if (this.score > this.highScore) {
                        this.highScore = this.score;
                        localStorage.setItem('suika_high_score', this.highScore.toString());
                        gameLogger.info(`新しいハイスコア: ${this.highScore}点！`);
                    }
                    
                    gameLogger.warning('ゲームオーバー！');
                }
                break;
            }
        }
    }
    
    /**
     * ゲームの描画
     */
    draw() {
        // キャンバスのクリア
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // コンテナの描画
        this.ctx.fillStyle = "#FFF8E1"; // 薄いクリーム色の背景
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // ドロップゾーンの区切り線
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.dropZoneHeight);
        this.ctx.lineTo(this.canvas.width, this.dropZoneHeight);
        this.ctx.strokeStyle = "#FF6B6B";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // 警告テキスト
        this.ctx.fillStyle = "#FF6B6B";
        this.ctx.font = "14px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText("危険ゾーン - フルーツがこの線より上に積み上がるとゲームオーバー", this.canvas.width / 2, this.dropZoneHeight - 10);
        
        // マージエフェクトの描画
        for (const effect of this.mergeEffects) {
            this.ctx.beginPath();
            this.ctx.arc(effect.x, effect.y, effect.radius + 10, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${effect.alpha})`;
            this.ctx.fill();
            
            this.ctx.beginPath();
            this.ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = `rgba(255, 255, 255, ${effect.alpha})`;
            this.ctx.lineWidth = 4;
            this.ctx.stroke();
        }
        
        // フルーツの描画
        for (const fruit of this.fruits) {
            this.drawFruit(fruit);
        }
        
        // 次のフルーツの描画（影付き）
        if (this.nextFruit && !this.gameOver && !this.isPaused) {
            this.drawFruit(this.nextFruit);
            
            // 落下経路を示す点線
            this.ctx.beginPath();
            this.ctx.setLineDash([5, 5]);
            this.ctx.moveTo(this.nextFruit.x, this.nextFruit.y + this.nextFruit.radius);
            this.ctx.lineTo(this.nextFruit.x, this.containerHeight);
            this.ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        // スコアの描画
        this.ctx.fillStyle = "#333";
        this.ctx.font = "24px Arial";
        this.ctx.textAlign = "left";
        this.ctx.fillText(`スコア: ${this.score}`, 10, 30);
        
        // ハイスコアの描画
        this.ctx.textAlign = "right";
        this.ctx.fillText(`ハイスコア: ${this.highScore}`, this.canvas.width - 10, 30);
        
        // 一時停止の描画
        if (this.isPaused && !this.gameOver) {
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = "#FFF";
            this.ctx.font = "48px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText("一時停止中", this.canvas.width / 2, this.canvas.height / 2 - 50);
            this.ctx.font = "24px Arial";
            this.ctx.fillText("再開するには「P」キーを押すか、画面をクリックしてください", this.canvas.width / 2, this.canvas.height / 2 + 20);
        }
        
        // ゲームオーバーの描画
        if (this.gameOver) {
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = "#FFF";
            this.ctx.font = "48px Arial";
            this.ctx.textAlign = "center";
            this.ctx.fillText("ゲームオーバー", this.canvas.width / 2, this.canvas.height / 2 - 50);
            this.ctx.font = "24px Arial";
            this.ctx.fillText(`最終スコア: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillText("再開するにはクリックしてください", this.canvas.width / 2, this.canvas.height / 2 + 50);
        }
    }
    
    /**
     * フルーツを描画する
     * @param {Object} fruit - 描画するフルーツオブジェクト
     */
    drawFruit(fruit) {
        // 影の描画
        this.ctx.beginPath();
        this.ctx.arc(fruit.x + 3, fruit.y + 3, fruit.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
        this.ctx.fill();
        
        if (this.imagesLoaded && this.fruitImages[fruit.type]) {
            // 画像を使用してフルーツを描画
            const img = this.fruitImages[fruit.type];
            const size = fruit.radius * 2;
            this.ctx.drawImage(img, fruit.x - fruit.radius, fruit.y - fruit.radius, size, size);
        } else {
            // 画像が読み込まれていない場合は円を描画
            this.ctx.beginPath();
            this.ctx.arc(fruit.x, fruit.y, fruit.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = fruit.color;
            this.ctx.fill();
            this.ctx.strokeStyle = "#000";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // ハイライトの描画
            this.ctx.beginPath();
            this.ctx.arc(fruit.x - fruit.radius * 0.3, fruit.y - fruit.radius * 0.3, fruit.radius * 0.3, 0, Math.PI * 2);
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
            this.ctx.fill();
        }
        
        // フルーツ名の描画
        this.ctx.fillStyle = "#FFF";
        this.ctx.font = `${Math.max(12, fruit.radius / 3)}px Arial`;
        this.ctx.textAlign = "center";
        this.ctx.fillText(this.fruitTypes[fruit.type].name, fruit.x, fruit.y + 5);
    }
    
    /**
     * ゲームループ
     * @param {number} timestamp - 現在のタイムスタンプ
     */
    gameLoop(timestamp) {
        // 一時停止中は更新しない
        if (this.isPaused) {
            this.draw();
            return;
        }
        
        // デルタタイムの計算（前回のフレームからの経過時間）
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        
        if (!this.gameOver) {
            this.update(deltaTime);
        }
        
        this.draw();
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    /**
     * ゲーム状態の保存
     */
    saveGameState() {
        if (this.gameOver) return;
        
        const gameState = {
            fruits: this.fruits,
            score: this.score,
            nextFruit: this.nextFruit,
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('suika_game_state', JSON.stringify(gameState));
        } catch (e) {
            gameLogger.error('ゲーム状態の保存に失敗しました: ' + e.message);
        }
    }
    
    /**
     * ゲーム状態の復元を試みる
     */
    tryRestoreGameState() {
        const savedState = localStorage.getItem('suika_game_state');
        if (!savedState) return;
        
        try {
            const gameState = JSON.parse(savedState);
            
            // 保存から5分以上経過している場合は復元しない
            if (Date.now() - gameState.timestamp > 5 * 60 * 1000) {
                localStorage.removeItem('suika_game_state');
                return;
            }
            
            this.fruits = gameState.fruits;
            this.score = gameState.score;
            this.nextFruit = gameState.nextFruit;
            
            gameLogger.info('前回のゲーム状態が復元されました');
        } catch (e) {
            gameLogger.error('ゲーム状態の復元に失敗しました: ' + e.message);
            localStorage.removeItem('suika_game_state');
        }
    }
}

// ページ読み込み完了時にゲームを初期化
window.addEventListener('load', () => {
    const game = new SuikaGame();
}); 