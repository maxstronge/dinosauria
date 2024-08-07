<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import { fetchDinosaurAndTaxaData } from '../services/api';
    import type { Dinosaur, Taxon, TreeNode } from '../types';
    import { buildTaxonomyTree } from '../services/treeBuilder';

    // Reference to the SVG element
    let svg: SVGElement;

    let data: TreeNode;
    let loading = true;
    let error = "";

    let selectedNode: d3.HierarchyNode<TreeNode> | null = null;

    const speciesTestList = [
                'Tyrannosaurus rex',
                'Spinosaurus aegyptiacus',
                'Triceratops horridus',
                'Parasaurolophus walkeri',
                'Stegosaurus stenops',
                'Velociraptor mongoliensis',
                'Argentinosaurus huinculensis',
                'Ankylosaurus magniventris',
                'Brachiosaurus altithorax',
                'Diplodocus carnegii',
                'Giganotosaurus carolinii',
                'Carcharodontosaurus saharicus',
                'Allosaurus fragilis',
                'Carnotaurus sastrei',
                'Deinonychus antirrhopus',
                'Carnotaurus sastrei',
                'Edmontosaurus annectens',
                'Pachycephalosaurus wyomingensis',
                'Deltadromeus agilis',
                'Meraxes gigas',

            
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


        
    // function to determine number of descendants
    function countDescendants(node: d3.HierarchyNode<TreeNode>): number {
        let count = 0;
        if (node.children) {
            node.children.forEach(child => {
                count += countDescendants(child);
            });
        }
        return count + 1; // Add 1 to include the node itself
    }
        
    // Function to create the visualization
    function createVisualization() {
    if (!data) {
        console.error("No data available for visualization");
        return;
    }
    
    const width = 2500;
    const height = 1800;
    const radius = Math.min(width, height) / 2 - 200;

    const svg = d3.select('svg')
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("style", "width: 100%; height: auto; font: 12px sans-serif;");

    svg.selectAll("*").remove(); // Clear existing content

    const g = svg.append("g");

    const tree = d3.tree<TreeNode>()
        .size([2 * Math.PI, radius])
        .separation((a, b) => (a.parent == b.parent ? 1 : 2) / a.depth);

    const root = tree(d3.hierarchy(data)
        .sort((a, b) => d3.ascending(a.data.name, b.data.name)));

    tree(root);

    // Set initial selected node to root (Dinosauria)
    selectedNode = root;

    // Function to center view on a node
    function centerNode(node: d3.HierarchyNode<TreeNode>) {
        const t = d3.zoomTransform(svg.node() as any);
        const x = node ? -(node.y ?? 0) * Math.cos((node.x || 0) - Math.PI / 2) * t.k : 0;
        const y = node ? -(node.y ?? 0) * Math.sin((node.x || 0) - Math.PI / 2) * t.k : 0;
        g.transition().duration(750).attr("transform", `translate(${x},${y}) scale(${t.k})`);
    }

    // Center on root initially
    centerNode(root);

    // Calculate descendant counts
    const descendants = root.descendants();
    const descendantCounts = descendants.map(d => countDescendants(d));
    const minDescendants = d3.min(descendantCounts) || 1;
    const maxDescendants = d3.max(descendantCounts) || 1;

    // Create scales with logarithmic domain
    const nodeDistanceScale = d3.scaleLinear()
        .domain([minDescendants, maxDescendants])
        .range([3, 6])
        .clamp(true);

    const nodeSizeScale = d3.scaleLog()
        .domain([minDescendants, maxDescendants])
        .range([3, 30])
        .clamp(true);

    const fontSizeScale = d3.scaleLinear()
        .domain([minDescendants, maxDescendants])
        .range([18, 30])
        .clamp(true);

    // Adjust y-coordinates based on number of descendants
    root.descendants().forEach(d => {
        const descendantCount = countDescendants(d);
        d.y = d.depth === 0 ? 0 : d.y * nodeDistanceScale(descendantCount);
    });

    const link = g.append("g")
        .attr("fill", "none")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5)
        .selectAll("line")
        .data(root.links())
        .join("line")
        .attr("x1", d => Math.cos(d.source.x - Math.PI / 2) * d.source.y)
        .attr("y1", d => Math.sin(d.source.x - Math.PI / 2) * d.source.y)
        .attr("x2", d => Math.cos(d.target.x - Math.PI / 2) * d.target.y)
        .attr("y2", d => Math.sin(d.target.x - Math.PI / 2) * d.target.y);
        
    const node = g.append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 3)
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", d => `translate(${d.y * Math.cos(d.x - Math.PI / 2)},${d.y * Math.sin(d.x - Math.PI / 2)})`);
    
    node.append("circle")
        .attr("fill", d => d === selectedNode ? "#ffdc7a" : (d.children ? "#555" : "#999"))
        .attr("r", d => nodeSizeScale(countDescendants(d)));

    const labels = g.append("g")
        .selectAll("text")
        .data(root.descendants())
        .join("text")
        .style("fill", "#ffffff")
        .style("stroke", "000")
        .style("stroke-width", "0.5px") 
        .attr("dy", "0.31em")
        .text(d => d.data.name)
        .attr("font-size", d => `${fontSizeScale(countDescendants(d))}px`);

    labels.attr("transform", (d) => {
        const isRoot = d.depth === 0;
        const angle = d.x - Math.PI / 2;
        const radius = d.y;
        const nodeSize = nodeSizeScale(countDescendants(d));
        const labelPadding = nodeSize * 1.2;
        let x = (radius + labelPadding) * Math.cos(angle);
        let y = (radius + labelPadding) * Math.sin(angle);

        if (isRoot) {
            return `translate(0,0)`;
        }

        return `translate(${x},${y})`;
    })
    .attr("text-anchor", d => {
        const angle = d.x - Math.PI / 2;
        return Math.cos(angle) > 0 ? "start" : "end";
    });

    // Mouse hover and click interactions:
    node.on("mouseover", function (event, d) {
        d3.select(this).select("circle")
            .transition()
            .duration(50)
            .attr("r", nodeSizeScale(countDescendants(d)) * 1.5)
            .attr("fill", d === selectedNode ? "#ffdc7a" : "#aaa");

        const label = labels.filter(label => label === d);
        label.transition()
            .duration(50)
            .attr("font-size", `${fontSizeScale(countDescendants(d)) * 1.5}px`);
    })
    .on("mouseout", function(event, d) {
        d3.select(this).select("circle")
            .transition()
            .duration(50)
            .attr("r", nodeSizeScale(countDescendants(d)))
            .attr("fill", d === selectedNode ? "#ffdc7a" : (d.children ? "#555" : "#999"));

        const label = labels.filter(label => label === d);
        label.transition()
            .duration(50)
            .attr("font-size", `${fontSizeScale(countDescendants(d))}px`);
    })
    .on("click", function(event, d) {
        // Update selected node
        selectedNode = d;

        // Update all node colors
        node.select("circle")
            .attr("fill", n => n === selectedNode ? "#ffdc7a" : (n.children ? "#555" : "#999"));

        // Center view on selected node
        centerNode(d);
    });

    const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 10])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom as any);
}

    onMount(async () => {
        try {
            await fetchData(speciesTestList);
            if (!error && data) {
                createVisualization();
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


<style>
    svg {
        width: 100%;
        height: 600px;
        border: 1px solid #ccc;
        background: #11151d;
    }
</style>