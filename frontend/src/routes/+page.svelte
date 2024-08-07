<script lang="ts">
  import DinosauriaTree from '$lib/components/DinosauriaTree.svelte';
	import DinosaurInfo from '$lib/components/DinosaurInfo.svelte';
	import type { Dinosaur } from '$lib/types';
	let selectedDinosaur: Dinosaur | null = null;
</script>
  
  <main style="padding: 5px;">
	<center>
	  <h1>Dinosauria</h1>
	</center>
	<DinosauriaTree/>
	<DinosaurInfo dinosaur={selectedDinosaur} />
  </main>
  
  <style>
    main {
      text-align: center;
      padding: 3em;
      max-width: 240px;
      margin: 0 auto;
    }
    h1 {
      color: #ffffff;
      text-transform: uppercase;
      font-size: 4em;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-weight: 100;
    }
    :global(body) {
        background-color: rgb(28, 29, 34);
    }
    :global(*) {
        color: #ffffff; /* Change text color to white */
    }
    @media (min-width: 640px) {
      main {
        max-width: none;
      }
    }
</style>