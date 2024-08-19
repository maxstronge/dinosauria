<!-- ControlPanel.svelte -->
<script lang="ts">
    import { createEventDispatcher } from 'svelte';
  
    const dispatch = createEventDispatcher();
  
    let searchTerm = '';
    let selectedClade = '';
  
    function handleSearch() {
      dispatch('search', searchTerm);
    }
  
    function handleFilter() {
      dispatch('filter', selectedClade);
    }
  </script>
  
  <div class="control-panel">
    <section>
      <h3>Search</h3>
      <div class="input-group">
        <input bind:value={searchTerm} placeholder="Search species...">
        <button on:click={handleSearch}>Search</button>
      </div>
    </section>
  
    <section>
      <h3>Filter</h3>
      <div class="input-group">
        <select bind:value={selectedClade}>
          <option value="">Select clade...</option>
          <!-- Add clade options here -->
        </select>
        <button on:click={handleFilter}>Apply Filter</button>
      </div>
    </section>
  
    <!-- Add more sections for other controls -->
  </div>
  
  <style>
    .control-panel {
      background-color: #47484e;
      padding: 1rem;
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  
    section {
      background-color: #33353a;
      padding: 1rem;
      border-radius: 4px;
    }
  
    h3 {
      color: #fff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin-top: 0;
    }
  
    .input-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
  
    input, select, button {
      width: 100%;
      padding: 0.5rem;
      box-sizing: border-box;
    }
  
    button {
      background-color: #4CAF50;
      color: white;
      border: none;
      cursor: pointer;
      transition: background-color 0.3s;
    }
  
    button:hover {
      background-color: #45a049;
    }
  
    @media (max-width: 768px) {
      .control-panel {
        height: auto;
      }
    }



  </style>