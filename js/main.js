// MAIN
// standard global variables
var SCREEN_WIDTH;
var SCREEN_HEIGHT;
var container, scene, camera, renderer, controls;
var Parser = exprEval.Parser; // Alias for FunctionParser
var originalFunction; // stores f(x,y)
var graphFunction; // function for graph calculation
var planeFunction; // function for plane calculation
var tangentialPlaneGeometry; // Geometry object for tangential plane
var graphGeometry; // Geometry object for graph
var graphMesh; // Mesh for graph
var planeGeometry // Geomertry object for tangential plane
var planeMesh; // Mesh for tangential plane
var material; // Material for graph and tangential plane
var gui; // Dat.Gui Object reference
var guiElements; // Object of Gui Elements see js/gui.js
// Starting Point
$(document).ready(function () {
    init();
    createGraph();
    resetCamera();
    animate();
});
// FUNCTIONS 		
function init() {
    console.log("Initialising...");
    // SCENE
    scene = new THREE.Scene();
    // CAMERA
    SCREEN_WIDTH = window.innerWidth;
    SCREEN_HEIGHT = window.innerHeight;
    var VIEW_ANGLE = 45
        , ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT
        , NEAR = 0.1
        , FAR = 20000;
    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    scene.add(camera);
    camera.position.set(0, 150, 400);
    camera.lookAt(0, 0, 0);
    console.log("Camera created");
    // RENDERER
    if (Detector.webgl) {
        renderer = new THREE.WebGLRenderer({
            antialias: true
        });
        console.log("Using WebGL renderer");
    }
    else {
        console.log("Using Canvas renderer");
        renderer = new THREE.CanvasRenderer();
    }
    renderer.setClearColor(0x666666, 1);
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    container = document.getElementById('ThreeJS');
    container.appendChild(renderer.domElement);
    console.log("Renderer added to div");
    // EVENTS
    $(window).resize(windowResized);
    document.addEventListener('mousedown', onMouseDown, false);
    // CONTROLS
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    // LIGHT
    var light = new THREE.PointLight(0xffffff);
    light.position.set(0, 250, 0);
    scene.add(light);
    console.log("Light initialised");
    // Axis
    scene.add(new THREE.AxisHelper(10));
    material = new THREE.MeshBasicMaterial({
        vertexColors: THREE.VertexColors
        , side: THREE.DoubleSide
    });
    ///////////////////
    //   GUI SETUP   //	
    ///////////////////
    gui = new dat.GUI({
        autoPlace: true
    });
    guiElements = new GUI();
    guiElements.ResetCamera = resetCamera;
    guiElements.CreateGraph = createGraph;
    // Add elements to gui
    gui.add(guiElements, 'ZFunc').name('z = f(x,y) = ');
    gui.add(guiElements, 'XMin').name('x Minimum = ');
    gui.add(guiElements, 'XMax').name('x Maximum = ');
    gui.add(guiElements, 'YMin').name('y Minimum = ');
    gui.add(guiElements, 'YMax').name('y Maximum = ');
    gui.add(guiElements, 'Subdivisions').name('Subdivisions = ');
    //Tangentialebene
    var ebeneFolder = gui.addFolder("Tangential plane");
    var planeEnabled = ebeneFolder.add(guiElements, 'TangentialPlaneEnabled').name("Draw plane");
    planeEnabled.onChange(createGraph);
    var guiX0 = ebeneFolder.add(guiElements, "X0").name("x0 = ");
    guiX0.listen();
    var guiY0 = ebeneFolder.add(guiElements, "Y0").name("y0 = ");
    guiY0.listen();
    ebeneFolder.add(guiElements, "PartialX").name("fx = ");
    ebeneFolder.add(guiElements, "PartialY").name("fy = ");
    gui.add(guiElements, 'ResetCamera').name("Reset Camera");
    gui.add(guiElements, 'CreateGraph').name("Graph Function");
    console.log("GUI initialised");
}

