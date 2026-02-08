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


　　　　　　　// === 2個目の直方体（上だけ削除） ===
const biggerScale = 2.0;
let geometry2;

// ✅ Forge環境によってBoxGeometryがGeometry or BufferGeometryになるため安全分岐
const baseGeometry = new THREE.BoxGeometry(
  width * biggerScale,
  height * biggerScale,
  depth * biggerScale
);

let geomMod;
if (baseGeometry.isBufferGeometry) {
  geomMod = new THREE.Geometry().fromBufferGeometry(baseGeometry);
} else {
  geomMod = baseGeometry.clone();
}

// ✅ 上向きZ部分削除
geomMod.faces = geomMod.faces.filter(face => face.normal.z < 0.9);
geomMod.computeFaceNormals();
geomMod.computeVertexNormals();

// === メッシュ作成 ===
const cube2 = new THREE.Mesh(geomMod, faceMaterial);

// === 配置
cube2.position.copy(modelCenterWorld);
cube2.position.x += width * 2.0;     
cube2.position.z += modelHeight * 0.05 + 0.001; 

const overlayName = "custom-scene";

// ✅ モデル読み込み後にも必ず再登録
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
  