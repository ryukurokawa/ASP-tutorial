/// import * as Autodesk from "@types/forge-viewer";

async function getAccessToken(callback) {
    try {
      const resp = await fetch("/api/auth/token");
      if (!resp.ok) {
        throw new Error(await resp.text());
      }
      const { access_token, expires_in } = await resp.json();
      callback(access_token, expires_in);
    } catch (err) {
      alert("Could not obtain access token. See the console for more details.");
      console.error(err);
    }
  }
  
  export function initViewer(container) {
    return new Promise(function (resolve, reject) {
      Autodesk.Viewing.Initializer({ env: "AutodeskProduction", getAccessToken }, function () {
        const config = { extensions: ["Autodesk.DocumentBrowser"] };
        const viewer = new Autodesk.Viewing.GuiViewer3D(container, config);
        viewer.start();
        viewer.setTheme("light-theme");
  
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
        viewer
          .loadDocumentNode(doc, doc.getRoot().getDefaultGeometry())
          .then(function (result) {
            resolve(result);
  
            viewer.addEventListener(Autodesk.Viewing.GEOMETRY_LOADED_EVENT, () => {
              setTimeout(() => {
                // === THREE.jsを取得 ===
                const THREE =
                  Autodesk.Viewing?.Private?.THREE ||
                  viewer.impl?.canvas?.ownerDocument.defaultView.THREE ||
                  window.THREE;
  
                if (!THREE) {
                  console.error("❌ THREE.js not available");
                  return;
                }
  
                console.log("✅ THREE.js detected:", THREE.REVISION);
  
                // === モデル範囲取得 ===
                const bounds = viewer.model.getBoundingBox();
                const center = bounds.center();
                const modelHeight = bounds.max.z - bounds.min.z; // ← Z軸を高さとして扱う
  
                // === サイズ定義 ===
                const cubeSize = modelHeight * 0.1;
                const width = cubeSize * 1.8;
                const height = cubeSize * 1.0;
                const depth = cubeSize * 1.4;
  
                // === ヒートマップテクスチャ生成 ===
                const canvas = document.createElement("canvas");
                canvas.width = 256;
                canvas.height = 256;
                const ctx = canvas.getContext("2d");
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
                gradient.addColorStop(0.0, "#ff0000");
                gradient.addColorStop(0.25, "#ffff00");
                gradient.addColorStop(0.5, "#00ff00");
                gradient.addColorStop(0.75, "#00ffff");
                gradient.addColorStop(1.0, "#0000ff");
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const heatmapTexture = new THREE.Texture(canvas);
                heatmapTexture.needsUpdate = true;
  
                // === オーバーレイ名登録 ===
                const overlayName = "custom-scene";
                if (!viewer.overlays.hasScene(overlayName)) viewer.overlays.addScene(overlayName);
  
                // === マテリアル設定 ===
                const materials = [
                  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // +X
                  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // -X
                  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // +Y
                  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // -Y
                  new THREE.MeshBasicMaterial({ map: heatmapTexture, side: THREE.DoubleSide }), // +Z（上面）
                  new THREE.MeshBasicMaterial({ color: 0xff0000 }) // -Z
                ];
  
                // === BoxGeometry作成 ===
                const cubeGeometry = new THREE.BoxGeometry(width, height, depth);
  
                // === 上面拡張 ===
                const expandRatio = 1.3;
  
                // Forgeが古いThree.jsを使っている場合
                if (cubeGeometry.vertices) {
                  cubeGeometry.vertices.forEach((v) => {
                    if (v.z > 0) {
                      v.x *= expandRatio;
                      v.y *= expandRatio;
                    }
                  });
                  cubeGeometry.verticesNeedUpdate = true;
                  cubeGeometry.computeVertexNormals();
                }
                // 新しいThree.js（BufferGeometry）の場合
                else if (cubeGeometry.attributes && cubeGeometry.attributes.position) {
                  const pos = cubeGeometry.attributes.position;
                  for (let i = 0; i < pos.count; i++) {
                    const z = pos.getZ(i);
                    if (z > 0) {
                      pos.setX(i, pos.getX(i) * expandRatio);
                      pos.setY(i, pos.getY(i) * expandRatio);
                    }
                  }
                  pos.needsUpdate = true;
                  cubeGeometry.computeVertexNormals();
                }
  
                // === メッシュ作成 ===
                const cube = new THREE.Mesh(cubeGeometry, new THREE.MeshFaceMaterial(materials));
                cube.position.set(center.x, center.y, bounds.max.z + modelHeight * 0.2);
  
                // === 球体（既存） ===
                const sphereGeometry = new THREE.SphereGeometry(modelHeight * 0.05, 32, 32);
                const sphereMaterial = new THREE.MeshPhongMaterial({
                  color: 0x00ff00,
                  transparent: true,
                  opacity: 0.7,
                  side: THREE.DoubleSide
                });
                const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                sphere.position.set(center.x + modelHeight * 0.3, center.y, bounds.max.z + modelHeight * 0.2);
  
                // === オーバーレイ追加 ===
                viewer.overlays.addMesh(cube, overlayName);
                viewer.overlays.addMesh(sphere, overlayName);
  
                // === 再描画 ===
                viewer.impl.invalidate(true, true, true);
  
                console.log("✅ 上面を外側に拡張（台形っぽい形）で描画完了！");
              }, 800);
            });
          })
          .catch(reject);
      }
  
      function onDocumentLoadFailure(code, message, errors) {
        reject({ code, message, errors });
      }
  
      viewer.setLightPreset(0);
  
      const safeUrn = urn.startsWith("urn:") ? urn : "urn:" + urn;
      Autodesk.Viewing.Document.load(safeUrn, onDocumentLoadSuccess, onDocumentLoadFailure);
    });
  }
  