<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import { fetchDinosaurAndTaxaData } from '../services/api';
    import type { TreeNode } from '../types';
    import { buildTaxonomyTree } from '../services/treeBuilder';
    import { createFisheye, type FisheyeFunction, type FisheyePoint } from  '../services/fisheye';
    import { drag } from 'd3-drag';

    // State variables
    let data: TreeNode;
    let loading = true;
    let error = "";
    let svg: SVGSVGElement;  
    let simulation: d3.Simulation<d3.HierarchyNode<TreeNode>, undefined> | null = null;
    const BASE_NODE_RADIUS = 10;
    const LABEL_OFFSET_X = 15;
    const LABEL_OFFSET_Y = 5;

    // Force simulation parameters
    const linkDistance = 1;
    const linkStrength = 2;
    const chargeStrength = -800;
    const centerStrength = 0.9;
    const xStrength = 0.2;
    const yStrength = 0.3;

    let fisheye: FisheyeFunction;
    let zoomTransform: d3.ZoomTransform = d3.zoomIdentity;
    let animationFrameID: number | null = null;
    let dragAnimationFrameId: number | null = null;

    // List of species to fetch and display
    const speciesTestList = [
        'Tyrannosaurus rex', 'Spinosaurus aegyptiacus', 'Triceratops horridus',
        'Parasaurolophus walkeri', 'Stegosaurus stenops', 'Velociraptor mongoliensis', 'Brachiosaurus altithorax', 'Carcharodontosaurus saharicus', 'Argentinosaurus huinculensis', 'Giganotosaurus carolinii', 'Pachycephalosaurus wyomingensis', 'Deinonychus antirrhopus', 'Ankylosaurus magniventris'
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

        // Set up dimensions and root position
        const width = 1200;
        const height = 500;
        const rootX = width / 2;
        const rootY = height / 2;

        // Compute the graph
        const root = d3.hierarchy(data);
        console.log("Hierarchy created:", root);
        const links = root.links();
        const nodes = root.descendants();

        // Create SVG element
        const svgElement = d3.select("svg")
            .attr("width", '90%')
            .attr("height", height)
            .attr("viewBox", [0,0, width, height])
            .attr("style", "max-width: 85%; height: 75%;");

        // Create a group for zoom functionality
        const g = svgElement.append("g");        

        // Add zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 10])
            .on("zoom", (event) => {
                zoomTransform = event.transform;
                g.attr("transform", zoomTransform.toString());
                updateFisheye(d3.pointer(event, svgElement.node()));

            });

        svgElement.call(zoom as any);        

        // Setup fisheye distortion
        fisheye = createFisheye() as FisheyeFunction;
            fisheye.radius(75)
            fisheye.distortion(1.5);

        // Add links (edges between nodes)
        const link = g.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .join("line");

        // Add nodes
        const node = g.append("g")
            .attr("fill", "#fff")
            .attr("stroke", "#000")
            .attr("stroke-width", 1.5)
            .selectAll("circle")
            .data(nodes)
            .join("circle")
            .attr("fill", (d: any) => d.children ? "#555" : "#999") // Different color for leaf nodes
            .attr("r", BASE_NODE_RADIUS);

        // Add text labels for nodes
        const label = g.append("g")
            .attr("font-family", "sans-serif")
            .selectAll("text")
            .data(nodes)
            .join("text")
            .text((d: any) => d.data.name)
            .attr("font-size", d => (d as any).data.name === 'Dinosauria' ? 16 : 10)
            .attr("dy", "0.31em")
            .attr("fill", "#fff")
            .attr("fill-opacity", d => d.data.name === 'Dinosauria' ? 1 : 0.5);

        // Set up force simulation
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id((d: any) => d.id).distance(linkDistance).strength(linkStrength))
            .force('charge', d3.forceManyBody().strength(chargeStrength))
            .force('center', d3.forceCenter(width / 2, height / 2).strength(centerStrength))
            .force("x", d3.forceX().strength(xStrength))
            .force("y", d3.forceY().strength(yStrength))
            .force("collide", d3.forceCollide().radius(BASE_NODE_RADIUS ).strength(1.2).iterations(2))


        // Update fisheye based on current zoom and mouse position
        function updateFisheye(mouse: [number, number]) {
            const invertedMouse = zoomTransform.invert(mouse);
            fisheye.focus(invertedMouse);
            fisheye.radius(75 / zoomTransform.k);

            if (animationFrameID) { 
                cancelAnimationFrame(animationFrameID);
            }
            animationFrameID = requestAnimationFrame(applyFisheye);
            }

        // Update positions on each tick of the simulation
        function updatePositions() {
            link
                .attr("x1", (d: any) => d.source.fisheye?.x ?? d.source.x)
                .attr("y1", (d: any) => d.source.fisheye?.y ?? d.source.y)
                .attr("x2", (d: any) => d.target.fisheye?.x ?? d.target.x)
                .attr("y2", (d: any) => d.target.fisheye?.y ?? d.target.y);

            node
                .attr("cx", (d: any) => d.fisheye?.x ?? d.x)
                .attr("cy", (d: any) => d.fisheye?.y ?? d.y)
                .attr("r", (d: any) => BASE_NODE_RADIUS * (d.fisheye?.z ?? 1) / zoomTransform.k);

            label
                .attr("x", (d: any) => {
                    const x = d.fisheye?.x ?? d.x;
                    return x + (x > rootX ? LABEL_OFFSET_X : -LABEL_OFFSET_X);
                })
                .attr("y", (d: any) => {
                    const y = d.fisheye?.y ?? d.y;
                    return y + (y > rootY ? LABEL_OFFSET_Y : -LABEL_OFFSET_Y);
                })
                .attr("text-anchor", (d: any) => ((d.fisheye?.x ?? d.x) > rootX ? "start" : "end"))
                .attr("dominant-baseline", (d: any) => ((d.fisheye?.y ?? d.y) > rootY ? "hanging" : "text-top"))
                .attr("font-size", (d: any) => {
                    const baseFontSize = d.data.name === 'Dinosauria' ? 16 : 10;
                    const scaleFactor = d.fisheye?.z ?? 1;
                    return `${baseFontSize * scaleFactor / zoomTransform.k}px`;
                });
        }

        // Apply fisheye distortion
        function applyFisheye() {
            animationFrameID = null;
            node.each((d: any) => {
                const distorted = fisheye({ x: d.fx || d.x, y: d.fy || d.y }) as FisheyePoint;
                d.fisheye = distorted;
            });
            updatePositions();
        }

        // Add mousemove
        svgElement.on("mousemove", (event: MouseEvent) => {
            updateFisheye(d3.pointer(event, svgElement.node()));
        });

        simulation.on("tick",updatePositions)

        // Add drag behavior
        const dragBehavior = drag<SVGCircleElement, any>()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended);

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
        node.call(dragBehavior as any);

        return simulation;
    }

    // Initialize the visualization when the component mounts
    onMount(async () => {
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

{#if loading}
    <p>Loading...</p>
{:else if error}
    <p style="color: red;">{error}</p>
{:else}
    <svg bind:this={svg}></svg>
{/if}