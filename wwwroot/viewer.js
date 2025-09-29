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
            viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry())
                .then(function (result) {
                    // モデルが読み込まれた後にジオメトリを追加
                    setTimeout(() => {
                        try {
                            // THREE.jsのインスタンスを取得
                            const THREE = window.THREE;

                            // 立方体を作成
                            const cubeGeometry = new THREE.BoxGeometry(50, 50, 50);
                            const cubeMaterial = new THREE.MeshPhongMaterial({
                                color: 0x00ff00,
                                transparent: true,
                                opacity: 0.7
                            });
                            const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
                            cube.position.set(100, 100, 100);

                            // 球を作成
                            const sphereGeometry = new THREE.SphereGeometry(30, 32, 32);
                            const sphereMaterial = new THREE.MeshPhongMaterial({
                                color: 0x0000ff,
                                transparent: true,
                                opacity: 0.7
                            });
                            const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                            sphere.position.set(-100, 100, -100);

                            // ジオメトリをシーンに追加
                            viewer.impl.scene.add(cube);
                            viewer.impl.scene.add(sphere);

                            // シーンを更新
                            viewer.impl.invalidate(true);
                            console.log('Custom geometries added successfully');
                        } catch (error) {
                            console.error('Error adding geometries:', error);
                        }
                    }, 1000); // モデル読み込み後1秒待ってから追加

                    resolve(result);
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
