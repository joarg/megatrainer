<script lang="ts">
    const API_URL = 'http://localhost:3000';
    let { data } = $props();
</script>

<ul>
    {#each data.trainers as trainer}
        <li>
            {#if trainer.portraitUrl}
                <img src={API_URL + trainer.portraitUrl} alt={trainer.name} width="64" height="64" style="object-fit: cover; border-radius: 50%;" />
            {/if}
            <a href={"/trainers/trainerdetails/" + trainer.slug}>{trainer.name}</a>
            <a href={"/trainers/trainerdetails/" + trainer.slug + "/edit"}>Edit</a>
        </li>
    {/each}
</ul>