function createGraph() {
    console.log("Creating Graph...");
    var xRange = guiElements.XMax - guiElements.XMin;
    var yRange = guiElements.YMax - guiElements.YMin;
    originalFunction = Parser.parse(guiElements.ZFunc).toJSFunction(['x', 'y']);
    graphFunction = function (x, y) {
        x = xRange * x + guiElements.XMin;
        y = yRange * y + guiElements.YMin;
        var z = originalFunction(x, y);
        if (isNaN(z)) {
            return new THREE.Vector3(0, 0, 0);
        }
        else {
            return new THREE.Vector3(x, y, z);
        }
    };
    // true => sensible image tile repeat...
    var segments = guiElements.Subdivisions;
    graphGeometry = new THREE.ParametricGeometry(graphFunction, segments, segments, true);
    console.log("Geomertry object for graph created");
    ///////////////////////////////////////////////
    // calculate vertex colors based on Z values //
    ///////////////////////////////////////////////
    graphGeometry.computeBoundingBox();
    var zMin = graphGeometry.boundingBox.min.z;
    var zMax = graphGeometry.boundingBox.max.z;
    var zRange = zMax - zMin;
    var color, point, face, numberOfSides, vertexIndex;
    // faces are indexed using characters
    var faceIndices = ['a', 'b', 'c', 'd'];
    // first, assign colors to vertices as desired
    for (var i = 0; i < graphGeometry.vertices.length; i++) {
        point = graphGeometry.vertices[i];
        color = new THREE.Color(0x0000ff);
        color.setHSL(0.7 * (zMax - point.z) / zRange, 1, 0.5);
        graphGeometry.colors[i] = color; // use this array for convenience
    }
    // copy the colors as necessary to the face's vertexColors array.
    for (var i = 0; i < graphGeometry.faces.length; i++) {
        face = graphGeometry.faces[i];
        numberOfSides = (face instanceof THREE.Face3) ? 3 : 4;
        for (var j = 0; j < numberOfSides; j++) {
            vertexIndex = face[faceIndices[j]];
            face.vertexColors[j] = graphGeometry.colors[vertexIndex];
        }
    }
    console.log("Color mapped onto graph");
    ///////////////////////
    // end vertex colors //
    ///////////////////////
    if (graphMesh) {
        scene.remove(graphMesh);
    }
    graphMesh = new THREE.Mesh(graphGeometry, material);
    graphMesh.doubleSided = true;
    scene.add(graphMesh);
    console.log("Mesh for graph created and added to scene");
    //////////////////////////////////////////////
    // Calculate Tangential plane //
    //////////////////////////////////////////////
    if (guiElements.TangentialPlaneEnabled) {
        createTangentialPlane();
    }
    else {
        if (planeMesh) {
            scene.remove(planeMesh);
        }
    }
}

function createTangentialPlane() {
    console.log("Creating tangential plane...");
    if (planeMesh) {
        scene.remove(planeMesh);
    }
    var x0 = guiElements.X0;
    var y0 = guiElements.Y0;
    var z0 = originalFunction(x0, y0);
    var partialXFunc = Parser.parse(guiElements.PartialX).toJSFunction("x,y");
    var partialYFunc = Parser.parse(guiElements.PartialY).toJSFunction("x,y");
    var ebenenFunctionString = partialXFunc(x0, y0) + "*(x-(" + x0 + "))+(" + partialYFunc(x0, y0) + ")*(y-(" + y0 + "))+" + z0;
    var ebenenExpression = Parser.parse(ebenenFunctionString);
    ebenenFunction = ebenenExpression.toJSFunction("x,y");
    var xRange = guiElements.XMax - guiElements.XMin;
    var yRange = guiElements.YMax - guiElements.YMin;
    planeFunction = function (x, y) {
        x = xRange * x + guiElements.XMin;
        y = yRange * y + guiElements.YMin;
        var z = ebenenFunction(x, y);
        if (isNaN(z)) {
            return new THREE.Vector3(0, 0, 0);
        }
        else {
            return new THREE.Vector3(x, y, z);
        }
    }
    planeGeometry = new THREE.ParametricGeometry(planeFunction, guiElements.Subdivisions, guiElements.Subdivisions, true);
    planeMesh = new THREE.Mesh(planeGeometry, material);
    scene.add(planeMesh);
    console.log("Tangential plane created");
}

function onMouseDown(event) {
    console.log("Mouse click detected");
    // update the mouse variable
    var mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    // find intersections
    // create a Ray with origin at the mouse position
    //   and direction into the scene (camera direction)
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObject(graphMesh);
    // if there is one (or more) intersections
    if (intersects.length == 0) {
        return;
    }
    var pointForTangentialPlane = intersects[0].point;
    console.log("Graph hitted at: " + pointForTangentialPlane.x + " | " + pointForTangentialPlane.y);
    guiElements.X0 = pointForTangentialPlane.x;
    guiElements.Y0 = pointForTangentialPlane.y;
    createGraph(); // Redraw Graph
}

function windowResized(event) {
    SCREEN_WIDTH = window.innerWidth;
    SCREEN_HEIGHT = window.innerHeight;
    resetCamera();
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
}

function resetCamera() {
    scene.remove(camera);
    // CAMERA
    SCREEN_WIDTH = window.innerWidth;
    SCREEN_HEIGHT = window.innerHeight;
    var VIEW_ANGLE = 45
        , ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT
        , NEAR = 0.1
        , FAR = 20000;
    camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    camera.position.set(2 * guiElements.XMax, 0.5 * guiElements.YMax, 4 * graphGeometry.boundingBox.max.z);
    camera.up = new THREE.Vector3(0, 0, 1);
    camera.lookAt(scene.position);
    scene.add(camera);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
}

function animate() {
    requestAnimationFrame(animate);
    render();
    update();
}

function update() {
    controls.update();
}

function render() {
    renderer.render(scene, camera);
}