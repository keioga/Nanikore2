// 1. 世界最新のWeb用AIライブラリを直接読み込む（APIキー一切不要）
import { pipeline } from 'https://esm.sh';

const video = document.getElementById('video');
const statusDiv = document.getElementById('status');
let classifier;
let isProcessing = false;

// 2. カメラの起動（iPhoneの再生バグ対策を徹底強化）
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        video.srcObject = stream;
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                video.play().then(() => resolve(video)).catch(e => {
                    statusDiv.innerText = "再生エラー: " + e.message;
                });
            };
        });
    } catch (e) {
        statusDiv.innerText = "カメラの起動に失敗: 権限を確認してください。";
        console.error(e);
    }
}

// 3. AIモデルの読み込み
async function initAI() {
    statusDiv.innerText = "AIモデルをダウンロード中...\n（初回のみ20MBほどの通信が発生します）";
    await setupCamera();
    
    try {
        // Google製の超軽量・高精度な次世代モデル「MobileViT」を読み込む
        classifier = await pipeline('image-classification', 'Xenova/mobilevit-small');
        statusDiv.innerText = "準備完了！カメラに物を映してください。";
        
        // 認識ループを開始（0.5秒に1回解析して負荷を抑える）
        setInterval(predictFrame, 500);
    } catch (e) {
        statusDiv.innerText = "AIの読み込みに失敗しました: " + e.message;
        console.error(e);
    }
}

// 4. リアルタイム認識ループ
async function predictFrame() {
    // 映像データがあり、かつ前回の解析が終わっていれば実行
    if (video.readyState >= 2 && !isProcessing && classifier) {
        isProcessing = true;
        try {
            // 1. ビデオの今の1コマをCanvasに「パシャッ」と隠れて撮影
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // 2. Canvasから画像データ（DataURL）を取得して、そのままAIに丸投げ
            const dataUrl = canvas.toDataURL('image/jpeg');
            const output = await classifier(dataUrl, { topk: 1 });
            
            // 3. 結果を画面に表示
            if (output && output.length > 0) {
                const topResult = output[0];
                const name = topResult.label; // 認識された英単語
                const score = Math.round(topResult.score * 100); // 確率(%)
                
                statusDiv.innerHTML = `
                    認識結果:<br>
                    <span style="font-size: 1.8rem; font-weight: bold; color: #00df89;">${name}</span> (${score}%)
                `;
            }
        } catch (err) {
            console.error("解析エラー:", err);
        } finally {
            isProcessing = false;
        }
    }
}

// アプリ起動時に実行
window.addEventListener('load', initAI);