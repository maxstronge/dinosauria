<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import { fetchDinosaurAndTaxaData } from '../services/api';
    import type { TreeNode } from '../types';
    import { buildTaxonomyTree } from '../services/treeBuilder';
    import { createFisheye, type FisheyeFunction, type FisheyePoint } from '../services/fisheye';
    import { drag } from 'd3-drag';
    import { browser } from '$app/environment';

    // D3 selections
    let nodeSelection: d3.Selection<SVGCircleElement, d3.HierarchyNode<TreeNode>, SVGGElement, unknown>;
    let linkSelection: d3.Selection<SVGLineElement, d3.HierarchyLink<TreeNode>, SVGGElement, unknown>;
    let labelSelection: d3.Selection<SVGTextElement, d3.HierarchyNode<TreeNode>, SVGGElement, unknown>;
    let g: d3.Selection<SVGGElement, unknown, HTMLElement, any>;

    // State variables
    let data: TreeNode;
    let loading = true;
    let error = "";
    let svg: SVGSVGElement;  
    let simulation: d3.Simulation<d3.HierarchyNode<TreeNode>, undefined> | null = null;
    let fontLoaded = false;
    const BASE_NODE_RADIUS = 10;
    const LABEL_OFFSET_X = 15;
    const LABEL_OFFSET_Y = 5;
    const HIGHLIGHT_COLOR = "#e0e0e0";

    // Force simulation parameters
    const linkDistance = 1;
    const linkStrength = 2;
    const chargeStrength = -800;
    const centerStrength = 0.9;
    const xStrength = 0.2;
    const yStrength = 0.4;

    let fisheye: FisheyeFunction;
    let zoomTransform: d3.ZoomTransform = d3.zoomIdentity;
    let animationFrameID: number | null = null;
    let dragAnimationFrameId: number | null = null;

    // List of species to fetch and display
    const speciesTestList = [
        'Tyrannosaurus rex', 'Spinosaurus aegyptiacus', 'Triceratops horridus',
        'Parasaurolophus walkeri', 'Stegosaurus stenops', 'Velociraptor mongoliensis', 'Brachiosaurus altithorax', 'Carcharodontosaurus saharicus', 'Argentinosaurus huinculensis', 'Giganotosaurus carolinii', 'Pachycephalosaurus wyomingensis', 'Deinonychus antirrhopus', 'Ankylosaurus magniventris', 'Diplodocus carnegii', 'Allosaurus fragilis', 'Iguanodon bernissartensis', 'Ceratosaurus nasicornis', 'Carnotaurus sastrei', 'Therizinosaurus cheloniformis', 'Dilophosaurus wetherilli', 'Diplodicus longii', 'Styracosaurus albertensis', 'Corythosaurus casuarius', 'Compsognathus longipes', 'Gallimimus bullatus'
    ];

    // Fetch the dinosaur taxonomy data from the API
    async function fetchData(speciesList: string[]) {
        try {
            const { dinosaurs, taxa } = await fetchDinosaurAndTaxaData(speciesList);
            data = buildTaxonomyTree(dinosaurs, taxa);
            console.log("Data loaded:", data); 
            loading = false;
        } catch (e: any) {
            error = e.message;
            loading = false;
        }
    }

    // Generate the force-directed tree visualization
    function createVisualization() {
        if (!data) return undefined;

        // Clear existing content
        d3.select('svg').selectAll("*").remove();

        data.expanded = true;   

        // Set up dimensions and root position
        const width = 1200;
        const height = 500;
        const rootX = width / 2;
        const rootY = height / 2;

        // Compute the graph
        const root = d3.hierarchy(data);
        console.log("Hierarchy created:", root);
        const nodes = filterExpandedNodes(root);
        const links = root.links().filter(link => 
            nodes.includes(link.source) && nodes.includes(link.target)
        );

        // Create SVG element
        const svgElement = d3.select("svg")
            .attr("width", '90%')
            .attr("height", height)
            .attr("viewBox", [0,0, width, height])
            .attr("style", "max-width: 85%; height: 75%;");

        // Create a group for zoom functionality
        g = svgElement.append("g");        

        // Add zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 8])
            .translateExtent([[-450, -450], [width + 450, height + 450]])
            .on("zoom", (event) => {
                zoomTransform = event.transform;
                g.attr("transform", zoomTransform.toString());
                updateFisheye(d3.pointer(event, svgElement.node()));
            });

        svgElement.call(zoom as any);        

        // Setup fisheye distortion
        fisheye = createFisheye() as FisheyeFunction;
        fisheye.radius(75)
        fisheye.distortion(1);

        // Add links (edges between nodes)
        linkSelection = g.append("g")
            .attr("stroke", "var(--link-color)")
            .attr("stroke-opacity", 0.6)
            .selectAll<SVGLineElement, d3.HierarchyLink<TreeNode>>("line")
            .data(links)
            .join("line");

        // Add nodes
        nodeSelection = g.append("g")
            .attr("fill", "var(--node-default)")
            .attr("stroke", "var(--stroke-color)")
            .selectAll<SVGCircleElement, d3.HierarchyNode<TreeNode>>("circle")
            .data(nodes)
            .join("circle")
            .attr("stroke-width", d => d.data.expanded ? "var(--stroke-width-default)" : "var(--stroke-width-collapsed)")
            .attr("stroke-opacity", d => d.data.expanded ? "var(--stroke-opacity-default)" : "var(--stroke-opacity-collapsed)")
            .attr("fill", (d: any) => {
                if (d.children) {
                    return d.data.expanded ? "var(--node-expanded)" : "var(--node-default)";
                }
                return "var(--node-leaf)";
            })
            .attr("r", d => d.data.name === 'Dinosauria' ? BASE_NODE_RADIUS*1.75 : BASE_NODE_RADIUS)
            .on("mouseover", handleMouseOver)
            .on("mouseout", handleMouseOut)
            .on("click", handleNodeClick);

        // Add text labels for nodes
        labelSelection = g.append("g")
            .selectAll<SVGTextElement, d3.HierarchyNode<TreeNode>>("text")
            .data(nodes)
            .join("text")
            .text((d: any) => d.data.name)
            .attr("font-size", d => (d as any).data.name === 'Dinosauria' ? 16 : 10)
            .attr("dy", "0.31em")
            .attr("fill", "var(--text-color)")
            .attr("fill-opacity", d => d.data.name === 'Dinosauria' ? 1 : 0.5);

        // Set up force simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id((d: any) => d.id).distance(linkDistance).strength(linkStrength))
            .force('charge', d3.forceManyBody().strength(chargeStrength))
            .force('center', d3.forceCenter(width / 2, height / 2).strength(centerStrength))
            .force("x", d3.forceX().strength(xStrength))
            .force("y", d3.forceY().strength(yStrength))
            .force("collide", d3.forceCollide().radius(BASE_NODE_RADIUS*1.2).strength(1.2).iterations(2))
            .alphaDecay(0.05)
            .velocityDecay(0.6);
            
            
        simulation.on("tick",updatePositions)


        // Update positions on each tick of the simulation
        const prevNodePositions = new Map();
        const prevLinkPositions = new Map();

        function updatePositions() {
            requestAnimationFrame(() => {
                linkSelection.each(function(d: any) {
                    const key = `${d.source.id}-${d.target.id}`;
                    const prev = prevLinkPositions.get(key) || {};
                    const current = {
                        x1: d.source.fisheye?.x ?? d.source.x,
                        y1: d.source.fisheye?.y ?? d.source.y,
                        x2: d.target.fisheye?.x ?? d.target.x,
                        y2: d.target.fisheye?.y ?? d.target.y
                    };
                    if (JSON.stringify(prev) !== JSON.stringify(current)) {
                        d3.select(this)
                            .attr("x1", current.x1)
                            .attr("y1", current.y1)
                            .attr("x2", current.x2)
                            .attr("y2", current.y2);
                        prevLinkPositions.set(key, current);
                    }
                });

                nodeSelection.each(function(d: any) {
                    const prev = prevNodePositions.get(d.id) || {};
                    const current = {
                        cx: d.fisheye?.x ?? d.x,
                        cy: d.fisheye?.y ?? d.y,
                        r: d.data.name === 'Dinosauria' ? BASE_NODE_RADIUS * 2 : BASE_NODE_RADIUS * (d.fisheye?.z ?? 1)
                    };
                    if (JSON.stringify(prev) !== JSON.stringify(current)) {
                        d3.select(this)
                            .attr("cx", current.cx)
                            .attr("cy", current.cy)
                            .attr("r", current.r)
                            .call(dragBehavior as any);
                        prevNodePositions.set(d.id, current);
                    }
                });

                labelSelection.each(function(d: any) {
                    const prev = prevNodePositions.get(d.id) || {};
                    const current = {
                        x: (d.fisheye?.x ?? d.x) + ((d.fisheye?.x ?? d.x) > rootX ? LABEL_OFFSET_X : -LABEL_OFFSET_X),
                        y: (d.fisheye?.y ?? d.y) + ((d.fisheye?.y ?? d.y) > rootY ? LABEL_OFFSET_Y : -LABEL_OFFSET_Y),
                        "text-anchor": (d.fisheye?.x ?? d.x) > rootX ? "start" : "end",
                        "dominant-baseline": (d.fisheye?.y ?? d.y) > rootY ? "hanging" : "text-top",
                        "font-size": `${(d.data.name === 'Dinosauria' ? BASE_NODE_RADIUS * 2 : BASE_NODE_RADIUS) * (d.fisheye.z ?? 1) / zoomTransform.k}px`                    };
                    if (JSON.stringify(prev) !== JSON.stringify(current)) {
                        d3.select(this)
                            .attr("x", current.x)
                            .attr("y", current.y)
                            .attr("text-anchor", current["text-anchor"])
                            .attr("dominant-baseline", current["dominant-baseline"])
                            .attr("font-size", current["font-size"]);
                        prevNodePositions.set(d.id, current);
                    }
                });
            });
        }


        // Apply fisheye distortion
        function applyFisheye() {
            animationFrameID = null;
            nodeSelection.each((d: any) => {
                const distorted = fisheye({ x: d.fx || d.x, y: d.fy || d.y }) as FisheyePoint;
                d.fisheye = distorted;
            });
            updatePositions();
        }

        // Update fisheye based on current zoom and mouse position
        function updateFisheye(mouse: [number, number]) {
            const invertedMouse = zoomTransform.invert(mouse);
            fisheye.focus(invertedMouse);
            fisheye.radius(75);
            fisheye.distortion(0.8 / zoomTransform.k);

            if (animationFrameID) { 
                cancelAnimationFrame(animationFrameID);
            }
            animationFrameID = requestAnimationFrame(applyFisheye);
        }

        // Add mousemove
        svgElement.on("mousemove", (event: MouseEvent) => {
            updateFisheye(d3.pointer(event, svgElement.node()));
        });


        // Add drag behavior
        let dragTimeout: ReturnType<typeof setTimeout> | undefined;
        
        const dragBehavior = d3.drag<SVGCircleElement, d3.HierarchyNode<TreeNode>>()
            .on('start', (event, d) => {
                event.sourceEvent.stopPropagation(); // Prevent click event from firing
                dragTimeout = setTimeout(() => {
                    dragTimeout = undefined;
                    dragstarted(event, d);
                }, 8); // ms delay
            })
            .on('drag', (event, d) => {
                dragged(event, d);
            })
            .on('end', (event, d) => {
                if (dragTimeout) {
                    clearTimeout(dragTimeout);
                    dragTimeout = undefined;
                    // It was just a click, not a drag
                    handleNodeClick(event, d);
                } else {
                    dragended(event, d);
                }
            });


        function dragstarted(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: any, d: any) {
            d.fx = event.x;
            d.fy = event.y;

            if (dragAnimationFrameId) {
                cancelAnimationFrame(dragAnimationFrameId);
            }
            dragAnimationFrameId = requestAnimationFrame(() => {
                updateFisheye([event.x, event.y]);
                dragAnimationFrameId = null;
            });
        }

        function dragended(event: any, d: any) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;

            if (dragAnimationFrameId) {
                cancelAnimationFrame(dragAnimationFrameId);
            }
            dragAnimationFrameId = requestAnimationFrame(() => {
                updateFisheye([event.x, event.y]);
                dragAnimationFrameId = null;
            });
        }

        nodeSelection.call(dragBehavior as any);

        function handleMouseOver(event: any, d: any) {
            const nodeElement = d3.select(event.target);
            const labelElement = labelSelection.filter((labelD: any) => labelD.data.name === d.data.name);

            nodeElement.attr("fill", "var(--node-highlight)");
            labelElement.attr("fill", "var(--text-color-highlight)");
            labelElement.attr("fill-opacity", 1);
        }

        function handleMouseOut(event: any, d: any) {
            const nodeElement = d3.select(event.target);
            const labelElement = labelSelection.filter((labelD: any) => labelD.data.name === d.data.name);

            nodeElement.attr("fill", (d: any) => d.children ? "var(--node-default)" : "var(--node-leaf)");
            labelElement.attr("fill", "var(--text-color)");
            labelElement.attr("fill-opacity", d => d.data.name === 'Dinosauria' ? 1 : 0.5);
        }

        function handleNodeClick(event: MouseEvent, d: d3.HierarchyNode<TreeNode>) {
            if (d.data.type === 'species') {
                console.log("Clicked on species:", d.data.name);
            }

            if (d.data.type === 'taxon') {
                console.log("Clicked on taxon:", d.data.name);
                toggleExpanded(event, d);
                updateVisualization();
            }
        }

        function toggleExpanded(event: MouseEvent, d: d3.HierarchyNode<TreeNode>) {
            d.data.expanded = !d.data.expanded;
            if (!d.data.expanded) {
                // Collapse all descendants
                d.descendants().forEach(node => {
                    if (node !== d) node.data.expanded = false;
                });
            }

            // Immediately update the visual properties of the clicked node
            d3.select(event.target as SVGCircleElement)
                .attr("stroke-width", d.data.expanded ? "var(--stroke-width-default)" : "var(--stroke-width-collapsed)")
                .attr("stroke-opacity", d.data.expanded ? "var(--stroke-opacity-default)" : "var(--stroke-opacity-collapsed)")
                .attr("fill", d.children ? (d.data.expanded ? "var(--node-expanded)" : "var(--node-default)") : "var(--node-leaf)");

            updateVisualization();
        }


        // update the visualization whenever a branch is expanded / collapsed
        function updateVisualization() {
            if (!data) return;
            const root = d3.hierarchy(data);
            const nodes = filterExpandedNodes(root);
            const links = root.links().filter(link => 
                nodes.includes(link.source) && nodes.includes(link.target)
            );

            const oldNodes = nodeSelection.data();
            const nodeMap = new Map(oldNodes.map(d => [d.data.id, d]));

            // Assign positions to new nodes
            nodes.forEach((node: any) => {
                const oldNode = nodeMap.get(node.data.id);
                if (oldNode) {
                    node.x = oldNode.x;
                    node.y = oldNode.y;
                } else if (node.parent) {
                    const parent = node.parent as any;
                    node.x = parent.x + (Math.random() - 0.5) * 50;
                    node.y = parent.y + (Math.random() - 0.5) * 50;
                } else {
                    node.x = width / 2;
                    node.y = height / 2;
                }
            });

            // Update nodes
            nodeSelection = nodeSelection.data(nodes, (d: any) => d.data.id)
                .join(
                    enter => enter.append("circle")
                        .attr("r", d => d.data.name === 'Dinosauria' ? BASE_NODE_RADIUS * 1.75 : BASE_NODE_RADIUS)
                        .attr("cx", d => (d as any).x)
                        .attr("cy", d => (d as any).y)
                        .call(drag as any)
                        .on("mouseover", handleMouseOver)
                        .on("mouseout", handleMouseOut)
                        .on("click", handleNodeClick),
                    update => update,
                    exit => exit.remove()
                )
                .attr("fill", (d: any) => {
                    if (d.children) {
                        return d.data.expanded ? "var(--node-expanded)" : "var(--node-default)";
                    }
                    return "var(--node-leaf)";
                })
                .attr("stroke-width", d => d.data.expanded ? "var(--stroke-width-default)" : "var(--stroke-width-collapsed)")
                .attr("stroke-opacity", d => d.data.expanded ? "var(--stroke-opacity-default)" : "var(--stroke-opacity-collapsed)");

            // Update links
            linkSelection = linkSelection.data(links, (d: any) => `${d.source.data.id}-${d.target.data.id}`)
                .join(
                    enter => enter.append("line")
                        .attr("stroke", "var(--link-color)")
                        .attr("stroke-opacity", 0.6),
                    update => update,
                    exit => exit.remove()
                );

            // Update labels
            labelSelection = labelSelection.data(nodes, (d: any) => d.data.id)
                .join(
                    enter => enter.append("text")
                        .attr("x", d => (d as any).x)
                        .attr("y", d => (d as any).y)
                        .text((d: any) => d.data.name)
                        .attr("font-size", d => d.data.name === 'Dinosauria' ? 16 : 10)
                        .attr("dy", "0.31em")
                        .attr("fill", "var(--text-color)")
                        .attr("fill-opacity", d => d.data.name === 'Dinosauria' ? 1 : 0.5),
                    update => update,
                    exit => exit.remove()
                );



            // Restart the simulation with custom forces
            simulation.nodes(nodes as d3.HierarchyNode<TreeNode>[]);
            simulation.force('link', d3.forceLink(links).id((d: any) => d.id).distance(linkDistance).strength(linkStrength))
                .force('charge', d3.forceManyBody().strength((d: any) => d.children ? chargeStrength * 1.5 : chargeStrength))
                .force('center', d3.forceCenter(width / 2, height / 2).strength(centerStrength))
                .force("x", d3.forceX().strength(xStrength))
                .force("y", d3.forceY().strength(yStrength))
                .force("collide", d3.forceCollide().radius(BASE_NODE_RADIUS*1.2).strength(1.2).iterations(2))
                .alphaDecay(0.05)
                .velocityDecay(0.6);

            // Run the simulation
            simulation.alpha(.05).restart();

            simulation.on("tick", () => {
                updatePositions();
            });
        }

        function filterExpandedNodes(root: d3.HierarchyNode<TreeNode>) {
            return root.descendants().filter(d => {
                if (d.parent) {
                    let ancestor: d3.HierarchyNode<TreeNode> | null = d.parent;
                    while (ancestor) {
                        if (!ancestor.data.expanded && ancestor !== d) {
                            return false;
                        }
                        ancestor = ancestor.parent;
                    }
                }
                return true;
            });
        }

        return simulation;
    }

    // Initialize the visualization when the component mounts

    onMount(async () => {
        if (browser) {
        const WebFont = await import('webfontloader');
        WebFont.load({
            google: {
            families: ['Raleway:400,700']
            },
            active: () => {
            fontLoaded = true;
            },
            inactive: () => {
            console.warn('Failed to load Raleway font');
            fontLoaded = true;
            }
        });
        } else {
        fontLoaded = true;
        }

        try {
        await fetchData(speciesTestList);
        if (!error && data) {
            simulation = createVisualization() || null;
        } else {
            console.error("Error or no data after fetching:", error);
        }
        } catch (e) {
        console.error("Error in onMount:", e);
        }
    });

</script>

{#if loading || !fontLoaded}
    <p>Loading...</p>
{:else if error}
    <p style="color: red;">{error}</p>
{:else}
    <svg bind:this={svg}></svg>
{/if}

<style>
    :global(:root) {
        /* Color variables */
        --node-default: #555;
        --node-leaf: #999;
        --node-highlight: #e0e0e0;
        --link-color: #999;
        --text-color: #e0e0e0;
        --text-color-highlight: #fff;

        /* Stroke variables */
        --stroke-color: #1a1a1a;
        --stroke-width-default: 1;
        --stroke-width-collapsed: 3;
        --stroke-opacity-default: 0.5;
        --stroke-opacity-collapsed: 0.3;

    }
    :global(text) {
        font-family: 'Raleway', sans-serif;
    }
</style>
