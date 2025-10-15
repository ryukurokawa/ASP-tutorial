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
                const liftAmount = modelHeight * 0.05;
                const up = new THREE.Vector3(0, 0, 1); // ForgeモデルのZ軸を上とみなす

  　　　　　　　　　console.log(viewer.navigation.getCameraUpVector());

                
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

                
  
               

                // === 上面を最初から広くした形状を自前定義 ===
const geometry = new THREE.Geometry();

const halfW = width / 2;
const halfD = depth / 2;
const halfH = height / 2;


const topScale = 2.0; 

// 頂点定義（Y軸が高さ方向の場合）
geometry.vertices.push(
  // 下の面
  new THREE.Vector3(-halfW, -halfH, -halfD), 
  new THREE.Vector3( halfW, -halfH, -halfD), 
  new THREE.Vector3( halfW, -halfH,  halfD), 
  new THREE.Vector3(-halfW, -halfH,  halfD), 

  //上（z軸が上のため）
new THREE.Vector3(-halfW * topScale, -halfD * topScale,  halfH), 
new THREE.Vector3( halfW * topScale, -halfD * topScale,  halfH), 
new THREE.Vector3( halfW * topScale,  halfD * topScale,  halfH), 
new THREE.Vector3(-halfW * topScale,  halfD * topScale,  halfH)  
);




// 面を定義
geometry.faces.push(
  // 下
  new THREE.Face3(0, 1, 2), new THREE.Face3(0, 2, 3),
  // 上
  new THREE.Face3(4, 5, 6), new THREE.Face3(4, 6, 7),
  // 側面
  new THREE.Face3(0, 4, 5), new THREE.Face3(0, 5, 1),
  new THREE.Face3(1, 5, 6), new THREE.Face3(1, 6, 2),
  new THREE.Face3(2, 6, 7), new THREE.Face3(2, 7, 3),
  new THREE.Face3(3, 7, 4), new THREE.Face3(3, 4, 0)
);

geometry.computeFaceNormals();
geometry.computeVertexNormals();

const faceMaterial = new THREE.MeshFaceMaterial(materials);

const cube = new THREE.Mesh(geometry, faceMaterial);
cube.position.z += modelHeight * 0.05;
  
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
                
             
                
                viewer.overlays.addMesh(cube, overlayName);
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
  