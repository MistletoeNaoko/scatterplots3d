import React from 'react';
import * as THREE from 'three';
import * as d3 from 'd3';

export default class Scatterplots3D extends React.Component {
    constructor() {
        super();
        this.data = [];
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();
        this.state = {
            maxPos: 30,
            width: window.innerWidth,
            height: window.innerHeight,
            focusedPlot: null
        };
    }

    render() {
        let detailTable = [];
        if (this.state.focusedPlot) {
            let focusedData = this.data[this.state.focusedPlot.userData.data.idx];
            for (let key in focusedData) {
                if (key !== 'source') {
                    detailTable.push(
                        <tr key={key}>
                            <td>{key}</td>
                            <td>{focusedData[key]}</td>
                        </tr>
                    );
                }
            }
        }
        return (
            <div
                className='3dscatterplots'
                ref={mount => {
                    this.mount = mount;
                }}>
                <input type='file' id='fileInput' onChange={this.readFile.bind(this)}/>
                <div
                    style={{position: 'absolute', color: 'white', right: '0px', bottom: '0px', whiteSpace: 'pre-line', zIndex:'11', fontSize: '0.8rem'}}>
                    <table>
                        <tbody>
                            {detailTable}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    componentDidMount() {
        const width = this.state.width;//this.mount.clientWidth;
        const height = this.state.height;//this.mount.clientHeight;

        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.domElement.id = '3dscatterplots_view';
        document.body.appendChild(this.renderer.domElement);
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
        this.camera.position.z = 50;
        this.camera.lookAt( this.scene.position );

        this.light = new THREE.DirectionalLight(0xffffff);
        this.light.position.set(0, 0, 500);
        this.scene.add(this.light);
        this.ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.5);
        this.scene.add(this.ambientLight);

        // const geometry = new THREE.BoxGeometry(1, 1, 1);
        // const material = new THREE.MeshPhongMaterial({color: 0xff0000});
        // const box = new THREE.Mesh(geometry, material);
        // box.position.x = this.state.maxX;
        // this.scene.add(box);

        this.plotsGroup = new THREE.Group();
        this.scene.add(this.plotsGroup);
        this.drawPlots();

        this.mount.appendChild(this.renderer.domElement);
        this.renderer.render(this.scene, this.camera);

        document.getElementById('3dscatterplots_view').addEventListener('mousemove', this.mouseMove().bind(this), false);
        this.start();
    }

    componentWillUnmount() {
        this.stop();
        this.mount.removeChild(this.renderer.domElement);
    }

    animate() {
        this.renderer.render(this.scene, this.camera);
        this.frameId = window.requestAnimationFrame(this.animate.bind(this));
    }

    start() {
        if (!this.frameId) {
            this.frameId = requestAnimationFrame(this.animate.bind(this));
        }
    }

    stop() {
        cancelAnimationFrame(this.frameId);
    }

    readFile() {
        let files = document.getElementById('fileInput').files;
        let reader = new FileReader();
        reader.readAsText(files[0]);
        reader.onload = function () {
            let result = reader.result;
            let data = d3.csvParse(result, function (d) {
                d.source = files[0].name;
                return d;
            });
            this.data = data;
            this.minmaxQI = d3.extent(this.data, function (d) {
                return d['Q/I'];
            });
            this.minmaxUI = d3.extent(this.data, function (d) {
                return d['U/I'];
            });
            this.minmaxFlx = d3.extent(this.data, function(d) {
                return d['Flx(V)'];
            });
            this.scale = this.state.maxPos / Math.max(this.minmaxQI[1], this.minmaxUI[1]);
            this.setState({
               scale:  this.scale
            });
            this.colormap = d3.scaleSequential()
                .domain(d3.extent(this.data, function(d) {
                    return d['V-J'];
                }))
                .interpolator(d3.piecewise(d3.interpolateLab, ["#0000ff", "#0084ff", "#bb9db8", "#ffb000", "#ff0000"]));
            this.drawPlots();
        }.bind(this);
    }

    drawPlots() {
        let geometry = new THREE.SphereBufferGeometry(0.3, 32, 32);
        for (let i = 0; i < this.data.length; i++) {
            let material = new THREE.MeshPhongMaterial( {
                color: this.colormap(this.data[i]['V-J']),
                specular: 0x444444,
                shininess: (this.data[i]['Flx(V)'] - this.minmaxFlx[0]) / (this.minmaxFlx[1] - this.minmaxFlx[0]) * 200,
            });
            let sphere =　new THREE.Mesh(geometry, material);
            sphere.position.x = this.data[i]['Q/I'] * this.scale;
            sphere.position.y = this.data[i]['U/I'] * this.scale;
            sphere.userData.data = {
                source: this.data[i]['source'],
                idx: i,
                JD: this.data[i]['JD']
            };
            this.plotsGroup.add(sphere);
        }
    }

    mouseMove() {
        return function (e) {
            if (this.light) {
                e.preventDefault();
                let xpos = e.clientX - this.state.width / 2,
                    ypos = -(e.clientY - this.state.height / 2);
                this.light.position.set(xpos, ypos,500);
                this.mouse.x = (e.offsetX / this.renderer.domElement.clientWidth) * 2 - 1;
                this.mouse.y = -(e.offsetY / this.renderer.domElement.clientHeight) * 2 + 1;
                if (this.plotsGroup) {
                    this.raycaster.setFromCamera(this.mouse, this.camera);
                    let intersects = this.raycaster.intersectObjects(this.plotsGroup.children);
                    if (intersects.length > 0) {
                        if (this.state.focusedPlot) {
                            this.state.focusedPlot.material.emissive.setHex(this.state.focusedPlot.currentHex);
                        }
                        let focusedPlot = intersects[0].object;
                        focusedPlot.currentHex = focusedPlot.material.emissive.getHex();
                        focusedPlot.material.emissive.setHex(0x00ff00);
                        this.setState({
                            focusedPlot: focusedPlot
                        });
                    } else {
                        if (this.state.focusedPlot) {
                            this.state.focusedPlot.material.emissive.setHex(this.state.focusedPlot.currentHex);
                        }
                        this.setState({
                            focusedPlot: null
                        });
                    }
                }
            }
        };
    }
}
