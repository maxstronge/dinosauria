<script lang="ts">
	import { onMount } from 'svelte';
	import { fetchDinosaurData, fetchTaxonData } from '$lib/services/api';
	import type { Dinosaur, Taxon } from '$lib/types';
  
	let dinosaurs: Dinosaur[] = [];
	let taxa: Taxon[] = [];
	let loading = true;
	let error = '';
	let dinosaurError = '';
	let taxonError = '';
  
	onMount(async () => {
	  try {
		const dinosaurPromise = fetchDinosaurData().catch(e => {
		  dinosaurError = `Error fetching dinosaurs: ${e.message}`;
		  return [];
		});
		const taxonPromise = fetchTaxonData().catch(e => {
		  taxonError = `Error fetching taxa: ${e.message}`;
		  return [];
		});
		
		[dinosaurs, taxa] = await Promise.all([dinosaurPromise, taxonPromise]);
	  } catch (e) {
		error = 'Failed to fetch data';
		console.error(e);
	  } finally {
		loading = false;
	  }
	});
  </script>
  
  <h1>API Test</h1>
  
  {#if loading}
	<p>Loading...</p>
  {:else if error}
	<p style="color: red;">{error}</p>
  {:else}
	<h2>Dinosaurs</h2>
	{#if dinosaurError}
	  <p style="color: red;">{dinosaurError}</p>
	{:else if dinosaurs.length > 0}
	  <ul>
		{#each dinosaurs as dinosaur}
		  <li>
			{dinosaur.name} - {dinosaur.taxon.name}
			<br>
			Lineage: {dinosaur.lineage.join(' > ')}
		  </li>
		{/each}
	  </ul>
	{:else}
	  <p>No dinosaurs found.</p>
	{/if}
  
	<h2>Taxa</h2>
	{#if taxonError}
	  <p style="color: red;">{taxonError}</p>
	{:else if taxa.length > 0}
	  <ul>
		{#each taxa as taxon}
		  <li>{taxon.name} (Rank: {taxon.rank})</li>
		{/each}
	  </ul>
	{:else}
	  <p>No taxa found.</p>
	{/if}
  {/if}