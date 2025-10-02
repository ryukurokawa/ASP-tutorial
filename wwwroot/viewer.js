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
            const config = {
                extensions: ['Autodesk.DocumentBrowser']
            };
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
            viewer.start();
            viewer.setTheme('light-theme');
            resolve(viewer);
        });
    });
}

export function loadModel(viewer, urn) {
    return new Promise(function (resolve, reject) {
        function onDocumentLoadSuccess(doc) {
            // まずモデルを読み込む
            viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry())
                .then(function (result) {
                    resolve(result);  // モデルのロードが完了したらresolve

                    // モデルが読み込まれた後にジオメトリを追加
                    viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, function () {
                        try {
                            // THREE.jsのインスタンスを取得
                            if (!viewer.impl || !viewer.impl.renderer) {
                                throw new Error('Viewer implementation not ready');
                            }

                            const THREE = window.THREE;
                            if (!THREE) {
                                throw new Error('THREE.js not available');
                            }

                            // モデルのバウンディングボックスを取得
                            const bounds = viewer.model.getBoundingBox();
                            const modelHeight = bounds.max.y - bounds.min.y;

                            // オーバーレイシーンを作成
                            const overlayName = 'custom-scene';
                            viewer.impl.createOverlayScene(overlayName);

                            // 立方体を作成
                            const cubeGeometry = new THREE.BoxGeometry(10, 10, 10);
                            cubeGeometry.faces.forEach((face) => {
                                if (face.normal.z > 0.9) {
                                    face.color.setHex(0x0000ff);
                                } else {
                                    face.color.setHex(0xff0000);
                                }
                            });
                        
                            const cubeMaterial = new THREE.MeshPhongMaterial({
                                vertexColors: THREE.FaceColors,
                                transparent: true,
                                opacity: 0.85,
                                side: THREE.DoubleSide
                            });
                        
                            const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
                            cube.position.set(30, 20, 20);
                            // 球体を作成
                            const sphereGeometry = new THREE.SphereGeometry(modelHeight * 0.05, 32, 32);
                            const sphereMaterial = new THREE.MeshPhongMaterial({
                                color: 0x0000ff,
                                transparent: true,
                                opacity: 0.7,
                                side: THREE.DoubleSide
                            });
                            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                            sphere.position.set(bounds.min.x, bounds.max.y + modelHeight * 0.2, bounds.min.z);

                            // ジオメトリをシーンに追加
                            viewer.impl.addOverlay(overlayName, cube);
                            viewer.impl.addOverlay(overlayName, sphere);

                            // シーンを更新
                            viewer.impl.invalidate(true, true, true);

                            console.log("✅ 立方体と球を追加しました");
                        } catch (error) {
                            console.error('Error adding geometries:', error);
                        }
                    });
                })
                .catch(reject);
        }
        function onDocumentLoadFailure(code, message, errors) {
            reject({ code, message, errors });
        }
        viewer.setLightPreset(0);
        Autodesk.Viewing.Document.load('urn:' + urn, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
}