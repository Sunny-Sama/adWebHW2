/**
 * Created by Sunny on 16/6/17.
 */
/**
 * Created by Sunny on 16/6/17.
 */
// once everything is loaded, we run our Three.js stuff.
function init() {

    /*
     * 页面展示初始化*************************************
     * */
    var stats = initStats();

    var clock = new THREE.Clock();

    // 创建scene
    var scene = new THREE.Scene();

    // 创建camera并定义其初始位置
    var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.x = -30;
    camera.position.y = 70;
    camera.position.z = 30;
    camera.lookAt(scene.position);

    // 创建render
    var webGLRenderer = new THREE.WebGLRenderer();
    webGLRenderer.setClearColor(new THREE.Color(0xf0f0f0));
    webGLRenderer.setSize(window.innerWidth, window.innerHeight);
    webGLRenderer.shadowMapEnabled = true;

    //为相机创建trackballControl,实现视角转换
    var trackballControls = new THREE.TrackballControls(camera);
    trackballControls.rotateSpeed = 1.0;
    trackballControls.zoomSpeed = 1.0;
    trackballControls.panSpeed = 1.0;
    //放大缩小
    //trackballControls.noZoom=false;
    //平移
    //trackballControls.noPan=false;
    trackballControls.staticMoving = true;

    //一个不可见的平面,用于定位物体位置
    var transPlane = new THREE.Mesh( new THREE.PlaneGeometry( 200, 200, 8, 8 ), new THREE.MeshBasicMaterial( { color: 0xffffff, opacity: 0, transparent: true, wireframe: true } ) );
    //var transPlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(500, 500, 8, 8), new THREE.MeshBasicMaterial({color: 0xffffff}));
    transPlane.visible = true;
    scene.add(transPlane);


    /*
     * 页面内容初始化**********************************
     * */
    // 创建棋盘平面
    var planeGeometry = new THREE.PlaneGeometry(60, 60);
    var planeMaterial = new THREE.MeshLambertMaterial({color: 0xf7f7db});
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.receiveShadow = true;
    plane.rotation.x = -0.5 * Math.PI;
    scene.add(plane);

    //创建棋盘分界线
    createLine(-30,0,30,30,0,30);
    createLine(-30,0,10,30,0,10);
    createLine(-30,0,-10,30,0,-10);
    createLine(-30,0,-30,30,0,-30);
    createLine(30,0,-30,30,0,30);
    createLine(10,0,-30,10,0,30);
    createLine(-10,0,-30,-10,0,30);
    createLine(-30,0,-30,-30,0,30);

    //环境光渲染
    var ambientLight = new THREE.AmbientLight(0x0c0c0c);
    scene.add(ambientLight);

    //spotlight
    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(-40, 170, 0);
    spotLight.castShadow = true;
    scene.add(spotLight);

    document.getElementById("WebGL-output").appendChild(webGLRenderer.domElement);
    document.addEventListener('mousedown', onDocumentMouseDown, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    document.addEventListener('mouseup', onDocumentMouseUp, false);

    /*
     * 页面主要逻辑部分
     * */
    var mouse = new THREE.Vector2();
    var offset = new THREE.Vector3();
    var INTERSECTED, SELECTED;
    var objects = [];

    //GUI Control
    var gui = new dat.GUI();
    var controls = new function () {
        this.RedChess = function(){
            createCylinder(35,2,0,0xff0000);
        };
        this.BlueChess = function(){
            createCylinder(35,2,0, 0x7777ff);
        };
        this.Reset = function(){
            for(var i = 0; i < objects.length; i++){
                scene.remove(objects[i]);
            }
        };
    };

    gui.add(controls, 'RedChess');
    gui.add(controls, 'BlueChess');
    gui.add(controls, 'Reset');

    render();

    //重复调用,更新页面内容
    function render() {
        stats.update();
        var delta = clock.getDelta();
        trackballControls.update(delta);
        requestAnimationFrame(render);
        webGLRenderer.render(scene, camera)
    }

    //物体移动和放置
    //鼠标点击事件,获取物体所在位置,此时视角控制应该为false
    function onDocumentMouseDown( event ) {

        event.preventDefault();
        var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
        vector.unproject(camera);
        //新建一条从相机的位置到vector向量的一道ray
        var raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );
        //获取相交的物体
        var intersects = raycaster.intersectObjects( objects );

        if ( intersects.length > 0 ) {
            trackballControls.enabled = false;
            //把选中的对象放到全局变量SELECTED中
            SELECTED = intersects[ 0 ].object;
            //和平面相交
            intersects = raycaster.intersectObject( transPlane );
            offset.copy( intersects[ 0 ].point ).sub( transPlane.position );
        }
    }

    //鼠标移动事件,及时更新物体位置
    function onDocumentMouseMove(event) {
        event.preventDefault();

        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

        var vector = new THREE.Vector3( mouse.x, mouse.y, 1);
        vector.unproject(camera);

        var raycaster = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );

        //是否有东西被选中
        if ( SELECTED ) {
            //限制拖动距离不能超出水平面panel
            var intersects = raycaster.intersectObject( transPlane );
            //这个鼠标点中的点的位置减去偏移向量，新位置赋值给选中物体
            if(intersects.length > 0){
                SELECTED.position.copy( intersects[ 0 ].point.sub( offset ) );
            }
            return;

        }

        //否则的话，光线和所有物体相交，返回相交的物体
        var intersects = raycaster.intersectObjects( objects );
        if ( intersects.length > 0 ) {
            //相交物体不是上一个相交物体
            if ( INTERSECTED != intersects[ 0 ].object ) {
                INTERSECTED = intersects[ 0 ].object;
                //改变水平面的位置,限制棋子只能在棋盘平面上移动
                transPlane.position.copy( INTERSECTED.position );
                transPlane.rotation.x = -0.5 * Math.PI;
            }

        }
    }

    function onDocumentMouseUp (event){
        trackballControls.enabled = true;
        if ( INTERSECTED ) {
            transPlane.position.copy( INTERSECTED.position );
            SELECTED = null;

        }
    }


    //创建一条线
    function createLine(x0,y0,z0,x1,y1,z1){
        var lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff, linewidth: 20
        });
        var lineGeometry = new THREE.Geometry();
        lineGeometry.vertices.push(new THREE.Vector3(x0, y0, z0));
        lineGeometry.vertices.push(new THREE.Vector3(x1, y1, z1));
        var line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
    }

    //创建一个圆柱体
    function createCylinder(x,y,z,color){
        var geometry = new THREE.CylinderGeometry( 6, 6, 4, 32 );
        var material = new THREE.MeshLambertMaterial( {color: color} );
        var cylinder = new THREE.Mesh( geometry, material );
        cylinder.position.x = x;
        cylinder.position.y = y;
        cylinder.position.z = z;
        cylinder.castShadow = true;
        objects.push(cylinder);
        scene.add( cylinder );
    }

    function initStats() {

        var stats = new Stats();

        stats.setMode(0);

        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';

        document.getElementById("Stats-output").appendChild(stats.domElement);

        return stats;
    }
}
window.onload = init;