<script lang="ts">
	import DinosaurInfo from './lib/components/DinosaurInfo.svelte';
	import type { Dinosaur } from './types'; 
    import ForceDirectedTree from './lib/components/ForceDirectedTree.svelte';
	let selectedDinosaur: Dinosaur | null = null;
  </script>
  
  <main style="padding: 20px;">
	<center>
	  <h1>Dinosauria</h1>
	</center>
	
	<ForceDirectedTree />
  
	<DinosaurInfo dinosaur={selectedDinosaur} />
  </main>
  
  <style>
	main {
	  text-align: center;
	  padding: 1em;
	  max-width: 240px;
	  margin: 0 auto;
	}
	h1 {
	  color: #ffffff;
	  text-transform: uppercase;
	  font-size: 4em;
	  font-weight: 100;
	}
	:global(body) {
        background-color: rgb(40, 41, 48);
    }
	@media (min-width: 640px) {
	  main {
		max-width: none;
	  }
	}
  </style>