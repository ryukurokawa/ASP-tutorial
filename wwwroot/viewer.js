/// import * as Autodesk from "@types/forge-viewer";

async function getAccessToken(callback) {
    try {
        const resp = await fetch('/api/auth/token');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const { access_token, expires_in } = await resp.json();
        callback(access_token, expires_in);
    } catch (err) {
        alert('Could not obtain access token. See the console for more details.');
        console.error(err);
    }
}

export function initViewer(container) {
    return new Promise(function (resolve, reject) {
        Autodesk.Viewing.Initializer({ env: 'AutodeskProduction', getAccessToken }, function () {
            const config = { extensions: ['Autodesk.DocumentBrowser'] };
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
            viewer.start();
            viewer.setTheme('light-theme');

            // ✅ Viewer初期化イベントでTHREEを確保
            viewer.addEventListener(Autodesk.Viewing.VIEWER_INITIALIZED, () => {
                window._FORGE_THREE =
                    Autodesk.Viewing?.Private?.THREE ||
                    viewer.impl?.canvas?.ownerDocument.defaultView.THREE ||
                    window.THREE;
                console.log("✅ THREE.js initialized:", window._FORGE_THREE);
            });

            resolve(viewer);
        });
    });
}

export function loadModel(viewer, urn) {
    return new Promise(function (resolve, reject) {
        function onDocumentLoadSuccess(doc) {
            viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry())
                .then(function (result) {
                    resolve(result);

                    viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, () => {
                        setTimeout(() => {
                            const THREE =
                                Autodesk.Viewing?.Private?.THREE ||
                                viewer.impl?.canvas?.ownerDocument.defaultView.THREE ||
                                window.THREE;
                    
                            if (!THREE) {
                                console.error("❌ THREE.js not available");
                                return;
                            }
                    
                            console.log("✅ THREE.js detected:", THREE.REVISION);
                    
                            const overlayName = 'custom-scene';
                            if (!viewer.overlays.hasScene(overlayName)) {
                                viewer.overlays.addScene(overlayName);
                            }
                    
                            // === モデル範囲を取得 ===
                            const bounds = viewer.model.getBoundingBox();
                            const center = bounds.center();
                            const modelHeight = bounds.max.y - bounds.min.y;
                    
                            // === 立方体（上面だけ市松模様） ===
                            const cubeSize = modelHeight * 0.1;
                            // ▼ Canvasで市松模様を生成（Forge Viewer互換）
                            const canvas = document.createElement('canvas');
canvas.width = 128;
canvas.height = 128;
const ctx = canvas.getContext('2d');
const block = 16; // 市松模様のマス目サイズ

for (let y = 0; y < canvas.height / block; y++) {
  for (let x = 0; x < canvas.width / block; x++) {
    ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#000000';
    ctx.fillRect(x * block, y * block, block, block);
  }
}

// TextureとしてTHREEに渡す
const checkerTexture = new THREE.Texture(canvas);
checkerTexture.needsUpdate = true;

// === 各面マテリアル ===
const materials = [
  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // +X
  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // -X
  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // +Y
  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // -Y
  new THREE.MeshBasicMaterial({ map: checkerTexture }), // +Z ← 上面を市松模様に！
  new THREE.MeshBasicMaterial({ color: 0xff0000 })  // -Z
];
                            // === Forge Viewer r71対応（MeshFaceMaterialを維持） ===
                            const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
                            const cube = new THREE.Mesh(cubeGeometry, new THREE.MeshFaceMaterial(materials));
                            // === モデルの上に配置（既存位置のまま） ===
                            cube.position.set(center.x, bounds.max.y + modelHeight * 0.2, center.z);
                            // モデル中心の少し上に配置
                            cube.position.set(center.x, bounds.max.y + modelHeight * 0.2, center.z);
                    
                            // === 球体 ===
                            const sphereGeometry = new THREE.SphereGeometry(modelHeight * 0.05, 32, 32);
                            const sphereMaterial = new THREE.MeshPhongMaterial({
                                color: 0x00ff00,
                                transparent: true,
                                opacity: 0.7,
                                side: THREE.DoubleSide
                            });
                            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                            sphere.position.set(center.x + modelHeight * 0.3, bounds.max.y + modelHeight * 0.2, center.z);
                    
                            // === オーバーレイに追加 ===
                            viewer.overlays.addMesh(cube, overlayName);
                            viewer.overlays.addMesh(sphere, overlayName);
                    
                            // === 再描画 ===
                            viewer.impl.invalidate(true, true, true);
                    
                            console.log("✅ 立方体（上面青）と球体を追加しました");
                        }, 800);
                    });
                    
                    
                })
                .catch(reject);
        }

        function onDocumentLoadFailure(code, message, errors) {
            reject({ code, message, errors });
        }

        viewer.setLightPreset(0);

        const safeUrn = urn.startsWith('urn:') ? urn : 'urn:' + urn;
        Autodesk.Viewing.Document.load(safeUrn, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
}
