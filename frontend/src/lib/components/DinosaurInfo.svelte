<script lang="ts">
  import type { Dinosaur } from '../types';
  export let dinosaur: Dinosaur | null = null;
</script>

{#if dinosaur}
  <div class="dinosaur-info">
    <h2>{dinosaur.name}</h2>
    <p>Taxon: {dinosaur.taxon.name}</p>
    <p>Time Range: {dinosaur.timeRange}</p>
    <!-- Add more dinosaur information as needed -->
  </div>
{:else}
  <p>Select a dinosaur to see more information.</p>
{/if}

<style>
  .dinosaur-info {
    padding: 1em;
    border: 1px solid #ccc;
    border-radius: 5px;
  }
  p {
    margin: 0.5em 0;
    color: #f1f1f1a4;
  }
</style>