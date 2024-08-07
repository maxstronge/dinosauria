<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import { fetchDinosaurAndTaxaData } from '../services/api';
    import type { TreeNode } from '../types';
    import { buildTaxonomyTree } from '../services/treeBuilder';
    import { createFisheye, type FisheyeFunction, type FisheyePoint } from  '../services/fisheye';

    // State variables
    let data: TreeNode;
    let loading = true;
    let error = "";
    let svg: SVGSVGElement;  
    let simulation: d3.Simulation<d3.HierarchyNode<TreeNode>, undefined> | null = null;

    // Force simulation parameters
    const linkDistance = 1;
    const linkStrength = 2;
    const chargeStrength = -800;
    const centerStrength = 0.9;
    const xStrength = 0.2;
    const yStrength = 0.3;

    let fisheye: FisheyeFunction;
    let zoomTransform: d3.ZoomTransform = d3.zoomIdentity;

    // List of species to fetch and display
    const speciesTestList = [
        'Tyrannosaurus rex', 'Spinosaurus aegyptiacus', 'Triceratops horridus',
        'Parasaurolophus walkeri', 'Stegosaurus stenops', 'Velociraptor mongoliensis', 'Brachiosaurus altithorax', 'Carcharodontosaurus saharicus', 'Therizinosaurus cheloniformis '
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
        const height = 800;
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
            fisheye.distortion(2.5);

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
            .attr("r", 10);

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
            .force("collide", d3.forceCollide().radius(8).strength(1).iterations(3));

        // Update fisheye based on current zoom and mouse position
        function updateFisheye(mouse: [number, number]) {
            const invertedMouse = zoomTransform.invert(mouse);
            fisheye.focus(invertedMouse);
            applyFisheye();
            }

        // Update positions on each tick of the simulation
        function updatePositions() {
            // Update link positions
            link
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);

            // Update node positions
            node
                .attr("cx", (d: any) => d.x)
                .attr("cy", (d: any) => d.y);

            // Update label positions
            label
                .attr("x", (d: any) => {
                    const dx = d.x - rootX;
                    const offset = 10;
                    return dx > 0 ? d.x + offset : d.x - offset;
                })
                .attr("y", (d: any) => {
                    const dy = d.y - rootY;
                    const offset = 5;
                    return dy > 0 ? d.y + offset : d.y - offset;
                })
                .attr("text-anchor", (d: any) => {
                    const dx = d.x - rootX;
                    return d.data.name === 'Dinosauria' ? "middle" : (dx > 0 ? "start" : "end");
                })
                .attr("dominant-baseline", (d: any) => {
                    const dy = d.y - rootY;
                    return dy > 0 ? "hanging" : "text-top";
                });
        }

        // Apply fisheye distortion
        function applyFisheye() {
            node.each((d: any) => {
                const distorted = fisheye({ x: d.x, y: d.y }) as FisheyePoint;
                d.fisheye = zoomTransform.apply([distorted.x, distorted.y]);
                d.fisheye.z = distorted.z;
            })
                .attr("cx", (d: any) => d.fisheye[0])
                .attr("cy", (d: any) => d.fisheye[1])
                .attr("r", (d: any) => d.fisheye.z * 4.10 / zoomTransform.k);

            link
                .attr("x1", (d: any) => d.source.fisheye[0])
                .attr("y1", (d: any) => d.source.fisheye[1])
                .attr("x2", (d: any) => d.target.fisheye[0])
                .attr("y2", (d: any) => d.target.fisheye[1]);

            label
                .attr("x", (d: any) => d.fisheye[0])
                .attr("y", (d: any) => d.fisheye[1])
            }

        // Add mousemove
        svgElement.on("mousemove", (event: MouseEvent) => {
            updateFisheye(d3.pointer(event, svgElement.node()));
        });



        simulation.on("tick",updatePositions)

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