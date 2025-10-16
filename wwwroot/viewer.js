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

                

  　　　　　　　　　// === マテリアル ===
const materials = [
  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // +X
  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // -X
  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // +Z
  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // -Z
  new THREE.MeshBasicMaterial({ color: 0xff0000 }), // +Y（上面）
  new THREE.MeshBasicMaterial({ color: 0xff0000 })  // -Y（底面）
];
const faceMaterial = new THREE.MeshFaceMaterial(materials);

// === 1個目の直方体 ===
const geometry1 = new THREE.BoxGeometry(width, height, depth);
const cube1 = new THREE.Mesh(geometry1, faceMaterial);
cube1.position.copy(modelCenterWorld);
cube1.position.z += modelHeight * 0.05;

// === 2個目の直方体（上面なし）===
const biggerScale = 2.0;
const halfW = (width * biggerScale) / 2;
const halfH = (height * biggerScale) / 2;
const halfD = (depth * biggerScale) / 2;

const geometry2 = new THREE.Geometry();

// 頂点定義（Z軸が上の場合）
geometry2.vertices.push(
  // 下
  new THREE.Vector3(-halfW, -halfD, -halfH), // 0
  new THREE.Vector3( halfW, -halfD, -halfH), // 1
  new THREE.Vector3( halfW,  halfD, -halfH), // 2
  new THREE.Vector3(-halfW,  halfD, -halfH), // 3
  // 上
  new THREE.Vector3(-halfW, -halfD,  halfH), // 4
  new THREE.Vector3( halfW, -halfD,  halfH), // 5
  new THREE.Vector3( halfW,  halfD,  halfH), // 6
  new THREE.Vector3(-halfW,  halfD,  halfH)  // 7
);

// === 下と側面のみ ===
geometry2.faces.push(
  // 下
  new THREE.Face3(0, 1, 2), new THREE.Face3(0, 2, 3),
  // 側面
  new THREE.Face3(0, 4, 5), new THREE.Face3(0, 5, 1),
  new THREE.Face3(1, 5, 6), new THREE.Face3(1, 6, 2),
  new THREE.Face3(2, 6, 7), new THREE.Face3(2, 7, 3),
  new THREE.Face3(3, 7, 4), new THREE.Face3(3, 4, 0)
);

geometry2.computeFaceNormals();
geometry2.computeVertexNormals();

const cube2 = new THREE.Mesh(geometry2, faceMaterial);
cube2.position.copy(modelCenterWorld);
cube2.position.x += width * 2.0;
cube2.position.z += modelHeight *0.3


// === Forgeオーバーレイに登録 ===
const overlayName = "custom-scene";
if (!viewer.overlays.hasScene(overlayName)) {
  viewer.overlays.addScene(overlayName);
}
viewer.overlays.addMesh(cube1, overlayName);
viewer.overlays.addMesh(cube2, overlayName);

viewer.impl.invalidate(true, true, true);


              }, 800);
            });
          })
          .catch(reject);
      }
      console.log(THREE.REVISION);

  
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
  