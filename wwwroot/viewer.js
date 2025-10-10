/// import * as Autodesk from "@types/forge-viewer";

async function getAccessToken(callback) {
    try {
      const resp = await fetch("/api/auth/token");
      if (!resp.ok) throw new Error(await resp.text());
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
  
        // ✅ THREE.js 初期化確認
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
                const THREE =
                  Autodesk.Viewing?.Private?.THREE ||
                  viewer.impl?.canvas?.ownerDocument.defaultView.THREE ||
                  window.THREE;
  
                if (!THREE) {
                  console.error("❌ THREE.js not available");
                  return;
                }
  
                　　　　// === モデル範囲 ===
                const bounds = viewer.model.getBoundingBox();
                
                // ✅ center() がないForge環境用に自前で計算
                const center = new THREE.Vector3(
                  (bounds.max.x + bounds.min.x) / 2,
                  (bounds.max.y + bounds.min.y) / 2,
                  (bounds.max.z + bounds.min.z) / 2
                );
                const modelCenterWorld = center.clone();
                
                // ✅ 高さを取得（Y軸上方向モデル）
                const modelHeight = bounds.max.y - bounds.min.y;
                
                // === サイズ設定 ===
                const cubeSize = modelHeight * 0.1;
                const width = cubeSize * 1.8;
                const height = cubeSize * 1.0;
                const depth = cubeSize * 1.4;
                
                // === カメラ上方向ベクトル取得 ===
                const up = viewer.navigation.getCameraUpVector().normalize();
                const liftAmount = modelHeight * 0.05;
  
                // === ヒートマップ生成 ===
                const canvas = document.createElement("canvas");
                canvas.width = 512;
                canvas.height = 512;
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
  
                // === オーバーレイ登録 ===
                const overlayName = "custom-scene";
                if (!viewer.overlays.hasScene(overlayName))
                  viewer.overlays.addScene(overlayName);
  
                // === 直方体マテリアル ===
                const materials = [
                  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // +X
                  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // -X
                  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // +Z
                  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // -Z
                  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // +Y（上面）
                  new THREE.MeshBasicMaterial({ color: 0xff0000 })  // -Y（底面）
                ];
  
                // === 直方体 ===
                const cubeGeometry = new THREE.BoxGeometry(width, height, depth);
                const cube = new THREE.Mesh(cubeGeometry, new THREE.MeshFaceMaterial(materials));
                cube.position.copy(modelCenterWorld);
  
                
                const expandRatio = 5.0;
                const planeWidth = width * expandRatio;
                const planeDepth = depth * expandRatio;
  
                const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeDepth);
                const planeMaterial = new THREE.MeshBasicMaterial({
                  map: heatmapTexture,
                  side: THREE.DoubleSide,
                  transparent: true,
                  opacity: 0.9
                });
                const topPlane = new THREE.Mesh(planeGeometry, planeMaterial);

              
  
               
                topPlane.lookAt(
                  modelCenterWorld.x + up.x,
                  modelCenterWorld.y + up.y,
                  modelCenterWorld.z + up.z
                );
                

                topPlane.position.set(
                  modelCenterWorld.x + up.x * (height / 2 + liftAmount),
                  modelCenterWorld.y + up.y * (height / 2 + liftAmount),
                  modelCenterWorld.z + up.z * (height / 2 + liftAmount)
                );
  
                //球体
                const sphereGeometry = new THREE.SphereGeometry(modelHeight * 0.05, 32, 32);
                const sphereMaterial = new THREE.MeshPhongMaterial({
                  color: 0x00ff00,
                  transparent: true,
                  opacity: 0.7,
                  side: THREE.DoubleSide
                });
                const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
                sphere.position.set(
                  modelCenterWorld.x + modelHeight * 0.3,
                  modelCenterWorld.y,
                  modelCenterWorld.z
                );
                
                console.log("📍 cube.position:", cube.position);
                console.log("📍 topPlane.position:", topPlane.position);
                console.log("📍 sphere.position:", sphere.position);
                
                
                viewer.overlays.addMesh(cube, overlayName);
                viewer.overlays.addMesh(topPlane, overlayName);
                viewer.overlays.addMesh(sphere, overlayName);
                viewer.impl.invalidate(true, true, true);
  
               
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
      Autodesk.Viewing.Document.load(
        safeUrn,
        onDocumentLoadSuccess,
        onDocumentLoadFailure
      );
    });
  }
  