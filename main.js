/**
 *
 * DO NOT UPGRADET the vis.JS version until
 * https://github.com/almende/vis/issues/3562
 * is fixed!!
 */

let nodes = [];
let edges = [];
let network = null;
const iconSize = 70;
const fetchOpts = {
    method: "GET", // *GET, POST, PUT, DELETE, etc.
    mode: "no-cors", // no-cors, cors, *same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
        "Content-Type": "application/json",
    },
    redirect: "follow", // manual, *follow, error
    referrer: "no-referrer", // no-referrer, *client
};

//static nodes
function getDbs() {
    const rightLineX = iconSize * 7;
    const leftLineX = -iconSize * 14;
    let result = [];

    //add the outside world
    for (let i = 0; i < 4; i++) {
        result.push({
            id: "client" + i,
            x: leftLineX,
            y: iconSize * 1.5 * i,
            label: 'Client',
            dependencies: [
                "API"
            ],
            group: "clients",
        });
    }

    const setAttributes = function () {
        result.map(service => {
            // service.fixed = true;
            service.physics = false;
            // mass = 10000;
            // service.group = "static";
        })
    }

    return new Promise(function (resolve, reject) {
        fetch('./clusters.json', fetchOpts)
            .then(function (response) {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Exception(response.statusText);
                }
            })
            .then(dbs => {
                dbs.forEach((cluster, index) => {
                    result.push(
                        {
                            id: cluster.name,
                            x: rightLineX,
                            y: iconSize * (index * 2),
                            label: cluster.name,
                            group: "dbs",
                        }
                    );
                });
                setAttributes();
                resolve(result)
            })
            .catch(e => {
                reject(e);
            })
    })
}

function getServices() {
    return new Promise((resolve, reject) => {
        fetch('./microservices.json', fetchOpts)
            .then(function (response) {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Exception(response.statusText);
                }
            })
            .then(data => {
                resolve(data);
            })
            .catch(e => {
                reject(e);
            })
    });
}


function addEdges(name, dependencies) {

    if (!dependencies) {
        return;
    }
    dependencies.forEach(req => {
        // console.log("edge", name, "=>", req);
        edges.push({
            from: name,
            to: req,
            arrows: 'to',
            dashes: true,
        })
    })
}

function draw(staticNodes, microServices) {
    console.log("draw", staticNodes, microServices);

    // const staticNodes = getNonServices();
    nodes = nodes.concat(staticNodes);
    staticNodes.forEach(service => {
        addEdges(service.id, service.dependencies);
    });


    microServices.forEach(service => {
        nodes.push({
            mass: service.size,
            icon: {
                size: 50 + service.size
            },
            id: service.name,
            label: service.name,
            physics: true,
            group: "micro",
        });

        addEdges(service.name, service.dependencies);
    })

    // http://visjs.org/docs/network/
    let container = document.getElementById('map');
    let data = {
        nodes: nodes,
        edges: edges
    };
    let options = {
        configure: {
            enabled: true,
            filter: 'physics, layout',
            showButton: true
        },
        nodes: {
            // http://visjs.org/docs/network/nodes.html#
            shape: 'icon',
            font: {
                color: "white",
            },
            icon: {
                //https://fontawesome.com/v4.7.0/icons/
                face: "FontAwesome",
                code: "\uf0a0",
                // size: iconSize,  //50,
                // color: 'black'
            },
        },
        // http://visjs.org/docs/network/physics.html
        "physics": {
            "forceAtlas2Based": {
                "centralGravity": 0.095,
                "springLength": 100
            },
            "maxVelocity": 5,
            "minVelocity": 0.75,
            "solver": "forceAtlas2Based"
        },
        edges: {
            // physics: false,
        },
        // disable random position each visit
        layout: {
            randomSeed: 42, //universal truth
            // hierarchical: true
        },

        //FontAwesome codes from here: https://fontawesome.com/v4.7.0/icons/
        groups: {
            clients: {
                icon: {
                    color: "orange",
                    size: 90,
                    code: "\uf0c0"
                },
                level: 1,
            },
            dbs: {
                icon: {
                    code: "\uf0a0",
                    size: 90,
                    color: "orange",
                },
                level: 1,
            },
            micro: {
                icon: {
                    color: "white",
                    code: "\uf1b2",
                },
                level: 3,
            }
        }
    };
    network = new vis.Network(container, data, options);

    //disable physics after the initial draw
    //so the user can move around the nodes
    network.on("stabilizationIterationsDone", function () {
        network.setOptions({ physics: false });
    });
}

window.addEventListener("load", function () {
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
    Promise
        .all([getDbs(), getServices()])
        .then(results => {
            draw(results[0], results[1]);
        })
        .catch(e => {
            alert(e);
        })
});