import { pipeline } from 'https://esm.sh';

const video = document.getElementById('video');
const statusDiv = document.getElementById('status');
const startBtn = document.getElementById('start-btn');
let classifier;
let isProcessing = false;

// 1. カメラの起動
async function setupCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        video.srcObject = stream;
        
        // iPhone向けにインライン再生を徹底
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        
        return new Promise((resolve, reject) => {
            video.onloadedmetadata = () => {
                video.play()
                    .then(() => {
                        video.style.display = "block"; // 再生できたらビデオを表示
                        resolve(video);
                    })
                    .catch(e => reject(new Error("ビデオ再生に失敗しました: " + e.message)));
            };
            video.onerror = (e) => reject(new Error("ビデオストリームエラー"));
        });
    } catch (e) {
        throw new Error("カメラへのアクセスが拒否されたか、カメラが見つかりません。");
    }
}

// 2. ユーザーがボタンを押した時の初期化処理
async function startApp() {
    startBtn.style.display = "none"; // ボタンを隠す
    statusDiv.innerText = "カメラを起動中...";
    
    try {
        // 先にカメラを起動（ユーザーアクションの直後なのでiPhoneでも100%動く）
        await setupCamera();
        
        statusDiv.innerText = "AIモデルをダウンロード中...\n（初回のみ20MBほどの通信が発生します。3〜5秒ほどお待ちください）";
        
        // Google製の超軽量・高精度AI「MobileViT」を読み込む
        classifier = await pipeline('image-classification', 'Xenova/mobilevit-small');
        
        statusDiv.innerText = "準備完了！カメラに物を映してください。";
        
        // 認識ループを開始（0.5秒に1回解析）
        setInterval(predictFrame, 500);
    } catch (e) {
        statusDiv.innerHTML = `<span style="color:#ff4a4a; font-weight:bold;">【エラー】${e.message}</span>`;
        startBtn.style.display = "inline-block"; // 失敗したらボタンを再表示
        console.error(e);
    }
}

// 3. リアルタイム認識ループ
async function predictFrame() {
    if (video.readyState >= 2 && !isProcessing && classifier) {
        isProcessing = true;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
            const output = await classifier(dataUrl, { topk: 1 });
            
            if (output && output.length > 0) {
                const topResult = output[0]; // [0]を追加して正しく1番目の結果を取得
                const name = topResult.label; 
                const score = Math.round(topResult.score * 100); 
                
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

// ボタンを押したときにすべてを開始する
startBtn.addEventListener('click', startApp);