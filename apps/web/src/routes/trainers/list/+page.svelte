<script lang="ts">
    let { data } = $props();
</script>

<ul>
    {#each data.trainers as trainer}
<a href={"/trainers/trainerdetails/" + trainer.slug}>{trainer.name}</a>
    {/each}
</ul>